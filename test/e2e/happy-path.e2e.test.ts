import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from './relay';
import {
  genAccount,
  publish,
  query,
  publishCurationList,
  resolveCuration,
  publishArbiter,
  publishTask,
  publishGoal,
  mockZapReceipt,
  publishConclusion,
  latestTask,
} from './harness';
import { CATALLAX_KINDS } from '@/lib/catallax';

// Real-event e2e against a live local strfry. Authors with nak, asserts on what
// the relay actually returns. No mocks (except Lightning payments).
describe('Grantless e2e harness (real events on local strfry)', () => {
  beforeAll(async () => {
    await relayUp();
  }, 120_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  it('starts from a clean relay (run isolation)', async () => {
    const events = await query(RELAY_URL, { kinds: [1], limit: 5 });
    expect(events).toHaveLength(0);
  });

  it('round-trips an arbitrary event', async () => {
    const acct = genAccount();
    const content = `roundtrip-${Date.now()}`;
    await publish(RELAY_URL, { kind: 1, content, sec: acct.sec });
    const events = await query(RELAY_URL, { kinds: [1], authors: [acct.pub] });
    expect(events.map((e) => e.content)).toContain(content);
  });

  it("resolves a curator's grantless-applicants list via observer + source-tag", async () => {
    const ta = genAccount(); // the publishing agent (≠ curator), as Brainstorm does
    const curator = genAccount();
    const otherCurator = genAccount();
    const a1 = genAccount();
    const a2 = genAccount();

    await publishCurationList(RELAY_URL, {
      taSec: ta.sec,
      observer: curator.pub,
      slug: 'grantless-applicants',
      members: [a1.pub, a2.pub, a1.pub], // duplicate on purpose
    });
    // A different curator + a different slug must not bleed into the result.
    await publishCurationList(RELAY_URL, {
      taSec: ta.sec,
      observer: otherCurator.pub,
      slug: 'grantless-applicants',
      members: [genAccount().pub],
    });
    await publishCurationList(RELAY_URL, {
      taSec: ta.sec,
      observer: curator.pub,
      slug: 'grantless-arbiter',
      members: [genAccount().pub],
    });

    const members = await resolveCuration(RELAY_URL, {
      curator: curator.pub,
      slug: 'grantless-applicants',
    });
    expect(members).toEqual([a1.pub, a2.pub]); // deduped, ordered, only this curator+slug
  });

  it('runs the full Catallax lifecycle, each transition authoritative', async () => {
    const patron = genAccount(); // grant applicant
    const worker = genAccount();
    const arbiter = genAccount();
    const funders = [genAccount(), genAccount(), genAccount()];

    // Arbiter announces a service.
    const svc = await publishArbiter(RELAY_URL, { sec: arbiter.sec, d: 'svc-1' });

    // Task proposed.
    const d = 'task-1';
    await publishTask(RELAY_URL, {
      sec: patron.sec,
      d,
      patron: patron.pub,
      arbiter: arbiter.pub,
      arbiterService: svc.coord,
      amount: '50000',
      status: 'proposed',
      fundingType: 'crowdfunding',
    });
    const expectStatus = async (status: string) => {
      const events = await query(RELAY_URL, {
        kinds: [CATALLAX_KINDS.TASK_PROPOSAL],
        '#d': [d],
      });
      const current = latestTask(events, { patron: patron.pub, d });
      expect(current?.status).toBe(status);
      return current;
    };
    await expectStatus('proposed');

    // Crowdfund: a 9041 goal + mocked zap receipts from each funder.
    const goal = await publishGoal(RELAY_URL, {
      sec: patron.sec,
      taskCoord: `33401:${patron.pub}:${d}`,
      arbiter: arbiter.pub,
      amount: '50000',
    });
    for (const funder of funders) {
      await mockZapReceipt(RELAY_URL, {
        sec: funder.sec,
        goalId: goal.id,
        amount: '20000',
        recipient: arbiter.pub,
      });
    }

    // Funded (references a zap receipt).
    await publishTask(RELAY_URL, {
      sec: patron.sec, d, patron: patron.pub, arbiter: arbiter.pub,
      arbiterService: svc.coord, amount: '50000', status: 'funded',
      fundingType: 'crowdfunding', goalId: goal.id,
    });
    await expectStatus('funded');

    // Worker assigned → in_progress.
    await publishTask(RELAY_URL, {
      sec: patron.sec, d, patron: patron.pub, arbiter: arbiter.pub, worker: worker.pub,
      arbiterService: svc.coord, amount: '50000', status: 'in_progress',
      fundingType: 'crowdfunding', goalId: goal.id,
    });
    const inProgress = await expectStatus('in_progress');
    expect(inProgress?.workerPubkey).toBe(worker.pub);

    // Submitted.
    await publishTask(RELAY_URL, {
      sec: patron.sec, d, patron: patron.pub, arbiter: arbiter.pub, worker: worker.pub,
      arbiterService: svc.coord, amount: '50000', status: 'submitted',
      fundingType: 'crowdfunding', goalId: goal.id,
    });
    await expectStatus('submitted');

    // Arbiter pays the worker (mocked) and concludes.
    const payout = await mockZapReceipt(RELAY_URL, {
      sec: arbiter.sec, goalId: goal.id, amount: '50000', recipient: worker.pub,
    });
    const conclusion = await publishConclusion(RELAY_URL, {
      sec: arbiter.sec,
      taskCoord: `33401:${patron.pub}:${d}`,
      taskId: (await expectStatus('submitted'))!.id,
      payoutReceiptId: payout.id,
      patron: patron.pub, arbiter: arbiter.pub, worker: worker.pub,
      resolution: 'successful',
    });
    // Task marked concluded.
    await publishTask(RELAY_URL, {
      sec: arbiter.sec, d, patron: patron.pub, arbiter: arbiter.pub, worker: worker.pub,
      arbiterService: svc.coord, amount: '50000', status: 'concluded',
      fundingType: 'crowdfunding', goalId: goal.id,
    });
    await expectStatus('concluded');

    // The 3402 references the task and the payout receipt.
    const concs = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_CONCLUSION], ids: [conclusion.id] });
    expect(concs).toHaveLength(1);
    const eRefs = concs[0].tags.filter((t) => t[0] === 'e').map((t) => t[1]);
    expect(eRefs).toContain(payout.id);
    expect(concs[0].tags.some((t) => t[0] === 'a' && t[1] === `33401:${patron.pub}:${d}`)).toBe(true);
  }, 120_000);

  it('older revision published after a newer one does not win (replaceable correctness)', async () => {
    const patron = genAccount();
    const arbiter = genAccount();
    const d = 'task-replaceable';
    const base = {
      sec: patron.sec, d, patron: patron.pub, arbiter: arbiter.pub, amount: '1000',
    } as const;

    const now = Math.floor(Date.now() / 1000);
    // Newer version (in_progress) at a later timestamp...
    await publishTask(RELAY_URL, { ...base, status: 'in_progress', createdAt: now });
    // ...then a STALE older version (proposed) at an earlier timestamp.
    await publishTask(RELAY_URL, { ...base, status: 'proposed', createdAt: now - 3600 });

    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [d] });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const current = latestTask(events, { patron: patron.pub, d });
    expect(current?.status).toBe('in_progress'); // newest created_at wins, not last-published
  }, 60_000);
});
