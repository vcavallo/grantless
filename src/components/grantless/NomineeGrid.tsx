import type { NostrMetadata } from '@nostrify/nostrify';
import type { GoalProgress, TaskProposal } from '@/lib/catallax';
import { NomineeCard } from './NomineeCard';

interface NomineeGridProps {
  pubkeys: string[];
  tasksByPatron: Map<string, TaskProposal[]>;
  /** Batch-fetched profile metadata; cards fall back when a pubkey is absent. */
  profiles?: Map<string, NostrMetadata>;
  /** Funding progress per goal id (for funding-state cards). */
  progressByGoal?: Map<string, GoalProgress>;
}

/**
 * The responsive grid of nominee/applicant cards. Presentational — the container
 * resolves the pubkeys, their tasks, their profiles, and funding progress.
 */
export function NomineeGrid({ pubkeys, tasksByPatron, profiles, progressByGoal }: NomineeGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pubkeys.map((pubkey) => (
        <NomineeCard
          key={pubkey}
          pubkey={pubkey}
          tasks={tasksByPatron.get(pubkey) ?? []}
          metadata={profiles?.get(pubkey)}
          progressByGoal={progressByGoal}
        />
      ))}
    </div>
  );
}
