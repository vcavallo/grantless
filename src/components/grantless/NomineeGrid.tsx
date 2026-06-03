import type { NostrMetadata } from '@nostrify/nostrify';
import type { TaskProposal } from '@/lib/catallax';
import { NomineeCard } from './NomineeCard';

interface NomineeGridProps {
  pubkeys: string[];
  tasksByPatron: Map<string, TaskProposal[]>;
  /** Batch-fetched profile metadata; cards fall back when a pubkey is absent. */
  profiles?: Map<string, NostrMetadata>;
  /** Selected curator — supplies arbiter options for a patron's assign control. */
  curatorPubkey?: string;
}

/**
 * The responsive grid of nominee/applicant cards. Presentational — the container
 * resolves the pubkeys, their tasks, and their profiles, and passes them in.
 */
export function NomineeGrid({ pubkeys, tasksByPatron, profiles, curatorPubkey }: NomineeGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pubkeys.map((pubkey) => (
        <NomineeCard
          key={pubkey}
          pubkey={pubkey}
          tasks={tasksByPatron.get(pubkey) ?? []}
          metadata={profiles?.get(pubkey)}
          curatorPubkey={curatorPubkey}
        />
      ))}
    </div>
  );
}
