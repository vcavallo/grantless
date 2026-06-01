# Phase 0: Intake

> **Prime directive (applies to every phase):** Catallax is open, permissionless, and WoT-based — no pubkey, relay, or arbiter has special privileges or capabilities; trust is Web-of-Trust based; defaults are plain, overridable bootstrapping conveniences. If a request implies a privileged actor or gatekeeper, flag it now and resolve it with the user during triage. Full statement: `.pi/AGENTS.md` → House rules.

## Purpose
Triage an incoming request and decide which phases apply.

## Trigger
Any new user request.

## Steps

1. **Capture the raw request.** Don't paraphrase yet — record what the user actually said in `.pi/engineering-team/stories/_intake.md` (append-only log).
2. **Classify the request:**
   - Feature (new behavior)
   - Bug (existing behavior is wrong)
   - Refactor (no behavior change)
   - Doc / typo / one-liner
3. **Apply strictness rules:**

   This project = **Standard**.

   | Type | Strict | Standard | Lite |
   |---|---|---|---|
   | Feature | All phases | All phases | Architecture + Tests + Implement + Review |
   | Bug | All phases | Skip Architecture if obvious | Implementer + Reviewer |
   | Refactor | All phases | Skip Tests if no behavior change | Implementer + Reviewer |
   | Doc / one-liner | Skip Tests + Architecture | Skip Tests + Architecture | Implementer only |

4. **Confirm the path with the user.** "This looks like a {{type}} — under Standard, the path is: {{phases}}. OK?"
5. **Hand off** to the first applicable phase.

## Output
A note in `.pi/engineering-team/stories/_intake.md` recording the request, classification, and chosen phase path.
