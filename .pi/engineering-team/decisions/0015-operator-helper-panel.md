# ADR 0015: Operator helper panel — stuck-project diagnostics

**Status:** Accepted
**Date:** 2026-06-06
**Story:** `.pi/engineering-team/stories/16-operator-helper-panel.md`

## Context

Story 16 asks for a read-only "admin panel" shown only to a configured **operator pubkey**
(supplied via an ENV variable, no default shipped) that surfaces two "why isn't my crowdfunding
active?" states so the operator can reach out and help:

1. **Not vouched by any curator** — a crowdfunding project whose creator is not a member of *any*
   curator's applicant set discoverable in the app's active relay set.
2. **No arbiter assigned** — a project with no arbiter.

Acceptance criteria (paraphrased): operator-only gating (no nav link/affordance for anyone else
once logged in; hidden entirely when the ENV is unset); the two lists with the inclusion/exclusion
behavior above; both reasons surfaced for a project that hits both; each row shows title + status,
the specific reason(s), creator identity (name/short-npub + copy), and a link to the project detail
page; strictly read-only (no event created/edited/published); an empty state. User confirmed during
Architecture: **exclude `concluded` projects** from both lists (this is customer-help, not
analytics — richer analytics is a possible later panel, out of scope now).

**Existing building blocks (this is mostly reuse):**
- `useTaskProposals()` (`src/hooks/useCatallax.ts:71`) already queries **all** kind-33401 `t:catallax`
  proposals across the active relay set, dedupes to the latest authoritative version per
  `patron:d`, and returns `TaskProposal[]` (each with `arbiterPubkey?`, `status`, `patronPubkey`).
- `useApplicantCurationLists()` (`src/hooks/useApplicantCurationLists.ts`) already fetches the
  `grantless-applicants` 30392 lists from the active relay set and returns `CurationList[]` (each
  with `.members`). The union of all members = "vouched by some curator."
- Pure curation helpers live in `src/lib/grantless.ts` (`parseCurationList`, `applicantCurationLists`,
  `applicantsForCurator`, `parseConfiguredCurators`). `parsePubkey` normalizes npub/hex.
- Identity rendering primitives already used on `TaskDetail`: `useAuthor`, `shortNpub`
  (`src/lib/shortNpub.ts`), `CopyNpubButton` (`src/components/CopyNpubButton.tsx`), and
  `nip19.naddrEncode` → `/task/:naddr` links (see `NomineeProjectItem.tsx`).
- ENV-default pattern is established: `VITE_DEFAULT_RELAY`, `VITE_RELAY_URL`, `VITE_GRANTLESS_CURATORS`
  (read via `import.meta.env`, documented in `README.md` + `.env.example`).
- Routing is a flat `Routes` table in `src/AppRouter.tsx` (no shared layout/header; the browse header
  with the About link + `LoginArea` lives in `src/pages/GrantlessBrowse.tsx`).
- `useCurrentUser()` returns `{ user }` with `user.pubkey` (hex).

**Constraints:** prime directive (no privileged actor; the gate must be a convenience, not a
capability); wrapper/separation-of-concerns (pure logic in `lib/`, data in hooks, UI in pages);
forkability (a forker sets their own operator pubkey and gets identical behavior).

## Options considered

### Option A — Reuse the browse data hooks + pure predicates + a gated `/admin` page (chosen)
- **Detection is pure logic over existing data.** Add pure helpers to `src/lib/grantless.ts`:
  `vouchedApplicantPubkeys(lists: CurationList[]): Set<string>` (union of all `.members`) and
  `findStuckProjects(tasks, vouched): { unvouched: TaskProposal[]; arbiterless: TaskProposal[] }`
  (excludes `concluded`; `unvouched` = patron ∉ vouched; `arbiterless` = no `arbiterPubkey`).
- **Gating** via a new `useIsOperator()` hook reading a new `VITE_GRANTLESS_OPERATOR` ENV (a
  comma-separated npub/hex list, **no default**) compared to `useCurrentUser().user.pubkey`.
- **A thin `useStuckProjects()` hook** composes `useTaskProposals()` + `useApplicantCurationLists()`
  and applies the pure helpers, returning `{ unvouched, arbiterless, isLoading }`.
- **A lazy `/admin` route** → new `src/pages/OperatorPanel.tsx` rendering two sections of rows;
  the page self-guards (renders `NotFound` when `!useIsOperator()` — defense in depth for direct
  URL hits). The browse header renders an "Admin" link **only** when `useIsOperator()`.
- **Pros:** maximal reuse (one tiny pure module + one thin hook + one page); detection matches the
  exact relay scope and dedup the rest of the app uses; trivially unit-testable pure predicates;
  real-event e2e drives the page; no new query logic to keep in sync.
