import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getActiveRelays } from '@/lib/relays';
import { applicantCurationLists, type CurationList } from '@/lib/grantless';

export type CurationListsStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface ApplicantCurationListsResult {
  /** All `grantless-applicants` curation lists found on the relay(s). */
  lists: CurationList[];
  status: CurationListsStatus;
  /** The relays this lookup queried (the configured, overridable set). */
  relays: string[];
}

/**
 * Fetch the `grantless-applicants` trusted lists (kind 30392) from the configured
 * relay set in a single query. The component derives the curator picker (distinct
 * observers) and the selected curator's applicants from these lists.
 *
 * `observer`/`source-tag` aren't relay-indexed, so we fetch 30392s (bounded by a
 * limit) and filter client-side via `applicantCurationLists` — the source of
 * truth per the epic. An exact `#d` fast-path is a possible later optimization.
 */
export function useApplicantCurationLists(): ApplicantCurationListsResult {
  const { nostr } = useNostr();
  const { config, presetRelays } = useAppContext();
  const relays = getActiveRelays(config, presetRelays);

  const query = useQuery({
    queryKey: ['grantless-applicant-lists', relays],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      const events = await nostr.query(
        [{ kinds: [30392], limit: 500 }],
        relays.length > 0 ? { signal, relays } : { signal },
      );
      return applicantCurationLists(events);
    },
    staleTime: 30_000,
    retry: false,
  });

  if (query.isLoading) {
    return { lists: [], status: 'loading', relays };
  }
  if (query.isError || query.data == null) {
    return { lists: [], status: 'error', relays };
  }
  if (query.data.length === 0) {
    return { lists: [], status: 'empty', relays };
  }
  return { lists: query.data, status: 'ready', relays };
}
