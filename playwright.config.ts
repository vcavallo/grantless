import { defineConfig, devices } from '@playwright/test';

// On systems where Playwright's bundled browser won't run (e.g. NixOS, which lacks
// the expected shared libraries), point this at a working Chromium via
// PLAYWRIGHT_CHROMIUM_PATH (on NixOS: a `playwright-driver.browsers` chrome). When
// unset, Playwright uses its bundled browser as usual.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

// Browser e2e: drives the real app against the seeded local strfry. Run with
// `npm run test:browser`. The webServer brings the relay up, seeds it, and starts
// Vite pointed at the local relay; teardown stops Vite (relay via `relay:down`).
export default defineConfig({
  testDir: './test/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:8123',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run relay:up && npm run seed && VITE_RELAY_URL=ws://127.0.0.1:7787 vite --port 8123 --strictPort',
    url: 'http://127.0.0.1:8123',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
  ],
});
