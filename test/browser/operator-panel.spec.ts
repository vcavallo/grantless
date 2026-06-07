import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';
import { ROSTER } from '../seed/accounts';

// Story 16 — operator helper panel (stuck-project diagnostics). Outer-ring e2e
// against the seeded local relay. This is the authoritative red for the gating +
// UI acceptance criteria; the pure detection logic is unit-tested separately
// (src/lib/grantless.stuck.test.ts, grantless.operator.test.ts).
//
// REQUIRED test-infra (Implementer / Test Design hand-off):
//   1. Playwright `webServer` command exports VITE_GRANTLESS_OPERATOR=<OPERATOR npub>
//      so the app recognizes the operator account below. (No other spec logs in as
//      this account, so it doesn't affect them.)
//   2. Seed (test/seed/) includes, deterministically:
//        - an UNVOUCHED non-concluded crowdfunding project — authored by a roster
//          pubkey in NO grantless-applicants list (Carol the worker is used here);
//        - an ARBITER-LESS non-concluded project — a `proposed` task with no arbiter.
//
// OPERATOR is an ordinary seeded key chosen purely via env — nothing about it is
// privileged. This is the fork test: any pubkey set in VITE_GRANTLESS_OPERATOR works.
const OPERATOR = ROSTER.funders[0]; // Frank — the configured operator for e2e
const NON_OPERATOR = ROSTER.applicants[0]; // Alice — an ordinary logged-in user
const UNVOUCHED_CREATOR = ROSTER.worker; // Carol — in no applicant list

const adminLink = (page: import('@playwright/test').Page) =>
  page.getByRole('link', { name: /admin/i });

test.describe('operator helper panel — gating', () => {
  test('operator sees the Admin link and can open the panel', async ({ page }) => {
    await loginAs(page, OPERATOR);
    await page.goto('/');
    await expect(adminLink(page)).toBeVisible({ timeout: 15_000 });
    await adminLink(page).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/not vouched/i)).toBeVisible();
    await expect(page.getByText(/no arbiter/i)).toBeVisible();
  });

  test('a logged-in non-operator sees no Admin link and /admin is NotFound', async ({ page }) => {
    await loginAs(page, NON_OPERATOR);
    await page.goto('/');
    await expect(adminLink(page)).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByText(/not vouched/i)).toHaveCount(0);
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('a logged-out visitor sees no Admin link and /admin is NotFound', async ({ page }) => {
    await page.goto('/');
    await expect(adminLink(page)).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByText(/not vouched/i)).toHaveCount(0);
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

test.describe('operator helper panel — diagnostics', () => {
  test('the seeded unvouched project appears under "not vouched", with title, status, reason, creator and a task link', async ({ page }) => {
    await loginAs(page, OPERATOR);
    await page.goto('/admin');

    const section = page.getByRole('region', { name: /not vouched/i })
      .or(page.locator('section', { hasText: /not vouched/i }));
    // The unvouched creator (Carol) is surfaced so the operator can reach out.
    await expect(page.getByText(UNVOUCHED_CREATOR.name).first()).toBeVisible({ timeout: 15_000 });
    // Each stuck row links to the project's detail page.
    await expect(section.getByRole('link').first()).toHaveAttribute('href', /\/task\//);
  });

  test('the seeded arbiter-less project appears under "no arbiter"', async ({ page }) => {
    await loginAs(page, OPERATOR);
    await page.goto('/admin');
    const section = page.getByRole('region', { name: /no arbiter/i })
      .or(page.locator('section', { hasText: /no arbiter/i }));
    await expect(section.getByRole('link').first()).toHaveAttribute('href', /\/task\//);
  });

  test('the panel exposes no publish/edit/delete controls (read-only)', async ({ page }) => {
    await loginAs(page, OPERATOR);
    await page.goto('/admin');
    await expect(page.getByText(/not vouched/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /publish|delete|remove|edit|assign|conclude|save/i })).toHaveCount(0);
  });
});
