# Phase 2: Architecture

## Role
Architect. See `.pi/engineering-team/roles/architect.md`.

## Input
An approved user story.

## Output
An ADR at `.pi/engineering-team/decisions/<NNNN>-<slug>.md` (numbering: zero-padded sequential, e.g., `0007-add-relay-wrapper.md`), using the `adr.md` template.

## Steps

1. **Read the story.** Quote the acceptance criteria back.
2. **Read the relevant code.** Identify which modules will change.
3. **List options.** At least two — one chosen, one alternative.
4. **Pick and justify.** Note tradeoffs. Note what existing architecture rules apply:

   - **Wrapper/adapter layer**: Implementation code talks to our wrappers around Nostr protocol functions, not directly to library APIs.
   - **Minimal coupling to opinionated frameworks**: Keep the codebase forkable.
   - **Clear separation of concerns**: UI, protocol, and data layers should be separable.
   - **Reference client philosophy**: Every design decision should ask "would this make it harder for someone to fork and customize this?"

5. **Check for ADR conflicts.** Read existing ADRs. If you're contradicting one, supersede it explicitly.
6. **Write the ADR** using the template.
7. **Show it.** Iterate to approval.
8. **Gate:** "ADR approved? Ready for Test Design?"
9. Hand off to `/skill:design-tests`.

## Common pitfalls
- Re-litigating the story. If the story is wrong, kick back to PO; don't try to redesign the requirement under the guise of architecture.
- Single-option ADRs. Always name an alternative. The discipline of articulating why you didn't pick it is where the value comes from.
- Vague ADRs. "Use the existing pattern" isn't enough — name the pattern, name the file, name the function.

## Per-phase commits
yes. Commit the ADR before moving on.
