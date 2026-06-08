import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, rememberCurator, ALICE } from './helpers';
import { ROSTER } from '../seed/accounts';

// Story 18 — patron edits a proposed task. Outer-ring e2e against the seeded relay.
// The pure gating/parse rules are unit-tested (src/lib/grantless.editTask.test.ts);
// this spec covers the edit UI, amount lock, open-for-funding confirmation, and the
// optional deadline. Authoritative red for the implementer; not run in this NixOS env.
//
// Seed fixtures used (no changes needed):
//   • seed-proposed-alice — proposed, arbiter Dave, NO goal → amount editable + open-for-funding
//   • seed-seeking-alice   — proposed, HAS a goal (openForFunding) → amount locked
//   • seed-inprogress-alice — in_progress → not editable (past proposed)

const KIND = 33401;
const naddr = (patronPub: string, d: string) => nip19.naddrEncode({ kind: KIND, pubkey: patronPub, identifier: d });
const editButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /edit/i });

test.describe('edit affordance gating', () => {
  test('patron sees Edit on their proposed task', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    await expect(page.getByText('Patron').first()).toBeVisible({ timeout: 15_000 });
    await expect(editButton(page)).toBeVisible();
  });

  test('a non-patron sees no Edit', async ({ page }) => {
    await loginAs(page, ROSTER.funders[0]); // not the patron
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    await expect(page.getByText('Patron').first()).toBeVisible({ timeout: 15_000 });
    await expect(editButton(page)).toHaveCount(0);
  });

  test('a non-proposed task offers no Edit (even to the patron)', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-inprogress-alice')}`);
    await expect(page.getByText('Patron').first()).toBeVisible({ timeout: 15_000 });
    await expect(editButton(page)).toHaveCount(0);
  });
});

test.describe('editing fields', () => {
  test('editing the description re-publishes and the detail page reflects it', async ({ page }) => {
    await loginAs(page, ALICE);
    await rememberCurator(page);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    await editButton(page).click();
    const desc = page.getByLabel(/description/i);
    await desc.fill('Edited description for the wallet builds');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('Edited description for the wallet builds')).toBeVisible({ timeout: 15_000 });
  });

  test('amount is editable on a proposed task with no goal', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    await editButton(page).click();
    await expect(page.getByLabel(/amount|funding target/i)).toBeEnabled();
  });

  test('amount is disabled with a reason on a task that has opened for funding', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-seeking-alice')}`);
    await editButton(page).click();
    await expect(page.getByLabel(/amount|funding target/i)).toBeDisabled();
    await expect(page.getByText(/can'?t be changed|locked|funding (is )?open/i)).toBeVisible();
  });

  test('clearing the title blocks save with an error', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    await editButton(page).click();
    await page.getByLabel(/title/i).fill('');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test('setting a deadline shows it; a task with no deadline shows none', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    // No deadline seeded → none shown.
    await expect(page.getByText(/deadline/i)).toHaveCount(0);
    await editButton(page).click();
    await page.getByLabel(/deadline/i).fill('2030-01-01');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/deadline/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('open-for-funding confirmation', () => {
  test('opening for funding asks to confirm that the amount will lock', async ({ page }) => {
    await loginAs(page, ALICE);
    await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
    await page.getByRole('button', { name: /open for funding/i }).click();
    // A confirmation warns the amount locks; cancelling leaves no goal.
    await expect(page.getByText(/amount.*(lock|can'?t be changed)/i)).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    // Still offering "Open for funding" → no goal was created.
    await expect(page.getByRole('button', { name: /open for funding/i })).toBeVisible();
  });
});
