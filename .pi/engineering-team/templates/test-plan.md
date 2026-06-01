# Test Plan: Story <n> — <title>

**Story:** `.pi/engineering-team/stories/<n>-<slug>.md`
**ADR:** `.pi/engineering-team/decisions/<NNNN>-<slug>.md`
**Date:** <DATE>

## Coverage map
Map each acceptance criterion to a test.

| Criterion | Test name | Test file | Level |
|---|---|---|---|
| AC-1 | `it("does X when Y")` | `tests/foo.test.ts` | integration |
| AC-2 | ... | ... | unit |

## Edge cases
Things not in the acceptance criteria but still worth covering.

- [ ] Empty input.
- [ ] Concurrent calls.
- [ ] External service unavailable.
- [ ] **Openness / permissionlessness (where relevant):** a non-default relay/arbiter works identically to a default one; no pubkey is special-cased; overriding a hardcoded default via ENV/config behaves the same as the default.

## Test infrastructure
- Unit: Vitest
- Integration: Vitest + local relay + nak
- E2E: Playwright or Puppeteer
- Mocks / fakes: <list>
- Fixtures: <list>

## How to run

```
npm test
```

## Verification
The new tests fail with the current code. Confirmed on <DATE> at commit <hash>:

```
<paste the failing test output here>
```
