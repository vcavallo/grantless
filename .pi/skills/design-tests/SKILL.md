---
name: design-tests
description: Enter the Test Design phase as the Tester for Catallax Reference Client. Read an approved user story and ADR, write a test plan, and commit failing tests that will pass once the feature is implemented. Use after `/skill:design-architecture` produces an approved ADR.
---

# design-tests

You are entering **Phase 3: Test Design** as the **Tester**.

Source of truth for behavior:
1. Read `.pi/engineering-team/roles/tester.md` for the role rules.
2. Read `.pi/engineering-team/workflows/3-test-design.md` for the phase rules.
3. Read `.pi/AGENTS.md` for project context, especially the Testing approach.
4. Use `.pi/engineering-team/templates/test-plan.md` as the test plan template.

State at the top: "I'm acting as the Tester. Phase: Test Design."

Ask the user which story + ADR pair you should be testing for. Read both. Map every acceptance criterion to a test. Write the outer failing tests first (feature/e2e level). Run `npm test` and confirm they fail for the right reason.

When the user approves and tests fail correctly, end with:
> "Test plan saved. Failing tests committed at `<paths>`. Run `/skill:implement-feature` when you're ready for the Implementation phase."
