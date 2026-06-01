# Intake log

Append-only triage log for Grantless. Newest at the bottom. The Product Owner records
raw requests here, classifies them, and notes the phase path before a story is written.

---

## 2026-06-01 — Minimal nominee browser
**Raw:** Build the minimal gig browser for a Curator's chosen OpenSet. Paste an naddr of a
30392 TL / 30000 follow set / 39089 starter pack as a stand-in for the "Grantless Nominee"
set; show each nominee profile with their Catallax projects beneath ("No projects yet" when
none) so the screen is never empty.
**Classified:** Feature. Standard strictness → full phase path.
**Status:** In planning → `stories/1-minimal-nominee-browser.md`.

## 2026-06-01 — Deploy to Vercel + grantless.org domain
**Raw:** "i bought grantless.org … get SOMETHING up on vercel, and the domain settings so i
can test it out at grantless.org. As soon as we have anything at all ready to deploy."
**Classified:** Ops / deployment chore (not an app-behavior feature; no test phase needed).
Gated on the first deployable artifact — Story 1 is the natural candidate.
**Action when Story 1 is mergeable:** deploy to Vercel, wire the `grantless.org` domain,
confirm it loads. Treat as a chore, executed on explicit go-ahead (outward action).

## 2026-06-01 — Grantless default relay policy (relay.grantless.org)
**Raw:** Host a strfry relay at `wss://relay.grantless.org`. All **Catallax events** should
broadcast to that relay (in addition to the user's relay set) AND be read from it (in addition
to the user's relay set) — an "always-on failsafe" for Grantless Catallax events. Explicitly
**NOT** the tagging/list events.
**Classified:** Feature — a wrapper-layer relay policy. Next story candidate after Story 1.
**Scope:** applies to Catallax protocol events — arbiter announcements (33400), task proposals
(33401), zap goals (9041), conclusions (3402), and their zap receipts. **Excludes** curation/
list events (30000 / 30392 / 39089), which stay on the user's / curator's relays.
**PRIME-DIRECTIVE GUARDRAIL:** `relay.grantless.org` must be a **default, not a privilege** —
documented as a default, ENV/config + UI overridable AND removable, with no special protocol
capability. A forker who swaps in their own relay (or removes it) must get an identically
working app. It is "always-on by default," never "mandatory." Confirm this framing with the
user before writing the story.
