import { describe, it, expect } from 'vitest';
import { getPublicKey, nip19 } from 'nostr-tools';
import { ROSTER, type SeedAccount } from './accounts';

// Unit-level checks on the fixed dev roster. Pure: no relay, no nak, no Docker —
// these run in the fast `npm test` gate. They prove the committed fixtures are
// deterministic and internally consistent (sec → pub, pub ↔ npub, sec ↔ nsec),
// which is what makes the seed "always the same".

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function allAccounts(): SeedAccount[] {
  return [
    ROSTER.ta,
    ROSTER.curator,
    ...ROSTER.applicants,
    ROSTER.worker,
    ...ROSTER.arbiters,
    ...ROSTER.funders,
  ];
}

describe('dev seed roster (fixed accounts)', () => {
  it('has the cast the story specifies', () => {
    expect(ROSTER.applicants).toHaveLength(2);
    expect(ROSTER.arbiters).toHaveLength(2);
    expect(ROSTER.funders).toHaveLength(3);
    // 1 curator + 2 applicants + 1 worker + 2 arbiters + 3 funders + 1 list agent
    expect(allAccounts()).toHaveLength(10);
  });

  it('every account is a self-consistent keypair', () => {
    for (const acct of allAccounts()) {
      expect(acct.sec, `${acct.name} sec is 64-char hex`).toMatch(/^[0-9a-f]{64}$/);
      expect(acct.pub, `${acct.name} pub is 64-char hex`).toMatch(/^[0-9a-f]{64}$/);
      // sec → pub
      expect(getPublicKey(hexToBytes(acct.sec)), `${acct.name} pub derives from sec`).toBe(acct.pub);
      // pub ↔ npub, sec ↔ nsec (the forms a developer pastes into the signer)
      expect(acct.npub, `${acct.name} npub encodes pub`).toBe(nip19.npubEncode(acct.pub));
      expect(acct.nsec, `${acct.name} nsec encodes sec`).toBe(nip19.nsecEncode(hexToBytes(acct.sec)));
    }
  });

  it('all roles have distinct pubkeys', () => {
    const pubs = allAccounts().map((a) => a.pub);
    expect(new Set(pubs).size).toBe(pubs.length);
  });
});
