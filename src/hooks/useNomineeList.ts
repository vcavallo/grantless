import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { decodeNomineeListNaddr, extractNomineePubkeys } from '@/lib/grantless';

export type NomineeListStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export type NomineeListError = 'malformed' | 'unsupported_kind' | 'not_found';

export interface NomineeListResult {
  /** Resolved nominee pubkeys, deduped and in the list's `p`-tag order. */
  pubkeys: string[];
  status: NomineeListStatus;
  error?: NomineeListError;
}

/**
 * Resolve a pasted list `naddr` (kind 30392 / 30000 / 39089) into its member
 * pubkeys. Reads from the app's configured (overridable) relay. Decode errors
 * short-circuit before any query.
 */
export function useNomineeList(naddr: string | null): NomineeListResult {
  const { nostr } = useNostr();

  const trimmed = naddr?.trim() ?? '';
  const decoded = trimmed ? decodeNomineeListNaddr(trimmed) : null;
  const decodeError = decoded && 'error' in decoded ? decoded.error : undefined;
  const coord = decoded && !('error' in decoded) ? decoded : null;

  const query = useQuery({
    queryKey: ['nominee-list', trimmed],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      // Follow the naddr's own relay hints to find the list (it may not live on
      // the user's configured relay). Hints come from the user-pasted address,
      // so this stays fully open/permissionless. Fall back to the configured
      // relay when the naddr carries no hints.
      const opts = coord!.relays?.length ? { signal, relays: coord!.relays } : { signal };
      const events = await nostr.query(
        [{ kinds: [coord!.kind], authors: [coord!.pubkey], '#d': [coord!.identifier], limit: 1 }],
        opts,
      );
      if (events.length === 0) return null;
      // Addressable event: newest version wins.
      const latest = events.reduce((a, b) => (b.created_at > a.created_at ? b : a));
      return extractNomineePubkeys(latest);
    },
    enabled: !!coord,
    staleTime: 60_000,
  });

  if (!trimmed) {
    return { pubkeys: [], status: 'idle' };
  }
  if (decodeError) {
    return { pubkeys: [], status: 'error', error: decodeError };
  }
  if (query.isLoading) {
    return { pubkeys: [], status: 'loading' };
  }
  if (query.isError || query.data == null) {
    return { pubkeys: [], status: 'error', error: 'not_found' };
  }
  if (query.data.length === 0) {
    return { pubkeys: [], status: 'empty' };
  }
  return { pubkeys: query.data, status: 'ready' };
}
