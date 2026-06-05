import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useArbiterAnnouncements } from '@/hooks/useCatallax';
import { getActiveRelays } from '@/lib/relays';
import {
  resolveCuratorApplicants,
  selectArbiterCandidates,
  GRANTLESS_ARBITER_SLUG,
  type ArbiterCandidate,
} from '@/lib/grantless';

export interface CuratorArbiterCandidatesResult {
  candidates: ArbiterCandidate[];
  /** How many arbiters the curator vouches for (list members), before the
   *  has-announced-a-service filter — lets the UI distinguish "none vouched" from
   *  "vouched but none have announced a service yet". */
  memberCount: number;
  isLoading: boolean;
  relays: string[];
}

/**
 * The arbiters a curator vouches for and that can actually be assigned: members of
 * the curator's `grantless-arbiter` list (resolved via observer/source-tag) who also
 * have a kind-33400 announcement. The curator's list only *filters the options* — no
 * arbiter is privileged, and resolution never trusts the list's signer.
 */
export function useCuratorArbiterCandidates(curatorPubkey: string | undefined): CuratorArbiterCandidatesResult {
  const { nostr } = useNostr();
  const { config, presetRelays } = useAppContext();
  const relays = getActiveRelays(config, presetRelays);
  const { data: announcements = [], isLoading: arbitersLoading } = useArbiterAnnouncements();

  const lists = useQuery({
    queryKey: ['grantless-arbiter-lists', relays],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      const events = await nostr.query(
        [{ kinds: [30392], limit: 500 }],
        relays.length > 0 ? { signal, relays } : { signal },
      );
      return events;
    },
    enabled: !!curatorPubkey,
    staleTime: 30_000,
    retry: false,
  });

  const members = curatorPubkey && lists.data
    ? resolveCuratorApplicants(lists.data, curatorPubkey, GRANTLESS_ARBITER_SLUG)
    : [];
  const candidates = selectArbiterCandidates(members, announcements);

  return { candidates, memberCount: members.length, isLoading: lists.isLoading || arbitersLoading, relays };
}
