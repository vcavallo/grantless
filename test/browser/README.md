# Browser e2e (Playwright)

Drives the real app in a headless browser against the **seeded local relay**, so the
rendered flows (browse, login, post a project, assign an arbiter) are covered by
tests instead of manual checking.

```sh
npm run test:browser
```

The Playwright `webServer` brings the relay up, runs `npm run seed`, and starts Vite
pointed at the local relay (`VITE_RELAY_URL=ws://127.0.0.1:7787`) on **port 8123**
(8080/8081 are often occupied in this dev environment). It reuses an already-running
server if one is on 8123.

## Browser binary

`npm run test:browser` uses Playwright's bundled Chromium by default. On systems where
that won't run (e.g. **NixOS**, which lacks the expected shared libraries), point it at
a working Chromium:

```sh
# NixOS: a playwright-driver browser from the nix store
export PLAYWRIGHT_CHROMIUM_PATH=$(ls /nix/store/*playwright-chromium/chrome-linux/chrome | head -1)
npm run test:browser
```

`PLAYWRIGHT_CHROMIUM_PATH` is read by `playwright.config.ts` as the Chromium
`executablePath`; unset, the bundled browser is used.

## Notes

- These specs are excluded from the fast unit gate (`npm test`) and the nak e2e
  (`npm run test:e2e`); they run only here.
- `helpers.ts` logs in by injecting the saved-login shape (decoupled from the login
  UI, which `login.spec.ts` tests on its own) and reuses the fixed seed roster from
  `../seed/accounts.ts`.
