import type { NostrMetadata } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NomineeProjectItem } from './NomineeProjectItem';
import type { GoalProgress, TaskProposal } from '@/lib/catallax';

interface NomineeCardProps {
  pubkey: string;
  tasks: TaskProposal[];
  /** Profile metadata (batch-fetched by the browser); falls back when absent. */
  metadata?: NostrMetadata;
  /** Funding progress per goal id (for funding-state cards). */
  progressByGoal?: Map<string, GoalProgress>;
}

/** Most prolific applicants have dozens of projects; the card shows a preview. */
const PREVIEW_COUNT = 3;

/**
 * A single nominee: profile (name + avatar, with fallback) and a preview of their
 * Catallax projects beneath — or "No projects yet" when they've posted none. The
 * name and a "view more" link lead to the applicant's full project page, so a
 * prolific applicant never overruns the browse grid.
 */
export function NomineeCard({ pubkey, tasks, metadata, progressByGoal }: NomineeCardProps) {
  const displayName = metadata?.name ?? genUserName(pubkey);
  const image = metadata?.picture;
  const initial = displayName.slice(0, 2).toUpperCase();
  const applicantPath = `/p/${nip19.npubEncode(pubkey)}`;

  const preview = tasks.slice(0, PREVIEW_COUNT);
  const remaining = tasks.length - preview.length;

  return (
    <Card>
      <CardHeader>
        <Link to={applicantPath} className="flex items-center gap-3 group">
          <Avatar className="h-10 w-10">
            {image && <AvatarImage src={image} alt={displayName} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold group-hover:text-primary group-hover:underline underline-offset-4">
              {displayName}
            </p>
            {metadata?.nip05 && (
              <p className="truncate text-xs text-muted-foreground">{metadata.nip05}</p>
            )}
          </div>
        </Link>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet</p>
        ) : (
          <div className="space-y-2">
            {preview.map((task) => (
              <NomineeProjectItem
                key={task.id}
                task={task}
                progress={task.goalId ? progressByGoal?.get(task.goalId) : undefined}
              />
            ))}
            {remaining > 0 && (
              <Link
                to={applicantPath}
                className="block pt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                view {remaining} more {remaining === 1 ? 'project' : 'projects'}…
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
