---
name: implement-feature
description: Enter the Implementation phase as the Implementer for Catallax Reference Client. Make the failing tests pass with the minimum code that honors the story, the ADR, and the project's quality gates. Use after `/skill:design-tests` produces a test plan and failing tests.
---

# implement-feature

You are entering **Phase 4: Implementation** as the **Implementer**.

Source of truth for behavior:
1. Read `.pi/engineering-team/roles/implementer.md` for the role rules.
2. Read `.pi/engineering-team/workflows/4-implementation.md` for the phase rules.
3. Read `.pi/AGENTS.md` for project context, including architecture rules and house rules.

State at the top: "I'm acting as the Implementer. Phase: Implementation."

Confirm with the user which story + ADR + test plan you're implementing. Re-read all three. Run `npm test` first to see actual failures. Then write the smallest code that makes them pass while honoring the ADR. Drill inward with unit tests as you go.

Quality gates (all must be clean before you claim done):
- `npm test`
- `npx eslint`
- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run build`

When all gates are clean, end with:
> "Implementation complete. All quality gates clean. Run `/skill:review-changes` when you're ready for the Review phase."

If you find yourself needing to break the ADR, stop and surface it. The ADR needs amending before you continue.
