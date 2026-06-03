import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test('the browse header shows a login control when logged out', async ({ page }) => {
  await page.goto('/');
  // A visible login affordance must exist without opening the Post-a-project dialog.
  await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
});

test('a logged-in user sees their account in the header, not a login button', async ({ page }) => {
  await loginAs(page);
  await page.goto('/');
  // The account switcher replaces the login button once logged in.
  await expect(page.getByRole('button', { name: /^log in$/i })).toHaveCount(0);
});
