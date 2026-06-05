import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useTaskConclusions } from '@/hooks/useCatallax';
import { parsePubkey } from '@/lib/grantless';
import {
  markTaskStatus,
  assignWorker,
  buildTaskConclusionTemplate,
  buildMockZapReceiptTemplate,
  type TaskProposal,
  type ResolutionType,
} from '@/lib/catallax';
import { AssignArbiterControl } from './AssignArbiterControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RESOLUTIONS: ResolutionType[] = ['successful', 'rejected', 'cancelled', 'abandoned'];

interface TaskLifecycleActionsProps {
  task: TaskProposal;
  /** Curator whose grantless-arbiter list supplies the arbiter options. */
  curatorPubkey?: string;
  onUpdate?: () => void;
}

/**
 * The single, role + status gated action surface for a task: it shows exactly the
 * action(s) the logged-in user may take at the task's current status, and performs
 * them by re-publishing the (acting-role-signed) 33401 / publishing a 3402. Permission
 * comes only from the Catallax authorized-updater rule (the user holds that role on the
 * task) — no client allowlist. Payouts/refunds are mocked.
 */
export function TaskLifecycleActions({ task, curatorPubkey, onUpdate }: TaskLifecycleActionsProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const { data: conclusions = [] } = useTaskConclusions();
  const [workerInput, setWorkerInput] = useState('');
  const [resolution, setResolution] = useState<ResolutionType>('successful');
  // A status-changing action was published but the relays haven't echoed the new
  // version back yet. Hold this transitional state (the status at click time) so the
  // UI shows "Applying…" instead of the stale buttons, until the prop catches up.
  const [applyingFrom, setApplyingFrom] = useState<string | null>(null);
  useEffect(() => {
    if (applyingFrom !== null && task.status !== applyingFrom) setApplyingFrom(null);
  }, [task.status, applyingFrom]);

  if (!user) {
    return <p className="text-sm text-muted-foreground">Log in as this task's patron, arbiter, or worker to manage it.</p>;
  }

  const isPatron = user.pubkey === task.patronPubkey;
  const isArbiter = !!task.arbiterPubkey && user.pubkey === task.arbiterPubkey;
  const isWorker = !!task.workerPubkey && user.pubkey === task.workerPubkey;
  const taskCoord = `33401:${task.patronPubkey}:${task.d}`;

  const ok = (title: string) => {
    toast({ title });
    onUpdate?.();
  };
  const fail = (title: string, error: unknown) => {
    setApplyingFrom(null);
    toast({
      title,
      description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
      variant: 'destructive',
    });
  };

  const markFunded = async () => {
    setApplyingFrom(task.status);
    try {
      await publishEvent(markTaskStatus(task, 'funded'));
      ok('Task marked funded');
    } catch (e) {
      fail("Couldn't mark funded", e);
    }
  };

  const doAssignWorker = async () => {
    const target = workerInput.trim() ? parsePubkey(workerInput) : user.pubkey;
    if (!target) {
      toast({ title: 'Invalid worker', description: 'Enter an npub or hex pubkey, or leave blank to assign yourself.', variant: 'destructive' });
      return;
    }
    setApplyingFrom(task.status);
    try {
      await publishEvent(assignWorker(task, target));
      ok(target === user.pubkey ? 'You are now the worker' : 'Worker assigned');
    } catch (e) {
      fail("Couldn't assign the worker", e);
    }
  };

  const markSubmitted = async () => {
    setApplyingFrom(task.status);
    try {
      await publishEvent(markTaskStatus(task, 'submitted'));
      ok('Work submitted');
    } catch (e) {
      fail("Couldn't mark submitted", e);
    }
  };

  const conclude = async () => {
    const recipient = resolution === 'successful' ? task.workerPubkey ?? task.patronPubkey : task.patronPubkey;
    setApplyingFrom(task.status);
    try {
      const receipt = await publishEvent(
        buildMockZapReceiptTemplate({
          senderPubkey: user.pubkey,
          recipient,
          amountSats: parseInt(task.amount, 10) || 0,
          referencedId: task.id, // 9735 `e` must be a 32-byte hex event id, not the a-coord
        }),
      );
      await publishEvent(
        buildTaskConclusionTemplate({
          taskCoord,
          taskId: task.id,
          payoutReceiptId: receipt.id,
          patron: task.patronPubkey,
          arbiter: task.arbiterPubkey!,
          worker: task.workerPubkey,
          resolution,
        }),
      );
      await publishEvent(markTaskStatus(task, 'concluded'));
      ok(`Task concluded (${resolution})`);
    } catch (e) {
      fail("Couldn't conclude the task", e);
    }
  };

  // Build the role-appropriate action for the current status.
  const actions: React.ReactNode[] = [];

  if (task.status === 'proposed') {
    if (isPatron) {
      actions.push(<AssignArbiterControl key="arbiter" task={task} curatorPubkey={curatorPubkey} />);
    }
    if (isPatron || isArbiter) {
      actions.push(
        task.arbiterPubkey ? (
          <div key="fund" className="space-y-1">
            <Button size="sm" disabled={isPending} onClick={markFunded}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark funded
            </Button>
            <p className="text-xs text-muted-foreground">
              Contributions settle in Lightning to the arbiter as escrow. The funding bar is a{' '}
              <strong>rough, best-effort estimate</strong> from public zap receipts — it can lag or
              undercount. As patron/arbiter, <strong>you're responsible</strong> for tracking the real
              sats received and marking the task funded accordingly; the bar is for display only.
            </p>
          </div>
        ) : (
          <p key="fund-hint" className="text-xs text-muted-foreground">Assign an arbiter before marking the task funded.</p>
        ),
      );
    }
  } else if (task.status === 'funded') {
    if (isPatron) {
      actions.push(
        <div key="assign" className="flex items-center gap-2">
          <Input
            value={workerInput}
            onChange={(e) => setWorkerInput(e.target.value)}
            placeholder="worker npub/hex (blank = yourself)"
            className="h-8 max-w-[18rem] font-mono text-xs"
            aria-label="Worker pubkey"
          />
          <Button size="sm" disabled={isPending} onClick={doAssignWorker} className="shrink-0">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </div>,
      );
    }
  } else if (task.status === 'in_progress') {
    if (isWorker) {
      actions.push(
        <Button key="submit" size="sm" disabled={isPending} onClick={markSubmitted}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mark submitted
        </Button>,
      );
    }
  } else if (task.status === 'submitted') {
    if (isArbiter) {
      actions.push(
        <div key="conclude" className="flex items-center gap-2">
          <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionType)}>
            <SelectTrigger className="h-8 w-[10rem] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={isPending} onClick={conclude} className="shrink-0">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Conclude
          </Button>
        </div>,
      );
    }
  }

  const conclusion = conclusions.find((c) => c.taskReference === taskCoord || c.taskProposalId === task.id);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="font-medium">Task actions</p>
        {applyingFrom !== null ? (
          <p className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Applying your change… (waiting for the relays to confirm)
          </p>
        ) : task.status === 'concluded' ? (
          <p className="text-sm text-muted-foreground">
            This task has concluded{conclusion ? ` — ${conclusion.resolution}` : ''}.
          </p>
        ) : actions.length > 0 ? (
          <div className="space-y-3">{actions}</div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No actions are available to you at this stage{isPatron || isArbiter || isWorker ? '' : ' (you hold no role on this task)'}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
