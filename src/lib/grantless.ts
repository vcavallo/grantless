import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { ArbiterAnnouncement, GoalProgress, TaskProposal, TaskStatus } from '@/lib/catallax';

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

/** The tag slug whose curated set is the list of arbiters a curator vouches for. */
export const GRANTLESS_ARBITER_SLUG = 'grantless-arbiter';

/**
 * Normalize a single pubkey input (an `npub…` or a 64-char hex key) to hex, or
 * return null if it's neither. Used by the worker-assignment input. Pure.
 */
export function parsePubkey(input: string): string | null {
  const token = input.trim();
  if (!token) return null;
  if (/^[0-9a-f]{64}$/i.test(token)) return token.toLowerCase();
  try {
    const decoded = nip19.decode(token);
    if (decoded.type === 'npub') return decoded.data;
  } catch {
    // not a valid npub
  }
  return null;
}

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

export interface RankedContributor {
  pubkey: string;
  totalSats: number;
}

/**
 * Aggregate contributors across many goals: sum each pubkey's sats over every goal's
 * receipts, ranked highest-first. Pure. Ranking is purely mechanical (sats only) — no
 * pubkey is privileged; the totals reflect public zaps.
 */
export function aggregateContributors(progresses: GoalProgress[]): RankedContributor[] {
  const totals = new Map<string, number>();
  for (const progress of progresses) {
    for (const c of progress.contributors) {
      totals.set(c.pubkey, (totals.get(c.pubkey) ?? 0) + c.amountSats);
    }
  }
  return [...totals.entries()]
    .map(([pubkey, totalSats]) => ({ pubkey, totalSats }))
    .sort((a, b) => b.totalSats - a.totalSats);
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

/** An arbiter offerable for selection: a curator-vouched pubkey that has a 33400
 *  service announcement (so a service coordinate exists to reference). */
export interface ArbiterCandidate {
  pubkey: string;
  /** `d` of the chosen 33400 announcement. */
  serviceD: string;
  /** `33400:<pubkey>:<serviceD>` — the task's `a` tag. */
  serviceCoord: string;
  /** Display name from the announcement, if any. */
  name?: string;
}

/**
 * Cross-reference a curator's `grantless-arbiter` member pubkeys with the arbiter
 * announcements (kind 33400) to produce selectable candidates. A member is offerable
 * only if it has at least one announcement; the latest (`created_at`) is used.
 * Order follows `memberPubkeys`. Pure.
 */
export function selectArbiterCandidates(
  memberPubkeys: string[],
  announcements: ArbiterAnnouncement[],
): ArbiterCandidate[] {
  const candidates: ArbiterCandidate[] = [];
  for (const pubkey of memberPubkeys) {
    const mine = announcements.filter((a) => a.arbiterPubkey === pubkey);
    if (mine.length === 0) continue;
    const latest = mine.reduce((a, b) => (b.created_at > a.created_at ? b : a));
    candidates.push({
      pubkey,
      serviceD: latest.d,
      serviceCoord: `33400:${latest.arbiterPubkey}:${latest.d}`,
      name: latest.content.name,
    });
  }
  return candidates;
}

// ---- Browse filtering & sorting (Story 11) ----

export type TaskSort = 'newest' | 'funding' | 'amount';

export interface TaskFilter {
  /** Statuses to show. */
  statuses: TaskStatus[];
  /** Only tasks with a goal that isn't met yet. */
  seekingFunding: boolean;
  /** Only `funded` tasks with no worker assigned. */
  needsWorker: boolean;
}

/** Funding percent for sorting; tasks with no goal/progress sort last (-1). Pure. */
function fundingPct(task: TaskProposal, progressByGoal: Map<string, GoalProgress>): number {
  const p = task.goalId ? progressByGoal.get(task.goalId) : undefined;
  return p ? p.percentComplete : -1;
}

/** Filter a curator's tasks by status + the semantic toggles. Pure. */
export function filterTasks(
  tasks: TaskProposal[],
  filter: TaskFilter,
  progressByGoal: Map<string, GoalProgress>,
): TaskProposal[] {
  return tasks.filter((task) => {
    if (!filter.statuses.includes(task.status)) return false;
    if (filter.seekingFunding) {
      const p = task.goalId ? progressByGoal.get(task.goalId) : undefined;
      if (!p || p.isGoalMet) return false;
    }
    if (filter.needsWorker && (task.status !== 'funded' || task.workerPubkey)) return false;
    return true;
  });
}

/** Sort tasks by the chosen key (returns a new array). Pure. */
export function sortTasks(
  tasks: TaskProposal[],
  sort: TaskSort,
  progressByGoal: Map<string, GoalProgress>,
): TaskProposal[] {
  const sorted = [...tasks];
  if (sort === 'amount') {
    sorted.sort((a, b) => (parseInt(b.amount, 10) || 0) - (parseInt(a.amount, 10) || 0));
  } else if (sort === 'funding') {
    sorted.sort((a, b) => {
      const d = fundingPct(b, progressByGoal) - fundingPct(a, progressByGoal);
      return d !== 0 ? d : b.created_at - a.created_at;
    });
  } else {
    sorted.sort((a, b) => b.created_at - a.created_at); // newest
  }
  return sorted;
}
