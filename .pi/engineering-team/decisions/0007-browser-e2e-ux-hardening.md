# ADR 0007: Browser e2e (Playwright) + UX hardening

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/2.5-browser-e2e-ux-hardening.md`

## Context

Story 2.5 stands up Playwright browser-e2e against the seeded relay and uses it to harden three issues found by manual testing: a persisted-session "No curators found" report, no visible login button, and the arbiter control living only on the browse index. The Architecture phase **reproduced the scenarios in a real browser first** (Playwright), which materially changed the plan — findings below.

**Environment findings (this box — NixOS, remote):**
- Playwright's **bundled** Chromium can't run (missing `libnspr4.so`; NixOS lacks the FHS libs and `playwright install-deps` has no `apt`). A NixOS-patched Chromium **does** exist in the nix store (`…-playwright-chromium/chrome-linux/chrome`); pointing Playwright at it via `executablePath` works.
- **Ports 8080 and 8081 are occupied** by another service here (a `302 → /manage` auth app — the source of the earlier `401`s). Vite must use a **free port** (8123 verified); `reuseExistingServer` against 8080 silently latched onto the wrong service.

**Regression investigation (the important part):** with the harness working, I drove the real app on the seeded relay across: fresh/empty storage; persisted `app-config` = `default`/primal, custom-local, custom-other (`relay.nostr.band`), `relayMode:'user'` (NIP-65), and a stale Tailscale-IP custom relay; and a **logged-in** session (log in as Alice, reload). **Every case rendered the curator picker correctly.** In each non-local case, `RelayEnvOverride` (commit `19bf2f4`) rewrote the persisted relay back to `custom`+`VITE_RELAY_URL` on load and curators resolved. **Conclusion: the current code already handles every persisted/logged-in state I can construct; the prior "No curators found" sighting was almost certainly a *stale pre-fix bundle*** (a session/`vite` process from before `RelayEnvOverride` landed, where a non-local persisted relay was never corrected — which exactly matches "works in incognito, fails in the returning session, in a previous build"). So Story 2.5 does **not** introduce a speculative relay fix; it **guards** these scenarios with browser tests and asks the user for the failing tab's `localStorage` if it ever recurs on current code.

**Existing assets:** `npm run seed` (Story 3) + the local strfry; `RelayEnvOverride`/`VITE_RELAY_URL`; `LoginArea` (logged-out → "Log in" button → `LoginDialog`); `AssignArbiterControl` + `useCuratorArbiterCandidates` (Story 6, reusable); `TaskDetail` (`/task/:naddr`) which already has the parsed latest `task`, `patronPubkey`, and an arbiter section; `useLocalStorage('grantless:lastCurator')` (Story 4) for the remembered curator.

**Constraints (`.pi/AGENTS.md`):** keep `npm test` (unit) and `npm run test:e2e` (nak) unchanged and Docker-light; no privileged actor; the harness is dev/test-only; portable config (don't hardcode a nix-store hash — use an env override).

## Options considered

### Option A — Playwright harness (nix-Chromium via env, free port, seed reuse) + guard the regression with specs + login button + reuse `AssignArbiterControl` on the detail page *(chosen)*
A `playwright.config.ts` with `webServer` = `relay:up → seed → vite --port 8123`, `baseURL` 8123, and `launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH` when set (NixOS), bundled browser otherwise. `npm run test:browser`. Specs: fresh + returning(persisted non-local config) + logged-in all render curators (the regression guard); login affordance present; post a project; assign arbiter (browse + detail). Add `<LoginArea>` to the `GrantlessBrowse` header. Mount the existing `AssignArbiterControl` on `TaskDetail`, curator context from `grantless:lastCurator`.
- **Pros:** real browser coverage of Stories 4–6; portable config; reuses the Story-6 control verbatim on the detail page; encodes the returning-session scenarios so the prior class of bug can't silently return; honest about the not-reproduced regression.
- **Cons:** Playwright on NixOS needs the `PLAYWRIGHT_CHROMIUM_PATH` env (documented); browser tests are slower and excluded from the fast gates.

### Option B — Ship a speculative relay "fix" anyway
Add more relay-config forcing logic to chase the unreproduced bug.
- **Cons:** can't verify a fix for a bug I can't reproduce; risks regressing the working `RelayEnvOverride`. **Rejected** — guard with tests; get the user's `localStorage` if it recurs.

### Option C — A bespoke "manage project" page instead of reusing `TaskDetail`
- **Cons:** large scope; `TaskDetail` already resolves the latest task + patron + arbiter and is where the browse links. **Rejected** — mount the existing control there.

## Decision

**Option A.** Stand up the Playwright harness (NixOS-compatible, free port, seeded), guard the returning-session scenarios with specs (the regression is already handled by `RelayEnvOverride`; tests lock it in), add the header login button, and reuse `AssignArbiterControl` on the task detail page with the remembered curator as context.

## Consequences

- **Real browser coverage** of browse/login/post/assign, runnable via `npm run test:browser`; the fast unit gate and nak e2e are untouched.
- **NixOS dependency:** browser tests need `PLAYWRIGHT_CHROMIUM_PATH` (a nix `playwright-driver.browsers` chrome). Documented in `test/browser/README.md` + `.env.example`. Elsewhere the bundled browser is used.
- The "No curators" regression gets a **permanent test guard**; if it recurs on current code, the next step is the user's `localStorage` (3 keys) to reproduce exactly — not a blind fix.
- A login button now exists in the header (no longer login-only-via-post).
- The arbiter can be managed from the task's own page; `AssignArbiterControl` is reused (no new arbiter logic). The detail page is not curator-scoped, so it uses the **remembered** curator; with none remembered it shows a hint to pick a curator on the browse page (keeps curator-vouched filtering; no unfiltered/all-arbiters fallback that would dodge curation).
- `@playwright/test` added as a devDependency; `playwright.config.ts`, `test/browser/`, `test-results/`, `playwright-report/` added (latter two gitignored).

## Implementation notes

- **`playwright.config.ts`**: `testDir: test/browser`, `workers: 1`, `baseURL: http://127.0.0.1:8123`, `headless`, `launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined`, `webServer.command = "npm run relay:up && npm run seed && VITE_RELAY_URL=ws://127.0.0.1:7787 vite --port 8123 --strictPort"`, `webServer.url = http://127.0.0.1:8123`, `reuseExistingServer: true`, generous timeouts.
- **`package.json`**: `"test:browser": "playwright test"`. (Document the `PLAYWRIGHT_CHROMIUM_PATH` env for NixOS; do **not** add it to the script so it stays portable.)
- **`.gitignore`**: add `test-results/`, `playwright-report/`, `/blob-report/`, `.playwright/`.
- **`test/browser/` specs**:
  - `curator-browse.spec.ts` — fresh load → the "Browse a curator" picker is present and no "No curators found"; selecting the seeded curator renders applicant cards. **Regression guard**: a test that seeds a non-local `nostr:app-config` (e.g. primal/default) + a logged-in account, reloads, and asserts curators still render (proves `RelayEnvOverride` recovery).
  - `login.spec.ts` — logged-out browse header shows a login control; opening it shows the `LoginDialog`; logging in with Alice's seed nsec shows the account.
  - `post-project.spec.ts` — logged in, "Post a project" → fill → submit → the project appears under the author (browsing the seeded curator).
  - `assign-arbiter.spec.ts` — logged in as the patron, assign a curator-vouched arbiter from the browse card and/or the detail page; the arbiter is surfaced.
  - A small `helpers.ts` (login via the seed nsec, select curator) shared by specs.