- **Cons:** depends on `t:catallax`-tagged 33401s being discoverable (a project missing that tag, or
  on no relay we read, won't appear) — acceptable, matches the story's scan-scope decision.

### Option B — Bespoke relay-scoped queries for the panel
Query `relay.grantless.org` directly for *all* kind-33401 (regardless of `t:catallax`) and separately
fetch all 30392s, with a dedicated data path independent of the browse hooks.
- **Pros:** could surface projects missing the `t:catallax` tag or absent from the active set.
- **Cons:** duplicates query/dedup logic that already exists, diverges from how the app reads
  everywhere else, special-cases one relay (smells against the prime directive), and exceeds the
  story (which scoped the scan to the active relay set + the crowdfunding projects the app surfaces).
  Rejected as premature and divergent; revisit only if untagged projects become a real support load.

### (Option C — server-side / build-time gating)
Gate the panel behind a server route or a separate operator build.
- **Cons:** overkill and misframed — the story states the gate is a UI convenience, **not** a security
  boundary (the queries are public reads anyone can run). A client-side `useIsOperator()` check is the
  correct mechanism; server enforcement would imply a privilege that doesn't exist. Rejected.

## Decision
We chose **Option A**. The feature is, at heart, two pure predicates over data the app already
fetches, plus a convenience gate and a page. Reuse keeps it small, forkable, and consistent with the
rest of the app; the alternatives add divergence or imply a privilege the prime directive forbids.

## Consequences
- **Enables:** a one-screen operator helper for the two most common "stuck" states; pure, unit-testable
  detection; an extension point (`findStuckProjects` / the panel) for future customer-help checks.
- **Constrains / trade-offs:** detection inherits the browse data path's reach — only `t:catallax`
  33401s discoverable in the active relay set are scanned, and "not vouched" is relative to the
  curator lists currently reachable (an unreachable curator list could momentarily over-flag someone;
  the panel copy must say it's a best-effort heuristic, per the story's openness note).
- **Follow-ups / debt:** richer "analytics" (goal-missing, mis-tagged, expired, funded-but-not-marked,
  counts/trends) is explicitly deferred. `parseConfiguredCurators` and the new operator-list parser
  are the same "comma-separated pubkey list" shape — the Implementer may generalize one into a shared
  `parsePubkeyList` rather than duplicate (non-blocking).

## Openness / permissionlessness check (required)
- **Special privileges/capabilities?** **No.** The panel runs only public read queries any client
  could run; it cannot create, edit, delete, moderate, or publish anything. The operator gains a
  convenience view, never a capability others lack. The `useIsOperator()` gate is cosmetic
  decluttering evaluated client-side — explicitly **not** access control, and not relied on as such.
- **Trust WoT-derived, not encoded?** **Yes.** The panel *diagnoses the absence of curation*; it
  confers no trust and hardcodes no trusted pubkey. The "vouched" set is derived live from
  curator-published lists, exactly as the browse does.
- **Hardcoded defaults introduced:** one — `VITE_GRANTLESS_OPERATOR`, a comma-separated npub/hex list
  with **no value shipped** in the repo. Unset → the panel and its nav link exist for no one.
  Overridable per deployment (we set the maintainer's pubkey in Vercel); documented in `README.md` +
  `.env.example` as a convenience with no elevated status. No identity is baked into code.
- **Fork test:** **Yes.** A forker sets `VITE_GRANTLESS_OPERATOR` to their own pubkey and gets an
  identical panel; nothing depends on a specific operator, relay, or our infrastructure.

## Implementation notes
- **`src/lib/grantless.ts`** (pure, unit-tested):
  - `export function vouchedApplicantPubkeys(lists: CurationList[]): Set<string>` — union of every
    list's `.members`.
  - `export interface StuckProjects { unvouched: TaskProposal[]; arbiterless: TaskProposal[] }`
  - `export function findStuckProjects(tasks: TaskProposal[], vouched: Set<string>): StuckProjects` —
    over `tasks.filter(t => t.status !== 'concluded')`: `unvouched` = `!vouched.has(t.patronPubkey)`;
    `arbiterless` = `!t.arbiterPubkey`. (A project may appear in both.)
  - `export function parseOperatorPubkeys(raw: string | undefined): string[]` — same parsing as
    `parseConfiguredCurators` (npub/hex, comma-separated, deduped, hex out). Prefer extracting a shared
    `parsePubkeyList(raw)` and having both call it.
- **`src/hooks/useIsOperator.ts`** (new): `export function useIsOperator(): boolean` — memoize
  `parseOperatorPubkeys(import.meta.env.VITE_GRANTLESS_OPERATOR)`; return
  `!!user && operators.includes(user.pubkey)` using `useCurrentUser()`.
- **`src/hooks/useStuckProjects.ts`** (new, thin composition): call `useTaskProposals()` +
  `useApplicantCurationLists()`; return `{ ...findStuckProjects(tasks, vouchedApplicantPubkeys(lists)),
  isLoading }`.
- **`src/pages/OperatorPanel.tsx`** (new, lazy): if `!useIsOperator()` render `<NotFound/>`. Else two
  sections — "Not vouched by any curator" and "No arbiter assigned" — each a list of rows. Each row:
  project title + status badge (`getStatusColor`), the reason label, creator identity
  (`useAuthor` name ?? `shortNpub`) + `CopyNpubButton`, and a `Link` to `/task/${naddr}`
  (`nip19.naddrEncode({ kind: CATALLAX_KINDS.TASK_PROPOSAL, pubkey: patronPubkey, identifier: d })`,
  as in `NomineeProjectItem.tsx`). Show a "nothing stuck" empty state when both lists are empty.
  Include one line of copy noting the lists are best-effort over reachable relays/curators.
- **`src/AppRouter.tsx`**: add `<Route path="/admin" element={<OperatorPanel/>} />` (lazy import, like
  the other pages).
- **`src/pages/GrantlessBrowse.tsx`**: in the header (next to the About link / `LoginArea`), render a
  `<Link to="/admin">Admin</Link>` **only** when `useIsOperator()` is true.
- **Docs:** add `VITE_GRANTLESS_OPERATOR` to `README.md` (env table) and `.env.example`, documented as
  an overridable convenience that gates a read-only helper view (no privilege).
- **Remove debug noise?** Out of scope here, but note `useTaskProposals` has `console.log`s; don't add
  more in the new code.

## Out of scope
- Richer analytics / additional diagnostic checks (deferred to a future panel + ADR).
- In-app outreach (DM/notify the creator) — outreach stays out-of-band.
- Detecting projects missing the `t:catallax` tag or absent from the active relay set (Option B).
- Any server-side enforcement / real access control — the gate is a client-side convenience by design.
- Pagination / large-relay scaling.
