# ADR <NNNN>: <title>

**Status:** Proposed | Accepted | Superseded by ADR-<n>
**Date:** <DATE>
**Story:** `.pi/engineering-team/stories/<n>-<slug>.md`

## Context
What is the situation that requires a decision? Pull the relevant facts from the story plus the existing codebase. State constraints (project rules, existing libs, perf budget, etc.) explicitly.

## Options considered

### Option A — <name>
Sketch. Pros. Cons.

### Option B — <name>
Sketch. Pros. Cons.

### (Option C — <name>)
Optional third option.

## Decision
We chose **Option <X>** because <reason>.

## Consequences
- What this enables.
- What this constrains or makes harder.
- What new debt or follow-ups this creates.

## Openness / permissionlessness check (required)
Catallax is open, permissionless, and WoT-based. State explicitly:
- Does this design grant any pubkey, relay, or arbiter special privileges or capabilities? (Must be **no**.)
- Is trust derived from the Web of Trust rather than encoded in the client? (Must be **yes**.)
- List any hardcoded defaults introduced (relay URLs, Blossom servers, suggested arbiters, API endpoints) and confirm each is ENV/config-overridable, documented as a default, and free of elevated status.
- Fork test: could anyone clone this, repoint it at their own infra, and run it identically? (Must be **yes**.)

## Implementation notes
Specific files, function names, module boundaries. The Implementer reads this, so be concrete.

- File: `path/to/file.ts` — add function `doX(input: T): U`.
- File: `path/to/other.ts` — extend with the new branch.

## Out of scope
What this ADR does NOT decide. (E.g., "Caching strategy is deferred to a future ADR.")
