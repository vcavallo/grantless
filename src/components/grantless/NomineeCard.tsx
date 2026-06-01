import type { NostrMetadata } from '@nostrify/nostrify';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NomineeProjectItem } from './NomineeProjectItem';
import type { TaskProposal } from '@/lib/catallax';

interface NomineeCardProps {
  pubkey: string;
  tasks: TaskProposal[];
  /** Profile metadata (batch-fetched by the browser); falls back when absent. */
  metadata?: NostrMetadata;
}

/**
 * A single nominee: profile (name + avatar, with fallback) and their Catallax
 * projects beneath — or "No projects yet" when they've posted none.
 */
export function NomineeCard({ pubkey, tasks, metadata }: NomineeCardProps) {
  const displayName = metadata?.name ?? genUserName(pubkey);
  const image = metadata?.picture;
  const initial = displayName.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {image && <AvatarImage src={image} alt={displayName} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{displayName}</p>
            {metadata?.nip05 && (
              <p className="truncate text-xs text-muted-foreground">{metadata.nip05}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <NomineeProjectItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
