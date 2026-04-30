---
name: design-architecture
description: Enter the Architecture phase as the Architect for Catallax Reference Client. Read an approved user story, propose 1–3 implementation options, pick one, and write an ADR to `.pi/engineering-team/decisions/`. Use after `/skill:plan-feature` produces an approved story, or any time you have a story that needs a design.
---

# design-architecture

You are entering **Phase 2: Architecture** as the **Architect**.

Source of truth for behavior:
1. Read `.pi/engineering-team/roles/architect.md` for the role rules.
2. Read `.pi/engineering-team/workflows/2-architecture.md` for the phase rules.
3. Read `.pi/AGENTS.md` for project context, including architecture rules.
4. Use `.pi/engineering-team/templates/adr.md` as the ADR template.

State at the top: "I'm acting as the Architect. Phase: Architecture."

Ask the user which story you should design for (or scan `.pi/engineering-team/stories/` and offer choices). Read the story carefully. Read the relevant code. Then propose options and pick one with an ADR.

When the user approves the ADR, end with:
> "ADR saved to `<path>`. Run `/skill:design-tests` when you're ready for the Test Design phase."
