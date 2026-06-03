import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, rememberCurator, selectCurator, ALICE } from './helpers';

const CATALLAX_TASK_KIND = 33401;

test('the patron can assign an arbiter from the browse card', async ({ page }) => {
  await loginAs(page, ALICE);
  await page.goto('/');
  await selectCurator(page);
  // Alice's own project cards offer the arbiter assign/change control.
  await expect(page.getByRole('button', { name: /^(assign|change)$/i }).first()).toBeVisible({ timeout: 15_000 });
});

test('the patron can manage the arbiter from the task detail page', async ({ page }) => {
  await loginAs(page, ALICE);
  await rememberCurator(page); // detail page derives arbiter options from the remembered curator
  const naddr = nip19.naddrEncode({
    kind: CATALLAX_TASK_KIND,
    pubkey: ALICE.pub,
    identifier: 'seed-proposed-alice', // a seeded proposed (arbiter-less) project by Alice
  });
  await page.goto(`/task/${naddr}`);
  // The assign/change-arbiter control must be present on the detail page for the patron.
  await expect(page.getByRole('button', { name: /^(assign|change)$/i }).first()).toBeVisible({ timeout: 15_000 });
});
