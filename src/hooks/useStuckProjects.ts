import { useApplicantCurationLists } from '@/hooks/useApplicantCurationLists';
import { useTaskProposals } from '@/hooks/useCatallax';
import { findStuckProjects, vouchedApplicantPubkeys, type StuckProjects } from '@/lib/grantless';

/**
 * Compose the operator panel's two diagnostics over the data the browse already
 * fetches: all crowdfunding tasks (active relay set) and the applicant curation
 * lists. Returns the stuck-project buckets plus a loading flag. Pure detection
 * lives in `findStuckProjects` — this hook is just the data wiring.
 */
export function useStuckProjects(): StuckProjects & { isLoading: boolean } {
  const { data: tasks = [], isLoading: tasksLoading } = useTaskProposals();
  const { lists, status } = useApplicantCurationLists();

  const vouched = vouchedApplicantPubkeys(lists);
  const { unvouched, arbiterless } = findStuckProjects(tasks, vouched);

  return { unvouched, arbiterless, isLoading: tasksLoading || status === 'loading' };
}
