# ADR 0005: Create a project — a pure 33401 builder + a Grantless create form

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/5-create-project.md`

## Context

Story 5 is the first write flow: a logged-in grantee posts a **`proposed`, crowdfunding kind-33401** authored by themselves (patron = first `p`), with **no arbiter and no 9041 goal** (Stories 6–7). It must surface under the grantee in the Story-4 curator browse.

**Existing assets (verified):**
- `src/components/catallax/TaskProposalForm.tsx` — a full 33401 creator, but it **requires** arbiter selection (`:49`, `:347`) and publishes a 9041 goal inline (`:83-128`); it folds Stories 6–7 into creation and uses ad-hoc `useState`, not the project's RHF/zod convention. Mounted only on `/catallax`.
- `src/hooks/useNostrPublish.ts` — `mutate/mutateAsync` over `{ kind, content?, tags?, created_at? }`; throws if logged out; signs via `user.signer`; auto-adds a `client` tag (https only); **on a 33401 publish it invalidates `['catallax']` and refetches `['catallax','tasks']`** (`:44-56`).
- `src/lib/catallax.ts` — `parseTaskProposal` requires `d`, patron (`p[0]`), `amount`, `status` (`:168`); reads `p` positionally (patron, arbiter, worker); `funding_type` default `single`; `generateTaskId(title)` (`:249`) → slug+timestamp `d`. `CATALLAX_KINDS.TASK_PROPOSAL = 33401`. No generic 33401 *builder* exists (the form inlines its tags).
- `src/hooks/useCatallax.ts` `useTaskProposals(status?)` — `{kinds:[33401], '#t':['catallax'], limit:1000}`, dedupes to latest per `patron:d`, **only accepts events whose `pubkey` is the patron/arbiter/worker** (authorized-updater). Key `['catallax','tasks',status]`.
- Story-4 `CuratorBrowser` already calls `useTaskProposals()` + `groupTasksByPatron` and renders projects under each applicant. `EditProfileForm.tsx` is the canonical RHF + zod + shadcn `Form` example. `LoginArea`, `useCurrentUser`, shadcn `Dialog`, `useToast` all exist.

**Constraints (`.pi/AGENTS.md`):** permissionless write (any logged-in pubkey, no privileged actor); explicit user signing (no silent publish), nsec never exposed (the signer handles it); writes to the configured/overridable relay; keep the lib/hook/component seam; no mocked-`useNostr` tests (real events for the relay path; UI manual).

## Options considered

### Option A — Pure generic 33401 builder in `lib/catallax.ts` + a fresh Grantless `CreateProjectForm` (RHF/zod), opened from the browse page *(chosen)*
Add `buildTaskProposalTemplate(input)` to `catallax.ts` returning `{ kind, content, tags }` for a 33401 — generic (arbiter/worker/goal optional; `status`/`fundingType` parameterized), pure, and unit-testable. Build a small `CreateProjectForm` (RHF + zod, the `EditProfileForm` pattern) that calls it with no arbiter, `fundingType:'crowdfunding'`, `status:'proposed'`, publishes via `useNostrPublish`, and toasts. Mount it in a login-gated `Dialog` reachable from `GrantlessBrowse`. The publish hook's existing `['catallax']` invalidation refreshes the browse.
- **Pros:** matches the epic's minimal slice (no arbiter/goal); the risky part (event shape) is a pure function tested at unit + real-event level and round-tripped through `parseTaskProposal`; follows the project's form convention; leaves the legacy `/catallax` form untouched; the builder is generic and upstream-shareable (Stories 6–8 reuse it to add arbiter/worker/goal/status).
- **Cons:** a little new UI; one more 33401 construction path alongside the legacy form (acceptable — the legacy inline tags can later be refactored onto the builder).

### Option B — Reuse `TaskProposalForm` on the Grantless route, make arbiter optional + skip the goal
Parameterize the legacy form.
- **Pros:** less new code.
- **Cons:** edits untested legacy `/catallax` code; its `useState`/arbiter/goal wiring is exactly the Stories 6–7 coupling we want to *avoid* pulling into Story 5; high regression surface for low gain. **Rejected.**

### Option C — Reuse `TaskProposalForm` as-is on `/`
- **Cons:** forces arbiter selection (Story 6) and creates a goal (Story 7) at proposal time — wrong scope per the epic. **Rejected.**

## Decision

**Option A.** A pure `buildTaskProposalTemplate` in `lib/catallax.ts` plus a fresh, login-gated `CreateProjectForm` dialog on the Grantless browse page. The proposal is `proposed`/`crowdfunding`/arbiter-less/goal-less; the builder is generic so later write stories extend it rather than fork it.

## Consequences

- **Enables** the core-loop start and gives Stories 6–10 a builder to extend (arbiter `p`/`a`, worker `p`, `goal`, status transitions) instead of duplicating tag logic.
- **No new event kinds; `NIP.md` unchanged.** Reuses the 33401 schema exactly; the created event is a valid `proposed` task (parser-compatible).
- **No new dependencies** — RHF, zod, shadcn `Form`/`Dialog`, `useToast`, `LoginArea` all exist.
- The browse auto-refreshes via the publish hook's existing `['catallax']` invalidation; no new query wiring.
- A second 33401-construction path now exists (builder vs. the legacy form's inline tags). Accepted; a later cleanup can refactor the legacy form onto `buildTaskProposalTemplate`. Flagged, not done here.
- Visibility is still curator-gated (Story 4): a posted project shows only when its author is in the selected curator's `grantless-applicants` list — the permissionless-floor/curated-visibility split the epic intends.

## Implementation notes

- **`src/lib/catallax.ts`** — add a pure builder:
  - `export interface TaskProposalInput { d: string; patronPubkey: string; title: string; description: string; requirements: string; amount: string; status?: TaskStatus; fundingType?: FundingType; arbiterPubkey?: string; arbiterService?: string; workerPubkey?: string; goalId?: string; detailsUrl?: string; categories?: string[]; deadline?: number; }`
  - `export function buildTaskProposalTemplate(input: TaskProposalInput): { kind: number; content: string; tags: string[][] }`:
    - `content = JSON.stringify({ title, description, requirements, deadline })` (omit `deadline` when undefined).
    - tags in canonical order: `['d', d]`, `['p', patronPubkey]`, then `['p', arbiterPubkey]` **iff** set, then `['p', workerPubkey]` **iff** both arbiter and worker set (preserve positional patron/arbiter/worker semantics `parseTaskProposal` relies on), `['a', arbiterService]` iff set, `['amount', amount]`, `['t','catallax']`, `['status', status ?? 'proposed']`, `['funding_type', fundingType ?? 'single']`, `['r', detailsUrl]` iff set, `['goal', goalId]` iff set, then one `['t', c]` per category.
    - Pure/deterministic (no `Date`/random) — caller supplies `d`.
- **`src/components/grantless/CreateProjectForm.tsx`** (new): RHF + `zodResolver` (`EditProfileForm` pattern). Schema: `title` (non-empty), `description` (non-empty), `requirements` (non-empty), `amount` (coerce number, integer > 0; stored/sent as string sats), optional `detailsUrl` (url), optional `deadline`, optional `categories` (comma-split). On submit: `const d = generateTaskId(title)`; `const tmpl = buildTaskProposalTemplate({ d, patronPubkey: user.pubkey, fundingType: 'crowdfunding', status: 'proposed', ...fields })`; `createEvent(tmpl)` via `useNostrPublish`; on success `toast` + `form.reset()` + `onSuccess?.()`; on error `toast` (destructive). Guard with `useCurrentUser` (the form assumes a logged-in user; the dialog gates it).
- **`src/components/grantless/CreateProjectDialog.tsx`** (new): a shadcn `Dialog` with a "Post a project" trigger `Button`. When `useCurrentUser()` has no user → dialog body shows a short prompt + `<LoginArea />`; when logged in → `<CreateProjectForm onSuccess={() => setOpen(false)} />`.
- **`src/pages/GrantlessBrowse.tsx`**: render `<CreateProjectDialog />` in the header (alongside the existing "Catallax dashboard" link). No change to `CuratorBrowser` (it auto-refreshes via the publish invalidation).
- **No new relay/config:** writes go through `useNostrPublish` → the configured pool (overridable). The `amount` is the funding target in sats (string), matching the existing 33401 `amount` convention.

### Tests the Tester will write (anticipated)
- **Unit (`npm test`, no relay):** `src/lib/catallax.buildTaskProposal.test.ts` — `buildTaskProposalTemplate` for the Grantless case (no arbiter): asserts `kind` 33401; content JSON has title/description/requirements (+deadline when given, absent when not); tags include `d`, `p[0]===patron`, `amount`, `status:'proposed'`, `funding_type:'crowdfunding'`, `t:'catallax'`, optional `r`/category `t`s; and **no arbiter `p`, no `a`, no `goal`**. Round-trip: construct a `NostrEvent` from the template + a patron pubkey and assert `parseTaskProposal` yields `patronPubkey===patron`, `status:'proposed'`, `fundingType:'crowdfunding'`, `amount`, `arbiterPubkey===undefined`, `goalId===undefined`. Also a with-arbiter/with-goal case to lock the positional `p`/`a`/`goal` ordering for later stories.
- **Real-event e2e (`npm run test:e2e`):** `test/e2e/create-project.e2e.test.ts` — build a proposal with `buildTaskProposalTemplate`, publish it **signed by a patron** to the local strfry (via the harness `publish` with `kind/content/tags`), then `query({kinds:[33401], '#t':['catallax'], '#d':[d]})`, `parseTaskProposal` the result, and assert the round-trip (patron, proposed, crowdfunding, amount, no arbiter/goal) — proving the built event is valid on a real relay and parser-compatible. Plus: publish a `grantless-applicants` list with the patron as a member and assert `resolveCuratorApplicants(curator)` includes the patron (so it would render under them in the browse).
- **Manual (browser, dev seed):** log in as Alice (seed nsec) on `/`, "Post a project", fill + submit, signer prompts, success toast, the project appears under Alice when browsing Cleo; logged-out shows the login prompt; invalid input blocks publish.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. Any logged-in pubkey can post; the event is authored by the user's own key (patron = first `p`); no relay/arbiter/pubkey is special-cased or required. ✅ no.
- **Trust WoT-derived?** Yes — posting is the permissionless floor; visibility stays curator-governed (Story 4), the client confers nothing. ✅ yes.
- **Hardcoded defaults?** None new. Writes use the configured/overridable relay; `funding_type:'crowdfunding'` is a Grantless product choice, not a privilege. ✅
- **nsec / signing:** the user's signer signs with an explicit prompt; no key is exposed/logged. ✅
- **Fork test:** anyone runs their own instance, logs in with any key, posts a project to their own relay identically. ✅ yes.

## Out of scope
- Arbiter selection/assent (Story 6); the 9041 goal + funding (Story 7); worker assignment + status transitions (Stories 8–10); edit/withdraw; project detail page + shareable URLs (Story 11); `single` funding type.
- Refactoring the legacy `/catallax` `TaskProposalForm` onto the new builder — later cleanup.
