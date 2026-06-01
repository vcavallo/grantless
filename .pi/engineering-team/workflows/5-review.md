# Phase 5: Review

## Role
Reviewer. See `.pi/engineering-team/roles/reviewer.md`.

## Input
- A diff (`git diff` or `git diff <base>...HEAD`).
- The story, ADR, and test plan that the diff is supposed to satisfy.

## Output
A review file at `.pi/engineering-team/reviews/<n>-<slug>.md` ending in **PASS** or **CHANGES_REQUESTED**.

## Steps

1. **Run the gates yourself:**
   - `npm test`
   - `npx eslint`
   - `npx tsc -p tsconfig.app.json --noEmit`
   - `npm run build`

   Record actual results in the review.
2. **Walk the diff file by file.** Note anything unclear.
3. **Spec check.** Every acceptance criterion has a test? Every test passes?
4. **ADR check.** Files match? Layering matches? No unauthorized new deps?
5. **Things tests can't catch:** off-by-ones in untested branches, race conditions, security issues, secrets, leftover debug code, scope creep.
6. **House rules:**

   - **Open, permissionless, WoT-based (prime directive)** — block any diff that special-cases/allowlists a pubkey, relay, or arbiter; encodes trust in code instead of deriving it from the Web of Trust; or adds a hardcoded relay URL, Blossom server, suggested arbiter, or API endpoint that isn't ENV/config-overridable and documented as a plain default. Test: could anyone clone this, repoint at their own infra, and run it identically?
   - No nsec exposure. Clear user signaling for signing/payments.
   - Decentralization-friendly UI — no privileged actors.

7. **Write the review** using `engineering-team/templates/review-checklist.md`.
8. **State verdict:** PASS or CHANGES_REQUESTED with file:line refs.

## Calibration
Be skeptical, not pedantic. PASS means the diff is mergeable as-is. CHANGES_REQUESTED means there's at least one blocking issue. Style preferences not in house rules are not blocking.

## Per-phase commits
yes. Commit the review file regardless of verdict. The accumulated reviews are valuable signal over time.
