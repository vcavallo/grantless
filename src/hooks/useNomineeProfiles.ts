import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { NSchema as n, type NostrMetadata } from '@nostrify/nostrify';

/**
 * Batch-fetch kind-0 profiles for a set of nominee pubkeys from the given
 * relays (typically the pasted list's relay hints ∪ the configured set, since
 * a nominee's profile often lives on a different relay than the app's default —
 * e.g. purplepag.es). One query for all nominees, returning a pubkey→metadata
 * map. Avoids N separate `useAuthor` lookups against only the configured relay.
 */
export function useNomineeProfiles(pubkeys: string[], relays: string[]) {
  const { nostr } = useNostr();
  const authors = [...pubkeys].sort();

  return useQuery({
    queryKey: ['nominee-profiles', authors, relays],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      const events = await nostr.query(
        [{ kinds: [0], authors }],
        relays.length > 0 ? { signal, relays } : { signal },
      );

      // Keep the latest kind-0 per pubkey, then parse its metadata.
      const latest = new Map<string, (typeof events)[number]>();
      for (const event of events) {
        const prev = latest.get(event.pubkey);
        if (!prev || event.created_at > prev.created_at) {
          latest.set(event.pubkey, event);
        }
      }

      const profiles = new Map<string, NostrMetadata>();
      for (const [pubkey, event] of latest) {
        try {
          profiles.set(pubkey, n.json().pipe(n.metadata()).parse(event.content));
        } catch {
          // Ignore unparseable metadata — the card falls back to a generated name.
        }
      }
      return profiles;
    },
    enabled: authors.length > 0,
    staleTime: 60_000,
  });
}
