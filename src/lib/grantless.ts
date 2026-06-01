import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { TaskProposal } from '@/lib/catallax';

/**
 * Kinds whose `p` tags we treat as a list of "Grantless Nominee" pubkeys.
 * - 30000: NIP-51 follow set
 * - 30392: WoT trusted list (e.g. from a Brainstorm/GrapeRank PoV)
 * - 39089: starter pack
 * All three are addressable events carrying a list of `p` tags, so any of them
 * can stand in for a Curator's nominee set.
 */
export const NOMINEE_LIST_KINDS = [30392, 30000, 39089] as const;

export type DecodedNomineeList =
  | { kind: number; pubkey: string; identifier: string; relays?: string[] }
  | { error: 'malformed' | 'unsupported_kind' };

/**
 * Decode an `naddr` into an addressable coordinate, requiring it to point at a
 * supported nominee-list kind. Pure — no network.
 */
export function decodeNomineeListNaddr(input: string): DecodedNomineeList {
  let decoded: ReturnType<typeof nip19.decode>;
  try {
    decoded = nip19.decode(input.trim());
  } catch {
    return { error: 'malformed' };
  }

  if (decoded.type !== 'naddr') {
    return { error: 'malformed' };
  }

  const { kind, pubkey, identifier, relays } = decoded.data;
  if (!(NOMINEE_LIST_KINDS as readonly number[]).includes(kind)) {
    return { error: 'unsupported_kind' };
  }

  return { kind, pubkey, identifier, relays };
}

/**
 * Collect the `p`-tag pubkeys from a list event, in tag order, deduped
 * (first occurrence wins).
 */
export function extractNomineePubkeys(event: NostrEvent): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of event.tags) {
    if (tag[0] === 'p' && tag[1] && !seen.has(tag[1])) {
      seen.add(tag[1]);
      result.push(tag[1]);
    }
  }
  return result;
}

/** Bucket task proposals by their patron pubkey. */
export function groupTasksByPatron(tasks: TaskProposal[]): Map<string, TaskProposal[]> {
  const grouped = new Map<string, TaskProposal[]>();
  for (const task of tasks) {
    const existing = grouped.get(task.patronPubkey);
    if (existing) {
      existing.push(task);
    } else {
      grouped.set(task.patronPubkey, [task]);
    }
  }
  return grouped;
}
