import { Eye, Gavel } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useApplicantCurationLists } from '@/hooks/useApplicantCurationLists';
import { vouchedApplicantPubkeys } from '@/lib/grantless';
import { type TaskProposal } from '@/lib/catallax';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Author-facing guidance on the task detail page: the same "stuck" conditions the
 * operator Admin panel surfaces (no arbiter yet; not listed by any curator), shown
 * to the patron first-person and actionable so they can unstick themselves. Renders
 * nothing for non-patrons, concluded tasks, or when there's nothing to flag.
 */
export function PatronGuidance({ task }: { task: TaskProposal }) {
  const { user } = useCurrentUser();
  const { lists, status } = useApplicantCurationLists();

  if (!user || user.pubkey !== task.patronPubkey || task.status === 'concluded') return null;

  const needsArbiter = !task.arbiterPubkey && task.status === 'proposed';
  // Only judge visibility once the curation lookup has settled — don't cry "invisible"
  // while lists are still loading or a relay errored (best-effort, like the Admin panel).
  const curationSettled = status === 'ready' || status === 'empty';
  const notVisible = curationSettled && !vouchedApplicantPubkeys(lists).has(task.patronPubkey);

  if (!needsArbiter && !notVisible) return null;

  return (
    <div className="space-y-3">
      {needsArbiter && (
        <Alert>
          <Gavel className="h-4 w-4" />
          <AlertTitle>Assign an arbiter to unlock funding</AlertTitle>
          <AlertDescription>
            A project needs an arbiter — who holds the crowdfund in escrow and judges the work —
            before you can open it for funding. Pick one from the arbiter control below.
          </AlertDescription>
        </Alert>
      )}
      {notVisible && (
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertTitle>Not visible in the browse yet</AlertTitle>
          <AlertDescription>
            Your project only appears under a curator who lists you as an applicant — and right now no
            curator does. You can self-curate (publish a <code>grantless-applicants</code> list that
            includes your own pubkey) or ask a curator to add you. If you were just added, the list may
            take a moment to propagate.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
