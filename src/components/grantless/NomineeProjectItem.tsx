import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { shortNpub } from '@/lib/shortNpub';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CATALLAX_KINDS, getStatusColor, formatSats, type GoalProgress, type TaskProposal } from '@/lib/catallax';

/** Shows the assigned arbiter, surfacing the proposer-is-arbiter relationship. */
function ArbiterLine({ arbiterPubkey, isProposer }: { arbiterPubkey: string; isProposer: boolean }) {
  const author = useAuthor(arbiterPubkey);
  const name = author.data?.metadata?.name ?? shortNpub(arbiterPubkey);
  return (
    <p className="text-xs text-muted-foreground">
      Arbiter: <span className="font-medium text-foreground">{name}</span>
      {isProposer && <span className="ml-1 text-amber-600">· proposer is also the arbiter</span>}
    </p>
  );
}

/** Funding progress line for a project in a funding state (has a goal, not concluded). */
function FundingLine({ progress }: { progress: GoalProgress }) {
  const backers = progress.contributors.length;
  return (
    <div className="space-y-1">
      <Progress value={progress.percentComplete} className="h-1.5" />
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatSats(String(progress.raisedSats))}</span>
        {' / '}
        {formatSats(String(progress.targetSats))}
        {' · '}
        {backers} backer{backers === 1 ? '' : 's'}
        {progress.isGoalMet && <span className="ml-1 text-green-600">· goal reached</span>}
      </p>
    </div>
  );
}

/**
 * A nominee's task-proposal row: title + status (linking to the task detail), the
 * assigned arbiter (read-only), and a funding progress bar when the project is in a
 * funding state. All management actions live on the detail page.
 */
export function NomineeProjectItem({ task, progress }: { task: TaskProposal; progress?: GoalProgress }) {
  const naddr = nip19.naddrEncode({
    kind: CATALLAX_KINDS.TASK_PROPOSAL,
    pubkey: task.patronPubkey,
    identifier: task.d,
  });
  const showFunding = !!task.goalId && !!progress && task.status !== 'concluded';
  const isConcluded = task.status === 'concluded';

  return (
    <Link
      to={`/task/${naddr}`}
      className={`group block space-y-2 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-muted/50 ${isConcluded ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-medium transition-colors group-hover:text-primary">
          {task.content.title}
        </span>
        <Badge variant="secondary" className={`shrink-0 ${getStatusColor(task.status)}`}>
          {task.status}
        </Badge>
      </div>

      {showFunding && <FundingLine progress={progress!} />}

      {task.arbiterPubkey && (
        <ArbiterLine arbiterPubkey={task.arbiterPubkey} isProposer={task.arbiterPubkey === task.patronPubkey} />
      )}
    </Link>
  );
}
