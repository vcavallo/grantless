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

// ---- Curation chain (kind 30392 observer/source-tag) ----
//
// A curator's curated set for a tag is a kind-30392 trusted list, signed by a
// list-publishing agent (the "TA"), NOT by the curator. The list is keyed by its
// `observer` (the curator / point-of-view) and its `source-tag` (whose 4th
// element is the tag slug). Trust resolves through observer + slug — never by
// trusting whoever signed the event (the prime directive: trust is WoT-derived,
// not conferred by a signer). Only `d`/`p` are relay-indexed, so callers fetch
// 30392s and filter here, client-side.

/** The tag slug whose curated set is the list of eligible Grantless applicants. */
export const GRANTLESS_APPLICANTS_SLUG = 'grantless-applicants';

export interface CurationList {
  /** The curator / point-of-view this list belongs to. */
  observer: string;
  /** The tag slug (e.g. `grantless-applicants`). */
  slug: string;
  /** Member pubkeys, deduped and in `p`-tag order. */
  members: string[];
  /** `created_at` of this revision (for latest-wins selection). */
  createdAt: number;
}

/**
 * Parse a kind-30392 event into a `CurationList`. Returns null if it isn't a
 * 30392 or is missing its `observer` / `source-tag` slug. Does not consider the
 * signer.
 */
export function parseCurationList(event: NostrEvent): CurationList | null {
  if (event.kind !== 30392) return null;
  const observer = event.tags.find(([name]) => name === 'observer')?.[1];
  const slug = event.tags.find(([name]) => name === 'source-tag')?.[3];
  if (!observer || !slug) return null;
  return { observer, slug, members: extractNomineePubkeys(event), createdAt: event.created_at };
}

/** Parse a batch of events into the curation lists for one slug (default: applicants). */
export function applicantCurationLists(
  events: NostrEvent[],
  slug: string = GRANTLESS_APPLICANTS_SLUG,
): CurationList[] {
  return events
    .map(parseCurationList)
    .filter((list): list is CurationList => list !== null && list.slug === slug);
}

/** The distinct curators (observers) among a set of curation lists, first-seen order. */
export function distinctCurators(lists: CurationList[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    if (!seen.has(list.observer)) {
      seen.add(list.observer);
      result.push(list.observer);
    }
  }
  return result;
}

/** The members of a curator's latest (newest `created_at`) list among the given lists. */
export function applicantsForCurator(lists: CurationList[], curator: string): string[] {
  const mine = lists.filter((list) => list.observer === curator);
  if (mine.length === 0) return [];
  const latest = mine.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
  return latest.members;
}

/**
 * Resolve a curator's applicant pubkeys from raw events: keep `grantless-applicants`
 * 30392s observed by `curator`, take the latest, return its members. Never filters
 * by the event's signer.
 */
export function resolveCuratorApplicants(
  events: NostrEvent[],
  curator: string,
  slug: string = GRANTLESS_APPLICANTS_SLUG,
): string[] {
  return applicantsForCurator(applicantCurationLists(events, slug), curator);
}

/**
 * Parse a configured curator list (e.g. from `VITE_GRANTLESS_CURATORS`): a
 * comma-separated mix of `npub…` and 64-char hex pubkeys. Invalid tokens are
 * dropped; the result is hex, deduped. Empty/undefined → `[]` (discovery only).
 * This is a plain, overridable convenience — no curator is privileged.
 */
export function parseConfiguredCurators(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const piece of raw.split(',')) {
    const token = piece.trim();
    if (!token) continue;
    let hex: string | undefined;
    if (/^[0-9a-f]{64}$/i.test(token)) {
      hex = token.toLowerCase();
    } else {
      try {
        const decoded = nip19.decode(token);
        if (decoded.type === 'npub') hex = decoded.data;
      } catch {
        // not a valid npub — skip this token
      }
    }
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      result.push(hex);
    }
  }
  return result;
}
