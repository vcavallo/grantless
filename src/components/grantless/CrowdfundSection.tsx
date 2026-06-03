import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { useZapGoal } from '@/hooks/useZapGoal';
import { getActiveRelays } from '@/lib/relays';
import {
  buildZapGoalTemplate,
  buildMockZapReceiptTemplate,
  buildTaskProposalTemplate,
  taskProposalToInput,
  formatSats,
  type TaskProposal,
} from '@/lib/catallax';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CrowdfundSectionProps {
  task: TaskProposal;
  onUpdate?: () => void;
}

/**
 * The crowdfund surface for a task: open a NIP-75 zap goal (patron), contribute
 * toward it (anyone, mocked), and show funding progress. Escrow is directed to the
 * task's chosen arbiter; progress is computed from public zap receipts. Only for
 * crowdfunding tasks.
 */
export function CrowdfundSection({ task, onUpdate }: CrowdfundSectionProps) {
  const { user } = useCurrentUser();
  const { config, presetRelays } = useAppContext();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: zapData } = useZapGoal(task.goalId);
  const [amount, setAmount] = useState('');

  if (task.fundingType !== 'crowdfunding') return null;

  const isPatron = user?.pubkey === task.patronPubkey;
  const progress = zapData?.progress;

  const fail = (title: string, error: unknown) =>
    toast({
      title,
      description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
      variant: 'destructive',
    });

  const openForFunding = async () => {
    if (!task.arbiterPubkey) return;
    const relays = getActiveRelays(config, presetRelays);
    try {
      const goal = await publishEvent(
        buildZapGoalTemplate(
          { title: task.content.title, description: task.content.description, amount: task.amount, d: task.d },
          task.patronPubkey,
          task.arbiterPubkey,
          relays,
        ),
      );
      await publishEvent(buildTaskProposalTemplate({ ...taskProposalToInput(task), goalId: goal.id }));
      toast({ title: 'Open for funding', description: 'Your crowdfund goal is live.' });
      onUpdate?.();
    } catch (e) {
      fail("Couldn't open for funding", e);
    }
  };

  const contribute = async () => {
    const sats = parseInt(amount, 10);
    if (!sats || sats <= 0 || !task.goalId || !task.arbiterPubkey || !user) {
      toast({ title: 'Enter a positive amount of sats', variant: 'destructive' });
      return;
    }
    try {
      await publishEvent(
        buildMockZapReceiptTemplate({
          senderPubkey: user.pubkey,
          recipient: task.arbiterPubkey,
          amountSats: sats,
          referencedId: task.goalId,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['zap-goal', task.goalId] });
      toast({ title: 'Contribution sent', description: `You contributed ${formatSats(String(sats))}.` });
      setAmount('');
    } catch (e) {
      fail("Couldn't contribute", e);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Crowdfunding</p>
          {progress?.isGoalMet && <Badge className="bg-green-600">Goal reached</Badge>}
        </div>

        {!task.goalId ? (
          isPatron && task.arbiterPubkey && task.status === 'proposed' ? (
            <Button size="sm" disabled={isPending} onClick={openForFunding}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open for funding
            </Button>
          ) : isPatron && !task.arbiterPubkey ? (
            <p className="text-sm text-muted-foreground">Assign an arbiter before opening this project for funding.</p>
          ) : (
            <p className="text-sm text-muted-foreground">This project isn't open for funding yet.</p>
          )
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Progress value={progress?.percentComplete ?? 0} />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{formatSats(String(progress?.raisedSats ?? 0))}</span>
                {' raised of '}
                {formatSats(String(progress?.targetSats ?? 0))}
                {' · '}
                {progress?.contributors.length ?? 0} contributor{(progress?.contributors.length ?? 0) === 1 ? '' : 's'}
              </p>
            </div>

            {user && task.status !== 'concluded' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="amount in sats"
                  className="h-8 max-w-[12rem]"
                  aria-label="Contribution amount in sats"
                />
                <Button size="sm" variant="secondary" className="h-8 shrink-0" disabled={isPending} onClick={contribute}>
                  {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Contribute
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
