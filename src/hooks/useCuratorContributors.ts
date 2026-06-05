import { useMemo } from 'react';
import { useApplicantCurationLists } from '@/hooks/useApplicantCurationLists';
import { useTaskProposals } from '@/hooks/useCatallax';
import { useGoalsProgress } from '@/hooks/useGoalsProgress';
import {
  aggregateContributors,
  applicantsForCurator,
  groupTasksByPatron,
  type RankedContributor,
} from '@/lib/grantless';

/**
 * Contributors across everything a curator's applicants have raised, ranked by total
 * sats. Reuses the same resolution the browse uses (applicants → tasks → goals) and the
 * single batched `useGoalsProgress` query, then aggregates with the pure helper. No
 * privileged pubkey/relay; all from public zap receipts.
 */
export function useCuratorContributors(curatorPubkey: string | null): {
  contributors: RankedContributor[];
  isLoading: boolean;
} {
  const { lists, status } = useApplicantCurationLists();
  const { data: tasks = [], isLoading: tasksLoading } = useTaskProposals();

  const applicants = useMemo(
    () => (curatorPubkey ? applicantsForCurator(lists, curatorPubkey) : []),
    [lists, curatorPubkey],
  );
  const tasksByPatron = useMemo(() => groupTasksByPatron(tasks), [tasks]);

  const goalIds = useMemo(() => {
    const ids: string[] = [];
    for (const a of applicants) {
      for (const t of tasksByPatron.get(a) ?? []) {
        if (t.goalId) ids.push(t.goalId);
      }
    }
    return ids;
  }, [applicants, tasksByPatron]);

  const { progressByGoal, isLoading: goalsLoading } = useGoalsProgress(goalIds);

  const contributors = useMemo(
    () => aggregateContributors([...progressByGoal.values()]),
    [progressByGoal],
  );

  return { contributors, isLoading: status === 'loading' || tasksLoading || goalsLoading };
}
