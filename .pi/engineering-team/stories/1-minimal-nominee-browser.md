# Story 1: Minimal nominee browser from a pasted list naddr

**Status:** Approved
**Created:** 2026-06-01
**Type:** Feature

## Background
Grantless shows the gigs of profiles a **Curator** has nominated ("Grantless Nominee"). The Curator-tagging mechanism and real OpenSets don't exist yet, so there's no nominee data to build the browse UI against. To unblock UI development and visual testing, a developer can paste the `naddr` of *any* existing list-of-pubkeys — a kind **30392** trusted list, a **30000** follow set, or a **39089** starter pack — and its members are treated as stand-in nominees. Because most nominees won't have posted projects yet, the screen shows the **people** first, with their projects (or a "No projects yet" state) beneath, so it's never blank. This is explicitly scaffolding: a later story replaces the pasted list with real Curator OpenSet selection.

(Terminology: this story uses **"Curator"** in place of "host." The `.pi/AGENTS.md`/OpenSets docs still say "host" — reconciling that naming is a separate docs follow-up, noted in Out of scope.)

## User-facing description
As a Grantless developer (and, later, a viewer), I want to load a set of nominee profiles by pasting a list's `naddr`, so that I can see each nominee and their Catallax projects — even before any real Curator nomination lists exist.

## Acceptance criteria
- [ ] **Load & render.** Given a valid `naddr` pointing to a kind **30392**, **30000**, or **39089** event, when the developer submits it, then the browser displays one nominee per **distinct** pubkey in the list's `p` tags, in the **order those `p` tags appear** in the list (first occurrence wins for duplicates).
- [ ] **Profile shown.** Given a nominee pubkey, then their entry shows the display name and avatar from their kind-0 metadata, with a sensible fallback (generated name + placeholder) when metadata is missing or not yet loaded.
- [ ] **Projects beneath each nominee.** Given a nominee, then below their profile the browser lists **all** the Catallax task proposals (kind 33401) that nominee authored, each showing at least a title, regardless of funding type.
- [ ] **No-projects state.** Given a nominee who has authored no Catallax task proposals, then their entry shows an explicit **"No projects yet"** — every nominee in the list renders regardless of project count, so the screen is never empty just because projects are sparse.
- [ ] **Remember last list.** Given a list was successfully loaded, when the page is refreshed, then the same nominee set re-loads automatically (the last-loaded `naddr` is remembered locally); submitting a new list replaces what's remembered.
- [ ] **Invalid input & empty states.** Given an `naddr` that is malformed or points to a kind other than 30392/30000/39089, when submitted, then the browser shows a clear, human-readable error and does not crash; given a valid list containing zero pubkeys, then it shows an empty state that invites trying another list (and, per house rules, another relay).
- [ ] **No privileged source (openness).** Given two different valid lists from two different authors, when each is pasted, then each produces its own nominee set, with no list, author, or relay treated specially — the displayed nominees are driven entirely by the pasted list.

## Out of scope
- The real **Curator nomination** mechanism (tagging profiles as "Grantless Nominee" / publishing the Curator's OpenSet). Future story.
- **Curator selection/switching** UI and multiple curators — here there's exactly one source: the pasted list.
- **Arbiter** curation/filtering.
- **Crowdfunding display** — funding goals, zap progress, amounts, contributor counts (note: projects show regardless of funding type, with no funding UI).
- **Project/profile detail pages**, applying to gigs, self-assignment, any write actions.
- The **Grantless default-relay policy** (always-including `relay.grantless.org` for Catallax events) is a separate story; Story 1 reads from the app's configured/overridable relay set.
- Reconciling "host" → "Curator" naming across `.pi/AGENTS.md` and the OpenSets docs (separate docs follow-up).

## Openness check
Driven entirely by user input (a pasted `naddr`) — no hardcoded or privileged list, author, or relay. Any valid list of pubkeys works identically regardless of who authored it. Data comes from the app's configured (and overridable) relay(s). No nominee is special-cased. Fully consistent with the prime directive.

## Open questions
- None outstanding. Resolved during planning: project scope = **all** task proposals (any funding type); ordering = **published `p`-tag order**; persistence = **remember last list** (auto-reload on refresh).

## Linked artifacts
- ADR: (filled in after Architecture phase)
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
