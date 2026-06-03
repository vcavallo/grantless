import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test('a logged-in user can post a project', async ({ page }) => {
  await loginAs(page);
  await page.goto('/');
  await page.getByRole('button', { name: /post a project/i }).click();

  await page.getByPlaceholder(/reproducible builds/i).fill('Playwright test project');
  await page.getByPlaceholder('What is this project?').fill('A project posted by the browser test.');
  await page.getByPlaceholder(/done.*look like/i).fill('It exists on the relay.');
  await page.getByPlaceholder('75000').fill('12345');

  await page.getByRole('button', { name: /post project/i }).click();
  await expect(page.getByText(/project posted/i).first()).toBeVisible({ timeout: 15_000 });
});
