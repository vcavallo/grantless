import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatSats } from '@/lib/catallax';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { AuthorName } from '@/components/AuthorName';
import { CopyNpubButton } from '@/components/CopyNpubButton';

interface Contributor {
  pubkey: string;
  amountSats: number;
}

const STACK = 8;

/**
 * Contributors to a crowdfund: a collapsed overlapping avatar stack + count, which
 * expands to per-contributor rows (avatar, name, total, copyable npub). All data is
 * from public zap receipts; ranked by amount. Renders nothing when there are none.
 */
export function ContributorList({ contributors }: { contributors: Contributor[] }) {
  const [expanded, setExpanded] = useState(false);
  if (contributors.length === 0) return null;

  const sorted = [...contributors].sort((a, b) => b.amountSats - a.amountSats);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="flex -space-x-2">
          {sorted.slice(0, STACK).map((c) => (
            <AuthorAvatar key={c.pubkey} pubkey={c.pubkey} className="h-6 w-6 ring-2 ring-background" />
          ))}
        </div>
        <span>
          {sorted.length} contributor{sorted.length === 1 ? '' : 's'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <ul className="space-y-1">
          {sorted.map((c) => (
            <li key={c.pubkey} className="flex items-center gap-2 text-sm">
              <AuthorAvatar pubkey={c.pubkey} className="h-6 w-6" />
              <AuthorName pubkey={c.pubkey} className="min-w-0 flex-1 truncate" />
              <span className="font-medium text-foreground">{formatSats(String(c.amountSats))}</span>
              <CopyNpubButton pubkey={c.pubkey} size="icon" variant="ghost" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
