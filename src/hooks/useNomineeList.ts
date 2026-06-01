import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { decodeNomineeListNaddr, extractNomineePubkeys } from '@/lib/grantless';
import { getActiveRelays } from '@/lib/relays';

export type NomineeListStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export type NomineeListError = 'malformed' | 'unsupported_kind' | 'not_found';

export interface NomineeListResult {
  /** Resolved nominee pubkeys, deduped and in the list's `p`-tag order. */
  pubkeys: string[];
  status: NomineeListStatus;
  error?: NomineeListError;
  /** Relays this lookup queries — the naddr's hints, else the configured set. */
  relays: string[];
}

/**
 * Resolve a pasted list `naddr` (kind 30392 / 30000 / 39089) into its member
 * pubkeys.
 *
 * The list often lives on relays other than the user's configured one, so we
 * follow the naddr's own relay hints when present (passed via the query's
 * `relays` option, which overrides the pool's reqRouter). Hints come from the
 * user-pasted address, so this stays fully open/permissionless. With no hints
 * we fall back to the configured (overridable) relay set. Decode errors
 * short-circuit before any query.
 */
export function useNomineeList(naddr: string | null): NomineeListResult {
  const { nostr } = useNostr();
  const { config, presetRelays } = useAppContext();

  const trimmed = naddr?.trim() ?? '';
  const decoded = trimmed ? decodeNomineeListNaddr(trimmed) : null;
  const decodeError = decoded && 'error' in decoded ? decoded.error : undefined;
  const coord = decoded && !('error' in decoded) ? decoded : null;

  const relays = coord
    ? coord.relays && coord.relays.length > 0
      ? coord.relays
      : getActiveRelays(config, presetRelays)
    : [];

  const query = useQuery({
    queryKey: ['nominee-list', trimmed, relays],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      const events = await nostr.query(
        [{ kinds: [coord!.kind], authors: [coord!.pubkey], '#d': [coord!.identifier], limit: 1 }],
        { signal, relays },
      );
      if (events.length === 0) return null;
      // Addressable event: newest version wins.
      const latest = events.reduce((a, b) => (b.created_at > a.created_at ? b : a));
      return extractNomineePubkeys(latest);
    },
    enabled: !!coord,
    staleTime: 0,
    retry: false,
  });

  if (!trimmed) {
    return { pubkeys: [], status: 'idle', relays };
  }
  if (decodeError) {
    return { pubkeys: [], status: 'error', error: decodeError, relays };
  }
  if (query.isLoading) {
    return { pubkeys: [], status: 'loading', relays };
  }
  if (query.isError || query.data == null) {
    return { pubkeys: [], status: 'error', error: 'not_found', relays };
  }
  if (query.data.length === 0) {
    return { pubkeys: [], status: 'empty', relays };
  }
  return { pubkeys: query.data, status: 'ready', relays };
}
