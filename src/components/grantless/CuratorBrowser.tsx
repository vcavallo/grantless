import { useEffect, useMemo, useState } from 'react';
import { nip19 } from 'nostr-tools';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApplicantCurationLists } from '@/hooks/useApplicantCurationLists';
import { useNomineeProfiles } from '@/hooks/useNomineeProfiles';
import { useTaskProposals } from '@/hooks/useCatallax';
import { useGoalsProgress } from '@/hooks/useGoalsProgress';
import { useAppContext } from '@/hooks/useAppContext';
import { getActiveRelays } from '@/lib/relays';
import {
  applicantsForCurator,
  distinctCurators,
  filterTasks,
  groupTasksByPatron,
  parseConfiguredCurators,
  parsePubkey,
  sortTasks,
} from '@/lib/grantless';
import type { TaskProposal } from '@/lib/catallax';
import { shortNpub } from '@/lib/shortNpub';
import { NomineeGrid } from './NomineeGrid';
import { BrowseControls, type BrowseControlsState } from './BrowseControls';
import { CreateProjectDialog } from './CreateProjectDialog';
import { BecomeArbiterDialog } from './BecomeArbiterDialog';
import { RelaySelector } from '@/components/RelaySelector';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_KEY = 'grantless:lastCurator';

/**
 * Browse a curator's vouched-for applicants: discover curators, pick one (or deep-link
 * via `/c/:npub`), resolve their applicants, and render their projects with funding,
 * filters, and sorts. No curator/relay is privileged.
 */
