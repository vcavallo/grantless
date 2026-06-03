import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Badge } from '@/components/ui/badge';
import { CATALLAX_KINDS, getStatusColor, type TaskProposal } from '@/lib/catallax';

/** Shows the assigned arbiter, surfacing the proposer-is-arbiter relationship. */
function ArbiterLine({ arbiterPubkey, isProposer }: { arbiterPubkey: string; isProposer: boolean }) {
  const author = useAuthor(arbiterPubkey);
  const name = author.data?.metadata?.name ?? genUserName(arbiterPubkey);
  return (
    <p className="text-xs text-muted-foreground">
      Arbiter: <span className="font-medium text-foreground">{name}</span>
      {isProposer && <span className="ml-1 text-amber-600">· proposer is also the arbiter</span>}
    </p>
  );
}

/**
 * A nominee's task-proposal row: title + status (linking to the task detail) and the
 * assigned arbiter (read-only). All management actions live on the detail page.
 */
export function NomineeProjectItem({ task }: { task: TaskProposal }) {
  const naddr = nip19.naddrEncode({
    kind: CATALLAX_KINDS.TASK_PROPOSAL,
    pubkey: task.patronPubkey,
    identifier: task.d,
  });

  return (
    <div className="space-y-2 rounded-md border px-3 py-2 text-sm">
      <Link
        to={`/task/${naddr}`}
        className="flex items-center justify-between gap-3 transition-colors hover:text-primary"
      >
        <span className="truncate font-medium">{task.content.title}</span>
        <Badge variant="secondary" className={`shrink-0 ${getStatusColor(task.status)}`}>
          {task.status}
        </Badge>
      </Link>

      {task.arbiterPubkey && (
        <ArbiterLine arbiterPubkey={task.arbiterPubkey} isProposer={task.arbiterPubkey === task.patronPubkey} />
      )}
    </div>
  );
}
