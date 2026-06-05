import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, selectCurator, ALICE, BOB, CLEO } from './helpers';
import { ROSTER } from '../seed/accounts';

// Story 14 / ADR 0013 — contributor visibility. Real events vs the seeded relay:
// seed-funded-bob has a 9041 goal funded by ROSTER.funders (mock 9735s whose
// description embeds the funder pubkey, so parseZapReceiptSender attributes them).
// Failing until the contributor UIs + /c/:npub/contributors page exist.

const KIND = 33401;
const naddr = (patronPub: string, d: string) => nip19.naddrEncode({ kind: KIND, pubkey: patronPub, identifier: d });
const FRANK = ROSTER.funders[0]; // 'Frank (Funder)'

test("a project's crowdfund shows contributors and expands to names + amounts + copyable npub", async ({ page }) => {
  await loginAs(page, ALICE);
  await page.goto(`/task/${naddr(BOB.pub, 'seed-funded-bob')}`);

  // Collapsed: a contributor count/affordance is visible (3 seeded funders).
  const expander = page.getByRole('button', { name: /contributor/i });
  await expect(expander.first()).toBeVisible({ timeout: 15_000 });
  await expander.first().click();

  // Expanded: a funder's name, and a copy-npub control.
  await expect(page.getByText(/Frank/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
});

test('the curator-wide contributors page lists ranked contributors', async ({ page }) => {
  await page.goto(`/c/${nip19.npubEncode(CLEO.pub)}/contributors`);
  // The seeded funders show up as contributors across Cleo's projects.
  await expect(page.getByText(new RegExp(FRANK.name.split(' ')[0], 'i')).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
});

test('the curator browse links to the contributors page', async ({ page }) => {
  await page.goto('/');
  await selectCurator(page, CLEO.name);
  await page.getByRole('link', { name: /contributors/i }).click();
  await expect(page).toHaveURL(/\/c\/.*\/contributors/);
  await expect(page.getByText(new RegExp(FRANK.name.split(' ')[0], 'i')).first()).toBeVisible({ timeout: 15_000 });
});
