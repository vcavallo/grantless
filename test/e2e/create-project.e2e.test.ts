import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from './relay';
import { genAccount, publish, query, publishCurationList } from './harness';
import {
  buildTaskProposalTemplate,
  parseTaskProposal,
  CATALLAX_KINDS,
} from '@/lib/catallax';
import { resolveCuratorApplicants, GRANTLESS_APPLICANTS_SLUG } from '@/lib/grantless';

// Real-event e2e for Story 5: build a project proposal with the app's pure builder,
// publish it (signed by the grantee) to a live local strfry, then read it back and
// run the app parser/resolver over the real events — proving the created event is
// valid on a real relay, parser-compatible, and would surface under the grantee.
describe('create a project (real events on local strfry)', () => {
  const patron = genAccount(); // the grantee
  const curator = genAccount();
  const ta = genAccount(); // list-publishing agent
  const D = 'grantless-create-1';

  beforeAll(async () => {
    await relayUp();
    // The grantee is in this curator's applicants list (so it would render under them).
    publishCurationList(RELAY_URL, {
      taSec: ta.sec,
      observer: curator.pub,
      slug: GRANTLESS_APPLICANTS_SLUG,
      members: [patron.pub],
    });
    // Build the proposal exactly as the form will, then publish it signed by the grantee.
    const tmpl = buildTaskProposalTemplate({
      d: D,
      patronPubkey: patron.pub,
      title: 'Reproducible builds for the wallet',
      description: 'Make the build bit-for-bit reproducible.',
      requirements: 'CI proof + docs.',
      amount: '75000',
      status: 'proposed',
      fundingType: 'crowdfunding',
      categories: ['dev'],
    });
    publish(RELAY_URL, { kind: tmpl.kind, content: tmpl.content, tags: tmpl.tags, sec: patron.sec });
  }, 120_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  it('publishes a parseable proposed/crowdfunding 33401 authored by the grantee', async () => {
    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [D] });
    expect(events).toHaveLength(1);
    const event = events[0];
    // Authored by the grantee, and tagged catallax so useTaskProposals would fetch it.
    expect(event.pubkey).toBe(patron.pub);
    expect(event.tags.some((t) => t[0] === 't' && t[1] === 'catallax')).toBe(true);

    const parsed = parseTaskProposal(event);
    expect(parsed).not.toBeNull();
    expect(parsed?.patronPubkey).toBe(patron.pub);
    expect(parsed?.status).toBe('proposed');
    expect(parsed?.fundingType).toBe('crowdfunding');
    expect(parsed?.amount).toBe('75000');
  });

  it('creates no arbiter and no goal at proposal time (deferred to Stories 6–7)', async () => {
    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [D] });
    const parsed = parseTaskProposal(events[0]);
    expect(parsed?.arbiterPubkey).toBeUndefined();
    expect(parsed?.goalId).toBeUndefined();
  });

  it('is authored by the patron, so it passes the authorized-updater check', async () => {
    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [D] });
    const parsed = parseTaskProposal(events[0]);
    expect(events[0].pubkey).toBe(parsed?.patronPubkey);
  });

  it('would render under the grantee in the selected curator’s browse', async () => {
    const lists = await query(RELAY_URL, { kinds: [30392] });
    expect(resolveCuratorApplicants(lists, curator.pub)).toContain(patron.pub);
  });
});
