# Engineering Team — Catallax Reference Client

This directory is the harness that pi uses when working in this project. It encodes the team's roles, phases, templates, and accumulated decisions/stories/reviews.

Generated on 2026-04-30 via `/skill:init-engineering-team`. Strictness: **Standard**.

## Layout

```
engineering-team/
├── README.md                this file
├── roles/                   role definitions — one file per role
├── workflows/               phase definitions — one file per phase
├── templates/               document templates (user story, ADR, test plan, review)
├── decisions/               ADRs accumulate here as <NNNN>-<slug>.md
├── stories/                 user stories accumulate here as <n>-<slug>.md
└── reviews/                 review reports accumulate here as <n>-<slug>.md
```

## Quick reference

| To do this | Run |
|---|---|
| Start a new feature | `/skill:plan-feature` |
| Design an approach for an existing story | `/skill:design-architecture` |
| Write tests for a story + ADR | `/skill:design-tests` |
| Implement a story that has tests | `/skill:implement-feature` |
| Review a diff before commit | `/skill:review-changes` |

## How the phases connect

```
  /skill:plan-feature           → stories/<n>-<slug>.md
  /skill:design-architecture    → decisions/<NNNN>-<slug>.md
  /skill:design-tests           → stories/<n>-<slug>.test-plan.md + failing tests
  /skill:implement-feature      → code changes that make the failing tests pass
  /skill:review-changes         → reviews/<n>-<slug>.md
```

The user is the approval gate between phases. After each phase output, pi asks you to confirm before continuing.

## TDD workflow

This project follows outside-in TDD:
1. User Story → human approves
2. Outer tests first — feature/e2e level tests written from the story, all failing
3. Drill inward — progressively more granular unit tests as implementation proceeds
4. Bubble back out — unit tests pass → integration tests pass → feature/e2e tests pass
5. Human review — actual UI testing in the browser
6. Done

Commits should capture the TDD inflection point: failing tests and passing tests are separate commits.

## Tuning the team

Edit role files in `roles/` to change how each role behaves. Edit workflow files in `workflows/` to change phase rules. The skills in `.pi/skills/` only orchestrate — the source of truth for behavior is in this directory.

## Origin

Pattern adapted from Rob Conery's *Eliminate Crappy Slop Code* (https://bigmachine.io/articles/video/eliminate-crappy-slop-code/) and the broader "agentic Scrum" idea: structural guardrails matter more than model intelligence for output quality.

For the global pi-side documentation of this harness, see `~/.pi/engineering-team-mode.md`.
