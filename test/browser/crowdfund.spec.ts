import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, ALICE, BOB } from './helpers';
import { ROSTER } from '../seed/accounts';

const KIND = 33401;
const naddr = (patronPub: string, d: string) => nip19.naddrEncode({ kind: KIND, pubkey: patronPub, identifier: d });

test('patron opens a project for funding, then it shows a contribute affordance', async ({ page }) => {
  await loginAs(page, ALICE);
  // seed-proposed-alice is proposed with arbiter Dave and no goal yet.
  await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
  await page.getByRole('button', { name: /open for funding/i }).click();
  // Once the goal exists, a contribute control appears.
  await expect(page.getByRole('button', { name: /^contribute$/i })).toBeVisible({ timeout: 15_000 });
});

test('a funder can contribute to a goal', async ({ page }) => {
  await loginAs(page, ROSTER.funders[0]); // Frank
  // seed-funded-bob already has a 9041 goal (seeded) with contributions.
  await page.goto(`/task/${naddr(BOB.pub, 'seed-funded-bob')}`);
  await page.getByPlaceholder(/amount in sats/i).fill('500');
  await page.getByRole('button', { name: /^contribute$/i }).click();
  await expect(page.getByText(/contribution sent/i)).toBeVisible({ timeout: 15_000 });
});
