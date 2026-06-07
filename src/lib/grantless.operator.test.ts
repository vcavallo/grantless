import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
// Story 16: the operator pubkey(s) come from a comma-separated env value (npub or
// hex). Pure parsing — no relay. parseOperatorPubkeys does not yet exist; these
// tests are the red.
import { parseOperatorPubkeys } from './grantless';

const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const NPUB_A = nip19.npubEncode(HEX_A);
const NPUB_B = nip19.npubEncode(HEX_B);

describe('parseOperatorPubkeys', () => {
  it('returns [] for undefined, empty, or whitespace-only input (no operator ⇒ panel hidden for all)', () => {
    expect(parseOperatorPubkeys(undefined)).toEqual([]);
    expect(parseOperatorPubkeys('')).toEqual([]);
    expect(parseOperatorPubkeys('   ')).toEqual([]);
  });

  it('parses a single npub to its hex pubkey', () => {
    expect(parseOperatorPubkeys(NPUB_A)).toEqual([HEX_A]);
  });

  it('parses a single hex pubkey (normalized to lowercase)', () => {
    expect(parseOperatorPubkeys(HEX_A.toUpperCase())).toEqual([HEX_A]);
  });

  it('treats the npub and hex forms of a key identically — no form is privileged', () => {
    expect(parseOperatorPubkeys(NPUB_A)).toEqual(parseOperatorPubkeys(HEX_A));
  });

  it('accepts ANY key as operator — there is no built-in/special-cased identity', () => {
    // Two arbitrary, distinct keys both parse cleanly; nothing is hardcoded.
    expect(parseOperatorPubkeys(NPUB_A)).toEqual([HEX_A]);
    expect(parseOperatorPubkeys(NPUB_B)).toEqual([HEX_B]);
  });

  it('parses a comma-separated mix, dedupes, drops invalid tokens, tolerates whitespace', () => {
    const raw = `  ${NPUB_A} , ${HEX_B} , ${HEX_A} , not-a-key ,  `;
    const result = parseOperatorPubkeys(raw);
    expect(result).toEqual([HEX_A, HEX_B]); // A once (npub+hex dedup), B once, invalid dropped
  });
});