- **`src/pages/GrantlessBrowse.tsx`**: add `<LoginArea className="max-w-60" />` to the header actions (next to "Post a project"/dashboard).
- **`src/pages/TaskDetail.tsx`**: for the task's patron, render `<AssignArbiterControl task={task} curatorPubkey={rememberedCurator} />` in the management area, where `rememberedCurator = useLocalStorage('grantless:lastCurator', '')[0]`; when empty, the control already shows its "no arbiters available — pick a curator" hint. Also ensure the arbiter identity is shown (the page already has an arbiter section when `task.arbiterPubkey`).
- **`test/browser/README.md`** + **`.env.example`**: document `npm run test:browser`, the free-port choice, and `PLAYWRIGHT_CHROMIUM_PATH` for NixOS.

### Tests (this story's deliverable is largely the tests themselves)
Browser specs above are the outer ring; they fail RED until the login button + detail-page control exist (and serve as the regression guard immediately). The unit + nak-e2e suites stay green and unchanged.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. The harness drives a local relay seeded with throwaway keys; the login button surfaces the existing key-agnostic flow; the detail-page arbiter control reuses Story-6's curator-vouched, observer/source-tag resolution. ✅ no.
- **Hardcoded defaults?** `PLAYWRIGHT_CHROMIUM_PATH` is an env override (unset → bundled); the test port/relay are dev/test-only. No app-facing privileged default. ✅
- **Fork test:** anyone runs `npm run test:browser` against their own seed (providing a browser per their OS) identically. ✅ yes.

## Out of scope
- A speculative relay-config fix (regression not reproducible on current code; guarded by tests; user `localStorage` requested if it recurs).
- CI integration / cross-platform browser provisioning; visual-regression; legacy `/catallax` rework; app-wide nav redesign; deleting the unmounted pasted-naddr path.
