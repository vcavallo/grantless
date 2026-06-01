# Review: Story <n> — <title>

**Reviewer:** pi (acting as Reviewer)
**Date:** <DATE>
**Diff:** `git diff <base>...HEAD` (commit <hash>)

## Quality gates (run by reviewer, not trusted)

- [ ] `npm test` — pass / fail / output
- [ ] `npx eslint` — pass / fail / output
- [ ] `npx tsc -p tsconfig.app.json --noEmit` — pass / fail / output
- [ ] `npm run build` — pass / fail / output

## Spec adherence
- [ ] Every acceptance criterion has a passing test.
- [ ] No criterion is silently dropped.
- [ ] No behavior added that isn't in the story.

## ADR adherence
- [ ] Files changed match the ADR's implementation notes.
- [ ] Layering / module boundaries respected.
- [ ] No new dependencies the ADR didn't authorize.

## Things tests can't catch
- [ ] No secrets in committed files (especially nsecs).
- [ ] No leftover debug logging or `console.log`.
- [ ] No commented-out code.
- [ ] Error paths and edge cases handled where it matters.
- [ ] Concurrency / race conditions considered.
- [ ] Security: input validation at boundaries, no obvious injection vectors.
- [ ] No new hardcoded defaults without ENV/config override and documentation.

## House rules check
- [ ] All house rules satisfied. (See `.pi/AGENTS.md` for the list.)
- [ ] **Open / permissionless / WoT (prime directive):** no pubkey, relay, or arbiter is special-cased, allowlisted, or granted privileged capabilities.
- [ ] **Trust is WoT-derived, not encoded** in the client.
- [ ] **Bootstrapping defaults only:** every hardcoded relay URL, Blossom server, suggested arbiter, or API endpoint is ENV/config-overridable, documented as a default, and carries no elevated status.
- [ ] **Fork test:** someone could clone this, repoint it at their own infra, and run it identically — no dependency on a specific operator.
- [ ] nsec handling is safe.
- [ ] User signaling for signing/payments is explicit.

## Findings

### Blocking
1. **<file>:<line>** — <issue>. Asked change: <change>.

### Non-blocking
1. **<file>:<line>** — <observation>. Optional improvement: <suggestion>.

## Verdict
**PASS** | **CHANGES_REQUESTED**
