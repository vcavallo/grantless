import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { useZapGoal } from '@/hooks/useZapGoal';
import { getActiveRelays } from '@/lib/relays';
import {
  buildZapGoalTemplate,
  buildTaskProposalTemplate,
  taskProposalToInput,
  formatSats,
  type TaskProposal,
} from '@/lib/catallax';
import { ContributeDialog } from './ContributeDialog';
import { ContributorList } from './ContributorList';
import { Button } from '@/components/ui/button';
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
  const { data: zapData } = useZapGoal(task.goalId);
  // Held between publishing the goal and the relays echoing back the task's goalId,
  // so the UI shows "Opening for funding…" instead of the stale "Open for funding".
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (opening && task.goalId) setOpening(false);
  }, [opening, task.goalId]);

  if (task.fundingType !== 'crowdfunding') return null;

  const isPatron = user?.pubkey === task.patronPubkey;
  const progress = zapData?.progress;

  const fail = (title: string, error: unknown) => {
    setOpening(false);
    toast({
      title,
      description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
      variant: 'destructive',
    });
  };

  const openForFunding = async () => {
    if (!task.arbiterPubkey) return;
    setOpening(true);
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

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Crowdfunding</p>
          {progress?.isGoalMet && <Badge className="bg-green-600">Goal reached</Badge>}
        </div>

        {!task.goalId ? (
          opening ? (
            <p className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opening for funding… (waiting for the relays to confirm)
            </p>
          ) : isPatron && task.arbiterPubkey && task.status === 'proposed' ? (
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
              </p>
            </div>

            {progress && progress.contributors.length > 0 && (
              <ContributorList contributors={progress.contributors} />
            )}

            {user && task.status !== 'concluded' && <ContributeDialog task={task} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
