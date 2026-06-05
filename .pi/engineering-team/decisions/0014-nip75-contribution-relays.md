# ADR 0014: NIP-75 contribution relays

**Status:** Proposed
**Date:** 2026-06-05
**Story:** `.pi/engineering-team/stories/15-nip75-contribution-relays.md`

## Context

NIP-75: a client zapping a goal **MUST include the goal's `relays` tag in the zap request's `relays`
tag** (that's where the goal's zaps are "sent to and tallied from"). Our contribute flow doesn't:
`ContributeDialog.getInvoice` (`ContributeDialog.tsx:77`) passes `getActiveRelays(config,
presetRelays)` to `prepareInvoice`, and `buildZapRequest` (`src/lib/zap.ts`) emits exactly those as
`['relays', …]`. So a contribution's receipt can be published off the goal's declared relays, where a
compliant tally won't find it.

Relevant existing code:
- `buildZapRequest(input)` (`src/lib/zap.ts`) — pure; emits `['relays', ...input.relays]` + `['e',
  goalId]`. Does **not** dedupe.
- `ContributeDialog` does **not** currently read the goal, but its parent `CrowdfundSection` mounts
  `useZapGoal(task.goalId)`, which exposes `zapData.goal` (the 9041 `NostrEvent`). React Query dedupes
  by key, so the dialog can call `useZapGoal(task.goalId)` and reuse that cached goal — no extra fetch.
- The goal's relays live in its `relays` tag (`goal.tags.find(t => t[0]==='relays')?.slice(1)`).
- Read side already hardened (`useZapGoal` tallies `union(activeRelays, goalRelays)`, `c5ca929`) — this
  ADR is the symmetric **write** side.

Constraints (`.pi/AGENTS.md`): keep the testable core pure (`lib/zap.ts`), minimal coupling, no
hardcoded/privileged relay.

## Options considered

### Option A — Caller passes `union(goalRelays, activeRelays)`; `buildZapRequest` dedupes; add a pure `extractGoalRelays`
`ContributeDialog` reads the goal's relays from the cached `useZapGoal` goal via a new pure helper
`extractGoalRelays(goal)`, and passes `[...goalRelays, ...activeRelays]` to `prepareInvoice`.
`buildZapRequest` de-duplicates its `relays` list (order-preserving). The two pure pieces
(`extractGoalRelays`, `buildZapRequest` dedupe) are unit-tested.

- **Pros:** spec-compliant (goal relays always present) + robust (active set unioned); the union is
  data the caller already has; pure testable core; symmetric with the read side; tiny blast radius;
  `buildZapRequest` keeps its single-`relays`-list signature.
- **Cons:** `ContributeDialog` mounts `useZapGoal` (but it's cached/shared with the parent — no real
  cost).

### Option B — Put the union inside `buildZapRequest` (pass goalRelays + activeRelays separately)
- **Pros:** union logic centralised in the builder.
- **Cons:** changes `buildZapRequest`'s signature/semantics for one caller; the builder shouldn't know
  about "goal vs active" — it just takes relays. Rejected; dedupe is enough.

### Option C — Dedicated lightweight goal fetch in the dialog
- **Pros:** explicit.
- **Cons:** a second query for data `useZapGoal` already caches. Rejected.

## Decision

**Option A.** Smallest, spec-compliant, keeps the testable logic pure, reuses the already-fetched
goal, and mirrors the read side's `union(active, goal)` symmetry.

**Resolved open questions:**
1. Source of goal relays → the cached `useZapGoal(task.goalId).goal` via a pure `extractGoalRelays`.
2. Union location → caller builds `[...goalRelays, ...activeRelays]`; `buildZapRequest` dedupes
   (order-preserving, goal relays first so they're never dropped).

## Consequences

- **Enables:** contributions advertise the goal's relays (NIP-75 MUST) → receipts land where the goal
  is tallied; still resilient via the active-set union.
- **Symmetry/consistency:** `extractGoalRelays` can also replace the inline relay extraction in
  `useZapGoal` (optional DRY; behavior-preserving) and the dialog's receipt-watch (`startWatch`) may
  poll the same union for consistency — both **optional**, noted, not required by the story.
- **Edge:** if the goal hasn't loaded yet (`zapData.goal` undefined), `goalRelays` is `[]` and we fall
  back to the active set — acceptable (the dialog's invoice step runs after the goal is known, since the
  contribute UI only renders for a goal'd task). The builder dedupe makes an empty goal-relays harmless.

## Openness / permissionlessness check (required)

- **Privileged actor?** **No.** The zap request's relays are the **goal author's declared relays** +
  the **viewer's overridable active set** — no app-chosen, hardcoded, or privileged relay. This
  *strengthens* the prime directive: contributions follow the goal author's choice, not the client's.
- **Trust from WoT, not client?** Unchanged — pure relay plumbing.
- **Hardcoded defaults?** None; existing overridable sources only.
- **Fork test:** Yes — own goal/relays → identical behavior.

## Implementation notes

- **`src/lib/zap.ts`:**
  - `buildZapRequest`: de-duplicate the relays before emitting — `['relays', ...new
    Set(input.relays)]` (order-preserving; goal relays first as passed). No signature change.
  - add `export function extractGoalRelays(goal: NostrEvent): string[]` →
    `goal.tags.find(([n]) => n === 'relays')?.slice(1) ?? []`. Pure.
- **`src/components/grantless/ContributeDialog.tsx`:**
  - `const { data: zapData } = useZapGoal(task.goalId);` (cached/shared with `CrowdfundSection`).
  - in `getInvoice`: `const goalRelays = zapData?.goal ? extractGoalRelays(zapData.goal) : [];`
    then `const relays = [...goalRelays, ...getActiveRelays(config, presetRelays)];` → pass to
    `prepareInvoice({ ..., relays })`. (`buildZapRequest` dedupes.)
  - *(Optional, for consistency — Implementer's discretion, not required:)* use the same `relays`
    union in `startWatch`'s `waitForReceipt` poll.
- **(Optional DRY, behavior-preserving):** `useZapGoal` can use `extractGoalRelays(goal)` for its
  inline relays extraction.

## Out of scope

- The read/tally side (already `c5ca929`).
- LNURL server compliance (server-side).
- The goal's own `relays` tag / the seed.
- Real Lightning payment verification (manual, Story 13).
