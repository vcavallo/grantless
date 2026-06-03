import { test, expect } from '@playwright/test';
import { loginAs, selectCurator, ALICE } from './helpers';

// Browse coverage + the persisted-session regression guard.
test.describe('curator browse', () => {
  test('a fresh visit shows the curator picker and resolves the seeded applicants', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No curators found')).toHaveCount(0);
    await expect(page.getByText('Browse a curator')).toBeVisible();
    await selectCurator(page);
    // The seeded applicants render (Alice has projects from the seed).
    await expect(page.getByText(ALICE.name).first()).toBeVisible({ timeout: 15_000 });
  });

  test('a returning session with a stale relay config + a logged-in account still finds curators', async ({ page }) => {
    // Simulate the reported regression scenario: prior non-local relay config + logged in.
    await loginAs(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'nostr:app-config',
        JSON.stringify({ theme: 'light', relayUrl: 'wss://relay.primal.net', relayMode: 'default' }),
      );
    });
    await page.goto('/');
    // RelayEnvOverride must repoint at the local relay so discovery still works.
    await expect(page.getByText('No curators found')).toHaveCount(0);
    await expect(page.getByText('Browse a curator')).toBeVisible({ timeout: 15_000 });
  });
});
