# Phase 4: Implementation

## Role
Implementer. See `.pi/engineering-team/roles/implementer.md`.

## Input
- An approved user story.
- An approved ADR.
- An approved test plan with failing tests committed.

## Output
- Code that makes the failing tests pass.
- All quality gates clean: `npm test`, `npx eslint`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run build`.

## Steps

1. **Run `npm test`** first. Confirm what's actually failing right now.
2. **Re-read story, ADR, test plan** before touching code.
3. **Drill inward.** As you implement, add progressively more granular unit tests for the components you're building. This is the outside-in TDD "drill inward" phase — the Tester wrote the outer ring, you add the inner rings.
4. **Write the smallest code** that makes the tests pass while honoring the ADR.
5. **Honor architecture rules:**

   - **Wrapper/adapter layer**: Implementation code talks to our wrappers, not directly to library APIs.
   - **Minimal coupling**: Keep it forkable.
   - **Clear separation of concerns**: UI, protocol, data layers separable.
   - **Reference client philosophy**: Would this make it harder to fork?

6. **Honor house rules:**

   - **Open, permissionless, WoT-based (prime directive)**: never special-case or allowlist a pubkey/relay/arbiter; trust is WoT-based, never granted by the client. Any hardcoded default (relay URLs, Blossom servers, suggested arbiters, API endpoints) is a bootstrapping convenience only — ENV/config-overridable, documented, no elevated status. Anyone must be able to clone, repoint, and reconfigure for their own purpose.
   - No nsec exposure. Clear user signaling for signing/payments.

7. **Run all gates:**
   - `npm test`
   - `npx eslint`
   - `npx tsc -p tsconfig.app.json --noEmit`
   - `npm run build`

   All four must be clean. If they're not, fix them before claiming done.
8. **If forced outside the ADR,** stop and escalate. The ADR needs amending before you continue.
9. **Hand off:** `/skill:review-changes`.

## Common pitfalls
- Doing more than the story asks. Add a TODO or a follow-up story instead.
- Refactoring neighbors "while we're here". Not authorized by the ADR. Don't.
- Modifying tests to make them pass. If a test is wrong, kick back to Tester.
- Claiming "done" without running every gate. Run them all every time.

## Per-phase commits
yes. Commit when all gates are clean. Reference the story and ADR in the commit message. Also commit the TDD inflection point separately — when outer tests go from failing to passing, that's a meaningful boundary.
