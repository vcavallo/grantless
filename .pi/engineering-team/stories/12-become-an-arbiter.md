# Story 12: Become an Arbiter

**Status:** Draft
**Created:** 2026-06-04
**Type:** Feature

## Background

Grantless surfaces three roles in its core loop — applicants/teams post projects, funders
crowdfund them, and **arbiters** hold the pooled sats in escrow and judge the outcome. Two of
those roles already have a first-class on-ramp in the Grantless browse: anyone logged in can
**Post a project**, and anyone can fund one. The arbiter role has no equivalent entry point —
the only way to announce an arbiter service today is the Catallax dashboard (`/catallax`), which
the Grantless framing otherwise steers people away from. So a willing arbiter has nowhere obvious
to say "I'll do this job."

This story gives arbiters that on-ramp inside Grantless, the same way "Post a project" gives it to
applicants. It also closes a conceptual gap the About page now raises but the app can't yet act on:
the "Want to be an Arbiter?" section explains the role, but there's no button to actually start.

**The nuance that must be honest:** announcing an arbiter service does **not** make you selectable.
A Grantless applicant can only choose arbiters that their curator/host vouches for (the curator's
trusted-arbiter set — `grantless-arbiter`). Getting *announced* is permissionless and happens here;
getting *vouched* is a separate, social, out-of-band act by a curator (today via Brainstorm). The
flow must make that distinction unmistakable so a freshly-announced arbiter isn't left wondering why
no one can pick them.

## User-facing description

As a logged-in Grantless user who wants to offer escrow/arbitration services, I want a clear
"Become an Arbiter" entry point in the browse experience that lets me announce my arbiter service
(my terms and fee), so that patrons can discover me and a curator can choose to vouch for me —
**and** I want to be told plainly that announcing alone doesn't make me selectable until a curator
adds me to their trusted-arbiter set.

## Acceptance criteria

Testable from the outside (real events on a local relay + the real browser, per the house testing
approach).

- [ ] Given I am logged in and viewing the Grantless browse, when I open the "Become an Arbiter"
      entry point and submit my service terms (at minimum the fee a patron needs to evaluate me),
      then a real arbiter-service announcement is published to the relay and is discoverable by the
      protocol as that key's announced service.
- [ ] Given I am logged out, when I open the "Become an Arbiter" entry point, then I am prompted to
      log in and no announcement is published without a signer (announcing is permissionless — any
      key may do it, but a signature is required).
- [ ] Given I have just announced a service, when the flow completes, then I am shown a clear,
      unmissable message that announcing does not make me selectable yet — I must be added to a
      curator/host's trusted-arbiter set — with a pointer to how that vouching happens.
- [ ] Given I have announced a service, when I return to the browse, then the entry point reflects
      that I already have an announced service rather than implying I have none (so the affordance
      isn't misleading on repeat visits).
- [ ] Given the About page's "Want to be an Arbiter?" section, when I follow its call to action,
      then it leads me to the same "Become an Arbiter" flow (the section is the explanatory anchor;
      the flow is the action).
- [ ] Given any arbiter I announce as, when a patron later views a task that selected me, then my
      arbiter identity is surfaced for the community to judge (no privileged or hidden arbiter) —
      consistent with the existing arbiter-disclosure behavior.

## Out of scope

- **Getting onto a curator's trusted-arbiter set.** That is a curator/host action (today performed
  at `tags.brainstorm.world`), tracked separately as the "Become a Curator" intake item. This story
  only *messages* the requirement and points the way; it does not let an arbiter add themselves to
  any curator's set (doing so would be meaningless — vouching must come from the curator).
- **In-app "assent to arbitrate."** The Catallax protocol has no arbiter-assent event (established
  in Story 6); coordination is out-of-band. This story does not introduce one.
- **Editing or retiring an announced service** beyond what falls out of the announcement being a
  replaceable event. A dedicated "manage my arbiter services" surface is a possible follow-on.
- **Curator-set-aware "you're vouched by X" status.** Showing an arbiter *which* curators have
  vouched for them is a richer follow-on; v1 only needs the honest "announced ≠ vouched" message.
- **A funder/arbiter reputation or activity page.** Tracked separately ("my funding activity"
  intake item, and an arbiter track record would be its analogue).

## Openness check

Clean, and the story actively reinforces the prime directive:

- **No privileged arbiter.** Announcing is permissionless — any logged-in key can announce a
  service; the client confers no special status. The announcement is just a public event.
- **Trust is WoT-derived, never granted by the client.** Selectability comes from a curator/host
  vouching (their trusted-arbiter set), not from the act of announcing and not from any allowlist in
  the app. The flow *surfaces* this and explicitly refuses to fake selectability — it does not let an
  arbiter self-vouch.
- **No load-bearing default.** Any pointer the flow gives toward "how to get vouched" is a plain,
  overridable convenience (the same curator/host mechanism a forker can repoint at their own host);
  it must not imply a dependency on a specific curator, relay, or our infrastructure.
- **Disclosure over enforcement.** Arbiter identity stays surfaced wherever an arbiter is chosen, so
  the WoT can judge — no hidden or special-cased arbiter.

## Open questions

- **Repeat-visit affordance:** how much should the entry point reflect an already-announced service
  — a simple "you've announced a service" acknowledgement, or a richer view of/edit path to it?
  (PO leans minimal for v1: acknowledge it exists; full management is out of scope above.)
- **Minimal terms:** the fee model patrons need to evaluate an arbiter (flat vs percentage) already
  exists in the protocol/announcement shape — confirm the minimal set the flow must collect with the
  Architect, without over-asking.
- **Where the "how to get vouched" pointer leads:** the About page's curator section, an external
  curator/Brainstorm pointer, or both — settle the least-coupled option.

## Linked artifacts
- Intake: `.pi/engineering-team/stories/_intake.md` — 2026-06-04 "Become an Arbiter (Grantless flow)"
- ADR: (filled in after Architecture phase)
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
