import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Badge } from '@/components/ui/badge';
import { CATALLAX_KINDS, getStatusColor, type TaskProposal } from '@/lib/catallax';

/**
 * Slim, presentational project row for a nominee's task proposal.
 * Deliberately minimal — title + status, linking to the existing task detail.
 * (No funding/zap/action UI; that's out of scope for the browser.)
 */
export function NomineeProjectItem({ task }: { task: TaskProposal }) {
  const naddr = nip19.naddrEncode({
    kind: CATALLAX_KINDS.TASK_PROPOSAL,
    pubkey: task.patronPubkey,
    identifier: task.d,
  });

  return (
    <Link
      to={`/task/${naddr}`}
      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <span className="truncate font-medium">{task.content.title}</span>
      <Badge variant="secondary" className={`shrink-0 ${getStatusColor(task.status)}`}>
        {task.status}
      </Badge>
    </Link>
  );
}
