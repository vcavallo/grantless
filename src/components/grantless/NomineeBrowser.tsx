import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNomineeList } from '@/hooks/useNomineeList';
import { useTaskProposals } from '@/hooks/useCatallax';
import { groupTasksByPatron } from '@/lib/grantless';
import { NomineeCard } from './NomineeCard';
import { RelaySelector } from '@/components/RelaySelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STORAGE_KEY = 'grantless:lastNomineeList';

/**
 * Browse a Curator's nominees from a pasted list `naddr` (30392 / 30000 / 39089).
 * Scaffolding for the real Curator OpenSet selection: the pasted list stands in
 * for the "Grantless Nominee" set. Remembers the last successfully-loaded list.
 */
export function NomineeBrowser() {
  const [savedNaddr, setSavedNaddr] = useLocalStorage<string>(STORAGE_KEY, '');
  const [input, setInput] = useState(savedNaddr);
  // Auto-load the remembered list on mount.
  const [activeNaddr, setActiveNaddr] = useState(savedNaddr);

  const { pubkeys, status, error } = useNomineeList(activeNaddr || null);
  const { data: tasks = [] } = useTaskProposals();
  const tasksByPatron = useMemo(() => groupTasksByPatron(tasks), [tasks]);

  // Persist only lists that actually resolved.
  useEffect(() => {
    if (status === 'ready' && activeNaddr && activeNaddr !== savedNaddr) {
      setSavedNaddr(activeNaddr);
    }
  }, [status, activeNaddr, savedNaddr, setSavedNaddr]);

  const handleLoad = () => setActiveNaddr(input.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          placeholder="Paste a list naddr (30392 trusted list, 30000 follow set, or 39089 starter pack)…"
          className="font-mono"
          aria-label="Nominee list naddr"
        />
        <Button onClick={handleLoad} className="shrink-0">
          <Search className="mr-2 h-4 w-4" />
          Load
        </Button>
      </div>

      {status === 'idle' && (
        <p className="text-sm text-muted-foreground">
          Paste a list of pubkeys above to preview its members as Grantless Nominees.
        </p>
      )}

      {status === 'error' && error === 'malformed' && (
        <p className="text-sm text-destructive">
          That doesn't look like a valid <code>naddr</code>. Paste an address for a 30392, 30000, or 39089 list.
        </p>
      )}

      {status === 'error' && error === 'unsupported_kind' && (
        <p className="text-sm text-destructive">
          That <code>naddr</code> isn't a supported list kind. Use a 30392 trusted list, 30000 follow set, or 39089 starter pack.
        </p>
      )}

      {status === 'error' && error === 'not_found' && (
        <Card className="border-dashed">
          <CardContent className="space-y-6 px-8 py-12 text-center">
            <p className="text-muted-foreground">Couldn't find that list. Try another relay?</p>
            <RelaySelector className="mx-auto w-full max-w-sm" />
          </CardContent>
        </Card>
      )}

      {status === 'empty' && (
        <Card className="border-dashed">
          <CardContent className="space-y-6 px-8 py-12 text-center">
            <p className="text-muted-foreground">That list has no members. Try another list or relay?</p>
            <RelaySelector className="mx-auto w-full max-w-sm" />
          </CardContent>
        </Card>
      )}

      {status === 'loading' && (
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
      )}

      {status === 'ready' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {pubkeys.map((pubkey) => (
            <NomineeCard key={pubkey} pubkey={pubkey} tasks={tasksByPatron.get(pubkey) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
