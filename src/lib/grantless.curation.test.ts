import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import {
  GRANTLESS_APPLICANTS_SLUG,
  parseCurationList,
  applicantCurationLists,
  distinctCurators,
  applicantsForCurator,
  resolveCuratorApplicants,
  parseConfiguredCurators,
} from './grantless';

// Pure unit tests for the curation resolver (the heart of Story 4). No relay:
// the functions take event arrays, so they're testable in the fast gate.

let seq = 0;
function listEvent(o: {
  observer: string;
  slug: string;
  members: string[];
  createdAt: number;
  signer?: string;
}): NostrEvent {
  seq += 1;
  return {
    id: `evt-${seq}`,
    // The list is signed by a list-publishing agent (TA), NOT the curator.
    pubkey: o.signer ?? 'ta-pubkey-0000000000000000000000000000000000000000000000000000000000',
    created_at: o.createdAt,
    kind: 30392,
    content: '',
    sig: '',
    tags: [
      ['d', `tl-pin-test-${o.slug}-${o.observer.slice(0, 8)}`],
      ['title', o.slug],
      ['observer', o.observer],
      ['source-tag', 'srctag-id', o.observer, o.slug],
      ...o.members.map((m) => ['p', m]),
    ],
  };
}

const C1 = 'c1'.padEnd(64, '0');
const C2 = 'c2'.padEnd(64, '0');
const A1 = 'a1'.padEnd(64, '0');
const A2 = 'a2'.padEnd(64, '0');
const A3 = 'a3'.padEnd(64, '0');

describe('parseCurationList', () => {
  it('reads observer, slug, and members from a 30392', () => {
    const list = parseCurationList(listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1, A2], createdAt: 100 }));
    expect(list).toMatchObject({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1, A2], createdAt: 100 });
  });

  it('dedupes members in p-tag order (first occurrence wins)', () => {
    const list = parseCurationList(listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1, A2, A1], createdAt: 1 }));
    expect(list?.members).toEqual([A1, A2]);
  });

  it('returns null when the observer tag is missing', () => {
    const e = listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 1 });
    e.tags = e.tags.filter((t) => t[0] !== 'observer');
    expect(parseCurationList(e)).toBeNull();
  });

  it('returns null when the source-tag slug is missing', () => {
    const e = listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 1 });
    e.tags = e.tags.filter((t) => t[0] !== 'source-tag');
    expect(parseCurationList(e)).toBeNull();
  });

  it('returns null for a non-30392 event', () => {
    const e = listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 1 });
    e.kind = 30000;
    expect(parseCurationList(e)).toBeNull();
  });
});

describe('applicantCurationLists', () => {
  it('keeps only grantless-applicants lists, dropping other slugs', () => {
    const events = [
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 1 }),
      listEvent({ observer: C1, slug: 'grantless-arbiter', members: [A2], createdAt: 2 }),
    ];
    const lists = applicantCurationLists(events);
    expect(lists).toHaveLength(1);
    expect(lists[0].slug).toBe(GRANTLESS_APPLICANTS_SLUG);
  });
});

describe('distinctCurators', () => {
  it('returns the distinct observers', () => {
    const lists = applicantCurationLists([
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 1 }),
      listEvent({ observer: C2, slug: GRANTLESS_APPLICANTS_SLUG, members: [A2], createdAt: 2 }),
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1, A2], createdAt: 3 }),
    ]);
    expect([...distinctCurators(lists)].sort()).toEqual([C1, C2].sort());
  });
});

describe('applicantsForCurator / resolveCuratorApplicants', () => {
  it('returns the latest list members for the selected curator, even out of created_at order', () => {
    const events = [
      // newer first in the array, older second — created_at must decide.
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1, A2, A3], createdAt: 200, signer: 'ta-A' }),
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 100, signer: 'ta-B' }),
    ];
    expect(resolveCuratorApplicants(events, C1)).toEqual([A1, A2, A3]);
  });

  it('returns only the selected curator’s members', () => {
    const events = [
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1, A2], createdAt: 1 }),
      listEvent({ observer: C2, slug: GRANTLESS_APPLICANTS_SLUG, members: [A3], createdAt: 2 }),
    ];
    expect(resolveCuratorApplicants(events, C2)).toEqual([A3]);
  });

  it('resolves a TA-signed list by observer, never by signer', () => {
    // The list is signed by the TA, observed by C1. Resolving C1 finds it;
    // resolving the TA's own pubkey finds nothing (signer is not an observer).
    const events = [listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [A1], createdAt: 1, signer: 'ta-signer' })];
    expect(resolveCuratorApplicants(events, C1)).toEqual([A1]);
    expect(resolveCuratorApplicants(events, 'ta-signer')).toEqual([]);
  });

  it('returns [] for a curator with no list', () => {
    expect(resolveCuratorApplicants([], C1)).toEqual([]);
    expect(applicantsForCurator([], C1)).toEqual([]);
  });
});

describe('parseConfiguredCurators', () => {
  it('decodes npubs and accepts raw hex, dropping junk', () => {
    const npub = nip19.npubEncode(C1);
    const result = parseConfiguredCurators(`${npub}, ${C2} , not-a-key`);
    expect(result).toEqual([C1, C2]);
  });

  it('returns [] for empty or undefined input', () => {
    expect(parseConfiguredCurators(undefined)).toEqual([]);
    expect(parseConfiguredCurators('')).toEqual([]);
    expect(parseConfiguredCurators('   ')).toEqual([]);
  });
});
