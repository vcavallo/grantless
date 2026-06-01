# Test Plan: Story 1 — Minimal nominee browser

**Story:** `.pi/engineering-team/stories/1-minimal-nominee-browser.md`
**ADR:** `.pi/engineering-team/decisions/0001-minimal-nominee-browser.md`
**Date:** 2026-06-01

## Decision: automated tests deferred for this story

**No automated tests are written for Story 1.** Verification is **manual, in the browser**, against real Nostr data. This is a deliberate, user-approved call for this scaffolding feature.

Rationale: this repo has no real Nostr test harness (no local-relay/`nak` integration, no Playwright). The only automated option available today is mocked-`useNostr` unit/component tests, which assert against fixtures the implementation itself shapes — low signal, high brittleness, and they don't exercise the actual relay/query/parse path. We are not shipping that.

## Future testing approach (when we invest in tests)

The intended approach — and the one the next Tester phase should follow — is **real-event end-to-end**:

- Spin up a **local strfry relay**.
- Publish **real** events with **`nak`** (a 30000/30392/39089 list of `p` tags; kind-0 profiles; kind-33401 task proposals authored by listed nominees; some nominees with no tasks).
- Point the app at the local relay and drive the **real browser** against those real events.

This is the genuine advantage of building on Nostr — real protocol fixtures are trivial to produce — and it tests the whole stack (query → parse → render) rather than a mock of it. Mocked-`useNostr` unit/component tests are explicitly **not** the path here.

## Manual browser verification checklist (this story)

Run against a relay that has at least one real list (30000/30392/39089) plus some task proposals from listed pubkeys. Each item maps to a story acceptance criterion.

| AC | Manual check |
|---|---|
| Load & render | Paste a valid `naddr` for a 30392 / 30000 / 39089 list → one nominee appears per distinct member pubkey, in the list's `p`-tag order; duplicates collapse to one. |
| Profile shown | Each nominee shows name + avatar from kind-0; a member with no/while-loading metadata shows a generated fallback name + placeholder. |
| Projects beneath | A nominee who authored 33401 task(s) shows them (title visible) beneath their profile, regardless of funding type. |
| No-projects state | A nominee with no task proposals shows **"No projects yet"** and still renders — the screen is never blank when projects are sparse. |
| Remember last list | Load a list, refresh the page → the same nominee set re-loads automatically without re-pasting. |
| Invalid input | Paste a malformed string or an `naddr` of an unsupported kind (e.g. a 33401) → a clear error shows; no crash. |
| Empty list | Paste a valid list with zero members → an empty state appears that invites trying another list / relay. |
| Openness | Paste two different lists from two different authors → each shows its own members; nothing is hardcoded or special-cased. Point the app at a different relay → still works. |

## Verification

N/A — no automated tests committed. Verification is the manual browser checklist above, performed after implementation and recorded in the Review.
