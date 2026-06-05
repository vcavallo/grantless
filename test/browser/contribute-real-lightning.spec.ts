import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, ALICE, BOB } from './helpers';
import { query } from '../e2e/harness';
import { RELAY_URL } from '../e2e/relay';

// Story 13 / ADR 0012 — real Lightning contributions.
// What's automatable against the seeded local strfry is the NO-THEATER guarantee:
// seeded arbiters have no Lightning address (their kind-0 carries only name/about),
// so contributing must honestly refuse and publish NO zap receipt. Actually moving
// sats needs a real wallet + LNURL backend → MANUAL verification (see the test plan).
// Failing until the contribute path is rebuilt: today it publishes a mock 9735.

const KIND = 33401;
const naddr = (patronPub: string, d: string) => nip19.naddrEncode({ kind: KIND, pubkey: patronPub, identifier: d });

test('contributing when the arbiter has no Lightning address is honest and publishes no receipt', async ({ page }) => {
  // Alice is not a seeded funder, so she has authored zero 9735s — a clean "did we fake it?" probe.
  await loginAs(page, ALICE);
  // seed-funded-bob has a real 9041 goal; its arbiter (Erin) has no lud16/lud06 in the seed.
  await page.goto(`/task/${naddr(BOB.pub, 'seed-funded-bob')}`);

  await page.getByRole('button', { name: /^contribute$/i }).click();

  // The dialog must say a real contribution isn't possible — not pretend it worked.
  await expect(page.getByText(/lightning address/i)).toBeVisible({ timeout: 15_000 });
  // And it must NOT show the old mock-success path.
  await expect(page.getByText(/contribution sent/i)).toHaveCount(0);

  // No-theater: the acting user published no zap receipt.
  const receipts = await query(RELAY_URL, { kinds: [9735], authors: [ALICE.pub] });
  expect(receipts.length, 'Alice (the contributor) published no 9735').toBe(0);
});
