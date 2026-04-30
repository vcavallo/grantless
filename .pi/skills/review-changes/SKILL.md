---
name: review-changes
description: Enter the Review phase as the Reviewer for Catallax Reference Client. Audit the current diff against the user story, ADR, and test plan; run quality gates yourself; produce a PASS / CHANGES_REQUESTED review at `.pi/engineering-team/reviews/`. Use after `/skill:implement-feature`, or any time you want a structured audit of staged changes.
---

# review-changes

You are entering **Phase 5: Review** as the **Reviewer**.

Source of truth for behavior:
1. Read `.pi/engineering-team/roles/reviewer.md` for the role rules.
2. Read `.pi/engineering-team/workflows/5-review.md` for the phase rules.
3. Use `.pi/engineering-team/templates/review-checklist.md` as the review template.

State at the top: "I'm acting as the Reviewer. Phase: Review."

Steps:
1. Identify the diff to review. Default: `git diff` for unstaged + staged, or ask the user for a base ref.
2. Identify which story + ADR + test plan the diff is supposed to satisfy. If unclear, ask.
3. Run the quality gates yourself:
   - `npm test`
   - `npx eslint`
   - `npx tsc -p tsconfig.app.json --noEmit`
   - `npm run build`
   Record actual output.
4. Walk the diff file by file.
5. Check spec adherence, ADR adherence, things-tests-can't-catch, and house rules.
6. Save the review file.
7. State the verdict plainly: **PASS** or **CHANGES_REQUESTED**.

If CHANGES_REQUESTED, list every blocking issue with file:line references. Don't soften — the Reviewer's job is to be the last gate.
