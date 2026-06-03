import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { selectCurator, CLEO, QUINN, ALICE, BOB } from './helpers';

test('a funding-state project card shows funding progress', async ({ page }) => {
  await page.goto('/');
  await selectCurator(page, CLEO.name);
  // seed-funded-bob is funded with a seeded goal + contributions → a backer count shows.
  await expect(page.getByText(/backer/i).first()).toBeVisible({ timeout: 15_000 });
});

test('concluded projects are hidden by default', async ({ page }) => {
  await page.goto('/');
  await selectCurator(page, CLEO.name);
  await expect(page.getByText(ALICE.name).first()).toBeVisible({ timeout: 15_000 });
  // seed-concluded-alice's title must not be visible by default…
  await expect(page.getByText('NIP-44 encryption migration')).toHaveCount(0);
  // …until the concluded status chip is enabled.
  await page.getByRole('button', { name: /^concluded$/i }).click();
  await expect(page.getByText('NIP-44 encryption migration')).toBeVisible({ timeout: 15_000 });
});

test('the "needs a worker" filter narrows to funded, unassigned projects', async ({ page }) => {
  await page.goto('/');
  await selectCurator(page, CLEO.name);
  await page.getByRole('switch', { name: /needs a worker/i }).click();
  await expect(page.getByText('Accessibility pass on the onboarding flow')).toBeVisible({ timeout: 15_000 }); // seed-funded-bob (funded, no worker)
  await expect(page.getByText('Offline-first sync for notes')).toHaveCount(0); // seed-inprogress-alice (in_progress)
});

test('/c/:npub deep-links to a curator', async ({ page }) => {
  await page.goto(`/c/${nip19.npubEncode(QUINN.pub)}`);
  // Quinn vouches for Bob only (not Alice).
  await expect(page.getByText(BOB.name).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(ALICE.name)).toHaveCount(0);
});