export function CuratorBrowser({ curatorNpub }: { curatorNpub?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoOpenArbiter = searchParams.get('compose') === 'arbiter';
  const { lists, status, relays } = useApplicantCurationLists();
  const { config, presetRelays } = useAppContext();

  // Resolve profiles from the active relay set ∪ the relays where the curation
  // lists were found. The curation-list relays (Brainstorm, relay.grantless.org)
  // are only a hint — a curator's or applicant's kind-0 profile usually lives on
  // their own relays, not where their listing was published — so querying the
  // list relays alone leaves real profiles unresolved and falls back to a
  // fabricated "Wise Owl" name. The active set is the reliable, overridable read
  // path (same union approach as useZapGoal); no hardcoded relay fallback.
  const profileRelays = useMemo(
    () => [...new Set([...getActiveRelays(config, presetRelays), ...relays])],
    [config, presetRelays, relays],
  );
  const [savedCurator, setSavedCurator] = useLocalStorage<string>(STORAGE_KEY, '');

  // A curator in the URL (e.g. /c/:npub) wins over the remembered one; remember it too.
  const routeCurator = curatorNpub ? parsePubkey(curatorNpub) : null;
  const selected = routeCurator ?? savedCurator;
  useEffect(() => {
    if (routeCurator && routeCurator !== savedCurator) setSavedCurator(routeCurator);
  }, [routeCurator, savedCurator, setSavedCurator]);

  const selectCurator = (pubkey: string) => {
    setSavedCurator(pubkey);
    navigate(`/c/${nip19.npubEncode(pubkey)}`);
  };

  const configured = useMemo(
    () => parseConfiguredCurators(import.meta.env.VITE_GRANTLESS_CURATORS),
    [],
  );
  const curators = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const pubkey of [...configured, ...distinctCurators(lists)]) {
      if (!seen.has(pubkey)) {
        seen.add(pubkey);
        result.push(pubkey);
      }
    }
    return result;
  }, [configured, lists]);

  const { data: curatorProfiles, isLoading: curatorProfilesLoading } = useNomineeProfiles(curators, profileRelays);

  const applicants = useMemo(
    () => (selected ? applicantsForCurator(lists, selected) : []),
    [lists, selected],
  );

  const { data: tasks = [] } = useTaskProposals();
  const tasksByPatron = useMemo(() => groupTasksByPatron(tasks), [tasks]);
  const { data: applicantProfiles } = useNomineeProfiles(applicants, profileRelays);

  // Batch-fetch funding for every goal'd project of the selected curator's applicants.
  const goalIds = useMemo(() => {
    const ids: string[] = [];
    for (const a of applicants) {
      for (const t of tasksByPatron.get(a) ?? []) {
        if (t.goalId) ids.push(t.goalId);
      }
    }
    return ids;
  }, [applicants, tasksByPatron]);
  const { progressByGoal } = useGoalsProgress(goalIds);

  const [controls, setControls] = useState<BrowseControlsState>({
    statuses: ['proposed', 'funded', 'in_progress', 'submitted'], // concluded hidden by default
    sort: 'newest',
    seekingFunding: false,
    needsWorker: false,
    hideEmpty: false,
  });

  const filteredByPatron = useMemo(() => {
    const map = new Map<string, TaskProposal[]>();
    const filter = { statuses: controls.statuses, seekingFunding: controls.seekingFunding, needsWorker: controls.needsWorker };
    for (const a of applicants) {
      map.set(a, sortTasks(filterTasks(tasksByPatron.get(a) ?? [], filter, progressByGoal), controls.sort, progressByGoal));
    }
    return map;
  }, [applicants, tasksByPatron, controls, progressByGoal]);

  const applicantsToShow = controls.hideEmpty
    ? applicants.filter((a) => (filteredByPatron.get(a)?.length ?? 0) > 0)
    : applicants;

  const curatorLabel = (pubkey: string) => {
    // Real kind-0 name only. Returns '' while profiles resolve and when a curator
    // has no name — the dropdown always renders the short-npub beside the label, so
    // the npub stands alone rather than pairing with a fabricated placeholder word.
    if (curatorProfilesLoading && !curatorProfiles) return '';
    return curatorProfiles?.get(pubkey)?.name ?? '';
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 py-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-6 px-8 py-12 text-center">
          <p className="text-muted-foreground">Couldn't load curators. Try another relay?</p>
          <RelaySelector className="mx-auto w-full max-w-sm" />
        </CardContent>
      </Card>
    );
  }

  if (curators.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-6 px-8 py-12 text-center">
          <p className="text-muted-foreground">
            No curators found on this relay. Try another relay to discover curated applicant lists.
          </p>
          <RelaySelector className="mx-auto w-full max-w-sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label htmlFor="curator-select">Browse a curator</Label>
          <Select value={selected} onValueChange={selectCurator}>
            <SelectTrigger id="curator-select" className="w-full max-w-sm">
              <SelectValue placeholder="Choose a curator…" />
            </SelectTrigger>
            <SelectContent>
              {curators.map((pubkey) => (
                <SelectItem key={pubkey} value={pubkey}>
                  {curatorLabel(pubkey) && <span className="font-medium">{curatorLabel(pubkey)}</span>}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{shortNpub(pubkey)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <Link
              to={`/c/${nip19.npubEncode(selected)}/contributors`}
              className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View contributors
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CreateProjectDialog />
          <BecomeArbiterDialog autoOpen={autoOpenArbiter} />
        </div>
      </div>

      {!selected && (
        <p className="text-sm text-muted-foreground">
          Choose a curator above to see the applicants they vouch for and their projects.
        </p>
      )}

      {selected && applicants.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="space-y-6 px-8 py-12 text-center">
            <p className="text-muted-foreground">
              {curatorLabel(selected) || shortNpub(selected)} hasn't listed any applicants yet. Try another curator or relay?
            </p>
            <RelaySelector className="mx-auto w-full max-w-sm" />
          </CardContent>
        </Card>
      )}

      {selected && applicants.length > 0 && (
        <>
          <BrowseControls {...controls} onChange={(patch) => setControls((c) => ({ ...c, ...patch }))} />
          <NomineeGrid
            pubkeys={applicantsToShow}
            tasksByPatron={filteredByPatron}
            profiles={applicantProfiles}
            progressByGoal={progressByGoal}
          />
        </>
      )}
    </div>
  );
}
