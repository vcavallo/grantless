import { describe, it, expect } from 'vitest';
import type { NostrEvent } from '@nostrify/nostrify';
import type { ArbiterAnnouncement } from './catallax';
import {
  GRANTLESS_ARBITER_SLUG,
  GRANTLESS_APPLICANTS_SLUG,
  selectArbiterCandidates,
  resolveCuratorApplicants,
  type ArbiterCandidate,
} from './grantless';

// Unit tests for Story 6's arbiter-candidate selection and the arbiter-slug
// resolution. Pure: no relay.

const C1 = 'c1'.padEnd(64, '0');
const ARB1 = 'arb1'.padEnd(64, '0');
const ARB2 = 'arb2'.padEnd(64, '0');
const APP1 = 'app1'.padEnd(64, '0');

let seq = 0;
function announcement(o: { arbiterPubkey: string; d: string; name: string; createdAt: number }): ArbiterAnnouncement {
  seq += 1;
  return {
    id: `ann-${seq}`,
    pubkey: o.arbiterPubkey,
    created_at: o.createdAt,
    content: { name: o.name },
    d: o.d,
    arbiterPubkey: o.arbiterPubkey,
    categories: [],
    feeType: 'flat',
    feeAmount: '1000',
  };
}

function listEvent(o: { observer: string; slug: string; members: string[]; createdAt: number }): NostrEvent {
  seq += 1;
  return {
    id: `evt-${seq}`,
    pubkey: 'ta'.padEnd(64, '0'),
    created_at: o.createdAt,
    kind: 30392,
    content: '',
    sig: '',
    tags: [
      ['d', `tl-${o.slug}`],
      ['observer', o.observer],
      ['source-tag', 'srctag', o.observer, o.slug],
      ...o.members.map((m) => ['p', m]),
    ],
  };
}

describe('selectArbiterCandidates', () => {
  it('emits a candidate per list member that has a 33400, in member order, with the service coord', () => {
    const candidates = selectArbiterCandidates(
      [ARB1, ARB2],
      [
        announcement({ arbiterPubkey: ARB1, d: 'svc-a', name: 'Dave', createdAt: 10 }),
        announcement({ arbiterPubkey: ARB2, d: 'svc-b', name: 'Erin', createdAt: 11 }),
      ],
    );
    expect(candidates).toEqual<ArbiterCandidate[]>([
      { pubkey: ARB1, serviceD: 'svc-a', serviceCoord: `33400:${ARB1}:svc-a`, name: 'Dave' },
      { pubkey: ARB2, serviceD: 'svc-b', serviceCoord: `33400:${ARB2}:svc-b`, name: 'Erin' },
    ]);
  });

  it('drops list members that have no arbiter announcement', () => {
    const candidates = selectArbiterCandidates(
      [ARB1, ARB2],
      [announcement({ arbiterPubkey: ARB1, d: 'svc-a', name: 'Dave', createdAt: 10 })],
    );
    expect(candidates.map((c) => c.pubkey)).toEqual([ARB1]);
  });

  it('picks the latest announcement when a member has several', () => {
    const candidates = selectArbiterCandidates(
      [ARB1],
      [
        announcement({ arbiterPubkey: ARB1, d: 'old', name: 'Dave old', createdAt: 10 }),
        announcement({ arbiterPubkey: ARB1, d: 'new', name: 'Dave new', createdAt: 20 }),
      ],
    );
    expect(candidates).toEqual<ArbiterCandidate[]>([
      { pubkey: ARB1, serviceD: 'new', serviceCoord: `33400:${ARB1}:new`, name: 'Dave new' },
    ]);
  });

  it('ignores announcements from non-members', () => {
    const candidates = selectArbiterCandidates(
      [ARB1],
      [
        announcement({ arbiterPubkey: ARB1, d: 'svc-a', name: 'Dave', createdAt: 10 }),
        announcement({ arbiterPubkey: ARB2, d: 'svc-b', name: 'Erin', createdAt: 11 }),
      ],
    );
    expect(candidates.map((c) => c.pubkey)).toEqual([ARB1]);
  });
});

describe('resolveCuratorApplicants with the arbiter slug', () => {
  it('resolves the grantless-arbiter list, separate from the applicants list', () => {
    const events = [
      listEvent({ observer: C1, slug: GRANTLESS_APPLICANTS_SLUG, members: [APP1], createdAt: 1 }),
      listEvent({ observer: C1, slug: GRANTLESS_ARBITER_SLUG, members: [ARB1, ARB2], createdAt: 2 }),
    ];
    expect(resolveCuratorApplicants(events, C1, GRANTLESS_ARBITER_SLUG)).toEqual([ARB1, ARB2]);
    expect(resolveCuratorApplicants(events, C1, GRANTLESS_APPLICANTS_SLUG)).toEqual([APP1]);
  });
});
