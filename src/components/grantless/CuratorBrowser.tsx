import { useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApplicantCurationLists } from '@/hooks/useApplicantCurationLists';
import { useNomineeProfiles } from '@/hooks/useNomineeProfiles';
import { useTaskProposals } from '@/hooks/useCatallax';
import {
  applicantsForCurator,
  distinctCurators,
  groupTasksByPatron,
  parseConfiguredCurators,
} from '@/lib/grantless';
import { genUserName } from '@/lib/genUserName';
import { NomineeGrid } from './NomineeGrid';
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

function shortNpub(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 12)}…${npub.slice(-6)}`;
  } catch {
    return pubkey.slice(0, 12);
  }
}

/**
 * Browse a curator's vouched-for applicants. Discovers the curators who published
 * a `grantless-applicants` trusted list (plus any configured via
 * VITE_GRANTLESS_CURATORS), lets the viewer pick one, resolves that curator's
 * applicants through the observer/source-tag chain, and renders them with the
 * Story-1 engine. No curator/relay is privileged; the remembered selection is
 * local. Replaces the pasted-naddr demo.
 */
export function CuratorBrowser() {
  const { lists, status, relays } = useApplicantCurationLists();
  const [selected, setSelected] = useLocalStorage<string>(STORAGE_KEY, '');

  // Curators = configured (overridable, empty by default) ∪ discovered observers.
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

  const { data: curatorProfiles } = useNomineeProfiles(curators, relays);

  const applicants = useMemo(
    () => (selected ? applicantsForCurator(lists, selected) : []),
    [lists, selected],
  );

  const { data: tasks = [] } = useTaskProposals();
  const tasksByPatron = useMemo(() => groupTasksByPatron(tasks), [tasks]);
  const { data: applicantProfiles } = useNomineeProfiles(applicants, relays);

  const curatorLabel = (pubkey: string) =>
    curatorProfiles?.get(pubkey)?.name ?? genUserName(pubkey);

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
      <div className="space-y-2">
        <Label htmlFor="curator-select">Browse a curator</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="curator-select" className="w-full max-w-sm">
            <SelectValue placeholder="Choose a curator…" />
          </SelectTrigger>
          <SelectContent>
            {curators.map((pubkey) => (
              <SelectItem key={pubkey} value={pubkey}>
                <span className="font-medium">{curatorLabel(pubkey)}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{shortNpub(pubkey)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {relays.length > 0 && (
          <p className="break-all text-xs text-muted-foreground">
            Discovered from {relays.length} relay{relays.length === 1 ? '' : 's'}:{' '}
            <span className="font-mono">{relays.join(', ')}</span>
          </p>
        )}
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
              {curatorLabel(selected)} hasn't listed any applicants yet. Try another curator or relay?
            </p>
            <RelaySelector className="mx-auto w-full max-w-sm" />
          </CardContent>
        </Card>
      )}

      {selected && applicants.length > 0 && (
        <NomineeGrid pubkeys={applicants} tasksByPatron={tasksByPatron} profiles={applicantProfiles} curatorPubkey={selected} />
      )}
    </div>
  );
}
