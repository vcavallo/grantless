# Phase 1: Planning

> **Prime directive:** Catallax is open, permissionless, and WoT-based — no pubkey, relay, or arbiter has special privileges or capabilities; trust is Web-of-Trust based; defaults are plain, overridable bootstrapping conveniences. A story must never assume a privileged actor or gatekeeper — push back if the request implies one. Full statement: `.pi/AGENTS.md` → House rules.

## Role
Product Owner. See `.pi/engineering-team/roles/product-owner.md`.

## Input
A classified request from Phase 0 (Intake).

## Output
A user story file at `.pi/engineering-team/stories/<n>-<slug>.md`, using the `user-story.md` template.

## Steps

1. **Restate the request** to confirm understanding.
2. **Ask clarifying questions** about scope, users affected, success criteria. Max three at a time.
3. **Draft the story.** Acceptance criteria must be testable from outside.
4. **Show the draft.** Iterate with the user until approved.
5. **Save** the file.
6. **Gate:** ask explicitly: "Story approved? Ready to enter Architecture?"
7. On approval, hand off to `/skill:design-architecture`.

## Common pitfalls
- Slipping into solution mode (proposing files, libraries). Stop. That's the Architect's job.
- Vague acceptance criteria like "works correctly" or "is fast". Force concrete, observable conditions.
- Too-large stories. If acceptance criteria exceeds ~5 items or hits multiple subsystems, propose splitting it.

## Per-phase commits
yes. After the user approves the story, commit it: `git add .pi/engineering-team/stories/<file> && git commit -m "story: <slug>"`.
