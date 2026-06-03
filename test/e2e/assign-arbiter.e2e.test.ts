import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from './relay';
import { genAccount, publish, query, publishCurationList, publishArbiter } from './harness';
import {
  buildTaskProposalTemplate,
  parseTaskProposal,
  taskProposalToInput,
  CATALLAX_KINDS,
  type TaskProposal,
} from '@/lib/catallax';
import { resolveCuratorApplicants, GRANTLESS_ARBITER_SLUG } from '@/lib/grantless';

// Real-event e2e for Story 6: a patron assigns a curator-vouched arbiter to their
// proposed task by re-publishing the 33401 (patron-signed) with the arbiter tags.
describe('assign an arbiter (real events on local strfry)', () => {
  const patron = genAccount();
  const curator = genAccount();
  const ta = genAccount();
  const dave = genAccount();
  const erin = genAccount();
  const D = 'assign-arbiter-1';

  // Latest authoritative version of our task.
  const latest = async (): Promise<TaskProposal | null> => {
    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [D] });
    const parsed = events
      .map(parseTaskProposal)
      .filter((t): t is TaskProposal => t !== null && t.patronPubkey === patron.pub && t.d === D);
    return parsed.length ? parsed.reduce((a, b) => (b.created_at > a.created_at ? b : a)) : null;
  };

  beforeAll(async () => {
    await relayUp();
    // Curator vouches for Dave and Erin as arbiters; both have a 33400.
    publishCurationList(RELAY_URL, {
      taSec: ta.sec,
      observer: curator.pub,
      slug: GRANTLESS_ARBITER_SLUG,
      members: [dave.pub, erin.pub],
    });
    publishArbiter(RELAY_URL, { sec: dave.sec, d: 'svc' });
    publishArbiter(RELAY_URL, { sec: erin.sec, d: 'svc' });
    // The patron posts a proposed, arbiter-less project (Story 5).
    const proposal = buildTaskProposalTemplate({
      d: D, patronPubkey: patron.pub, title: 'Offline sync', description: 'desc', requirements: 'reqs',
      amount: '50000', status: 'proposed', fundingType: 'crowdfunding',
    });
    publish(RELAY_URL, { kind: proposal.kind, content: proposal.content, tags: proposal.tags, sec: patron.sec });
  }, 120_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  it("resolves the curator's grantless-arbiter list (signer-independent)", async () => {
    const events = await query(RELAY_URL, { kinds: [30392] });
    expect(resolveCuratorApplicants(events, curator.pub, GRANTLESS_ARBITER_SLUG)).toEqual([dave.pub, erin.pub]);
    // The list is TA-signed, not curator-signed — resolving by the TA finds nothing.
    expect(resolveCuratorApplicants(events, ta.pub, GRANTLESS_ARBITER_SLUG)).toEqual([]);
  });

  it('assigns an arbiter by re-publishing the patron-signed task, status still proposed', async () => {
    const before = await latest();
    expect(before?.arbiterPubkey).toBeUndefined();

    const serviceCoord = `${CATALLAX_KINDS.ARBITER_ANNOUNCEMENT}:${dave.pub}:svc`;
    const updated = buildTaskProposalTemplate({
      ...taskProposalToInput(before!),
      arbiterPubkey: dave.pub,
      arbiterService: serviceCoord,
    });
    publish(RELAY_URL, { kind: updated.kind, content: updated.content, tags: updated.tags, sec: patron.sec });

    const after = await latest();
    expect(after?.arbiterPubkey).toBe(dave.pub);
    expect(after?.arbiterService).toBe(serviceCoord);
    expect(after?.status).toBe('proposed');
    expect(after?.patronPubkey).toBe(patron.pub);
    expect(after?.amount).toBe('50000');
  });

  it('re-assigns to a different arbiter, latest version winning', async () => {
    const current = await latest();
    const serviceCoord = `${CATALLAX_KINDS.ARBITER_ANNOUNCEMENT}:${erin.pub}:svc`;
    const updated = buildTaskProposalTemplate({
      ...taskProposalToInput(current!),
      arbiterPubkey: erin.pub,
      arbiterService: serviceCoord,
    });
    publish(RELAY_URL, { kind: updated.kind, content: updated.content, tags: updated.tags, sec: patron.sec });

    const after = await latest();
    expect(after?.arbiterPubkey).toBe(erin.pub);
    expect(after?.arbiterService).toBe(serviceCoord);
  });
});
