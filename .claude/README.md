# Engineering Team — Claude Code harness (Grantless)

This is the **Claude Code** front end for the engineering-team workflow on **Grantless**
(*The Invisible Handout*) — a decentralized, crowdfunded grants program for open-source work,
built on the Catallax protocol and forked from the Catallax reference client. See
[`.pi/AGENTS.md`](../.pi/AGENTS.md) for product scope, the OpenSets curation model, and the
upstream relationship.

It drives the same harness that the pi version uses: the source of truth for roles, phases,
templates, and accumulated stories/decisions/reviews lives in `.pi/engineering-team/`. This
`.claude/` layer just wires that harness into Claude Code's slash commands and subagents.

## Prime directive

**Catallax is open, permissionless, and Web-of-Trust based.** No pubkey, relay, or arbiter
holds special privileges or capabilities — trust is social, derived from the WoT, never granted
by the client. Hardcoded defaults (relay URLs, Blossom servers, suggested arbiters, API
endpoints) are allowed *only* as bootstrapping conveniences: documented as defaults, trivially
ENV/config-overridable, and free of elevated status. Anyone must be able to clone, repoint at
their own infrastructure, and run it for their own purpose. Every role carries this rule; the
Reviewer blocks violations. Full statement: [`.pi/AGENTS.md`](../.pi/AGENTS.md) → House rules.

## How it maps

| Phase | Slash command | Subagent | Output |
|---|---|---|---|
| 1. Planning | `/plan-feature` | `product-owner` | `.pi/engineering-team/stories/<n>-<slug>.md` |
| 2. Architecture | `/design-architecture` | `architect` | `.pi/engineering-team/decisions/<NNNN>-<slug>.md` |
| 3. Test Design | `/design-tests` | `tester` | `.pi/engineering-team/stories/<n>-<slug>.test-plan.md` + failing tests |
| 4. Implementation | `/implement-feature` | `implementer` | code that makes the failing tests pass |
| 5. Review | `/review-changes` | `reviewer` | `.pi/engineering-team/reviews/<n>-<slug>.md` |
| — (advisory) | `/discuss` | `product-expert` | nothing — read-only thinking partner |

- **Slash commands** (`commands/`) are the phase entry points you invoke directly. They put
  the main session into the right role for that phase.
- **Subagents** (`agents/`) carry the same role definitions with tool restrictions (e.g. the
  Architect and Reviewer have no Edit access). Claude can delegate to them, or you can target
  one explicitly.

The user is the approval gate between phases — nothing auto-advances.

## Usage

```
/plan-feature           # start a new feature/bug/refactor as the Product Owner
/design-architecture    # design an approved story → ADR
/design-tests           # write the test plan + failing tests
/implement-feature      # make the failing tests pass
/review-changes         # audit the diff, PASS / CHANGES_REQUESTED

/discuss                        # advisory mode — Product Expert, no artifacts
/discuss as architect <topic>   # advisory from a single role's lens
/discuss roundtable <topic>     # all five roles weigh in, then a synthesis
```

## Tuning

Behavior lives in `.pi/engineering-team/` (roles, workflows, templates) and `.pi/AGENTS.md`
(project context + house rules). Edit those to change how the team behaves — the files here
only orchestrate. Keeping a single source of truth means the pi and Claude front ends never
drift apart.

The `product-expert` role lives at `.pi/engineering-team/roles/product-expert.md` and is the
one role that only has a Claude front end so far (the pi harness ships five roles). The
`/discuss` command can also adopt any of the five phase roles via `as <role>`.

> Note: tapestry's `.claude/` additionally ships deploy-chain skills (`cycle-*`) tied to its
> staging/prod pipeline. Those are project-specific to tapestry and aren't included here.
