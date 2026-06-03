import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import { parsePubkey } from './grantless';

const HEX = 'ab'.padEnd(64, '0');

describe('parsePubkey', () => {
  it('decodes an npub to hex', () => {
    expect(parsePubkey(nip19.npubEncode(HEX))).toBe(HEX);
  });

  it('accepts a 64-char hex pubkey (normalized lowercase, trimmed)', () => {
    expect(parsePubkey(`  ${HEX.toUpperCase()}  `)).toBe(HEX);
  });

  it('returns null for junk, empty, or an nsec', () => {
    expect(parsePubkey('not-a-key')).toBeNull();
    expect(parsePubkey('')).toBeNull();
    expect(parsePubkey('   ')).toBeNull();
    // nsec must not be accepted as a pubkey
    const nsec = nip19.nsecEncode(new Uint8Array(32).fill(1));
    expect(parsePubkey(nsec)).toBeNull();
  });
});
