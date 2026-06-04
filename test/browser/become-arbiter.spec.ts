import { test, expect } from '@playwright/test';
import { loginAs, ALICE, DAVE } from './helpers';
import { query } from '../e2e/harness';
import { RELAY_URL } from '../e2e/relay';
import { CATALLAX_KINDS } from '@/lib/catallax';

// Story 12 / ADR 0011 — the first-class "Become an Arbiter" flow.
// Real-event e2e: drives the real browser against the seeded local strfry and
// asserts a real kind-33400 lands on the relay (not a mock). Failing until the
// BecomeArbiterDialog + builder + About CTA exist.

test('logged-out: the Become an Arbiter flow prompts login and publishes no announcement', async ({ page }) => {
  await page.goto('/?compose=arbiter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  // A login prompt, not the form — no signer, no publish.
  await expect(dialog.getByText(/log in/i)).toBeVisible();
  await expect(dialog.getByLabel(/service name/i)).toHaveCount(0);
});

test('a logged-in user announces an arbiter service, lands a real 33400, and is told they are not yet selectable', async ({ page }) => {
  await loginAs(page, ALICE);
  await page.goto('/?compose=arbiter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });

  const name = `Playwright Arbiter ${Date.now()}`;
  await dialog.getByLabel(/service name/i).fill(name);
  // Choose a flat fee so the amount is plain sats.
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: /flat/i }).click();
  await dialog.getByLabel(/fee amount/i).fill('12345');
  await dialog.getByRole('button', { name: /announce|publish/i }).click();

  // The "announced — but not yet selectable" panel, with a pointer to how vouching works.
  await expect(page.getByText(/not yet (selectable|vouched)|curator.*vouch|vouch/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /about|how/i })).toBeVisible();

  // A real 33400 authored by Alice carrying that service name is now on the relay.
  const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.ARBITER_ANNOUNCEMENT], authors: [ALICE.pub] });
  expect(events.some((e) => e.content.includes(name)), 'a real 33400 with the submitted name').toBe(true);
});

test('an arbiter who already announced sees the entry point reflect it (not "become")', async ({ page }) => {
  await loginAs(page, DAVE); // a seeded arbiter — already has a 33400 service
  await page.goto('/');
  // The trigger acknowledges the existing service rather than implying none.
  await expect(
    page.getByRole('button', { name: /update arbiter service|arbiter service.*✓|announced/i }),
  ).toBeVisible({ timeout: 15_000 });
});

test('the About page CTA leads into the Become an Arbiter flow', async ({ page }) => {
  await loginAs(page, ALICE);
  await page.goto('/about');
  await page.getByRole('link', { name: /become an arbiter/i }).click();
  await expect(page).toHaveURL(/compose=arbiter/);
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
});
