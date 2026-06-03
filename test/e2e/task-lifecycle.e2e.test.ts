import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from './relay';
import { genAccount, publish, query, publishArbiter } from './harness';
import {
  buildTaskProposalTemplate,
  parseTaskProposal,
  parseTaskConclusion,
  markTaskStatus,
  assignWorker,
  buildTaskConclusionTemplate,
  buildMockZapReceiptTemplate,
  CATALLAX_KINDS,
  type TaskProposal,
} from '@/lib/catallax';

// Real-event e2e for Story 6.5: drive a task through the whole lifecycle using the
// app's own transition + conclusion builders, each transition signed by the acting
// role, asserting each step is authoritative on a live local strfry.
describe('task lifecycle via the app builders (real events on local strfry)', () => {
  const patron = genAccount();
  const arbiter = genAccount();
  const worker = genAccount();
  const D = 'lifecycle-1';
  const taskCoord = `${CATALLAX_KINDS.TASK_PROPOSAL}:${patron.pub}:${D}`;
  let svcCoord = '';

  const latest = async (): Promise<TaskProposal> => {
    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [D] });
    const parsed = events
      .map(parseTaskProposal)
      .filter((t): t is TaskProposal => t !== null && t.patronPubkey === patron.pub && t.d === D);
    return parsed.reduce((a, b) => (b.created_at > a.created_at ? b : a));
  };
  const publishTmpl = (tmpl: { kind: number; content: string; tags: string[][] }, sec: string) =>
    publish(RELAY_URL, { kind: tmpl.kind, content: tmpl.content, tags: tmpl.tags, sec });

  beforeAll(async () => {
    await relayUp();
    svcCoord = publishArbiter(RELAY_URL, { sec: arbiter.sec, d: 'svc' }).coord;
    // Proposed task with an arbiter already assigned.
    publishTmpl(
      buildTaskProposalTemplate({
        d: D, patronPubkey: patron.pub, title: 'Lifecycle', description: 'D', requirements: 'R',
        amount: '50000', status: 'proposed', fundingType: 'crowdfunding',
        arbiterPubkey: arbiter.pub, arbiterService: svcCoord,
      }),
      patron.sec,
    );
  }, 120_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  it('patron marks the task funded', async () => {
    publishTmpl(markTaskStatus(await latest(), 'funded'), patron.sec);
    expect((await latest()).status).toBe('funded');
  });

  it('patron assigns a worker → in_progress', async () => {
    publishTmpl(assignWorker(await latest(), worker.pub), patron.sec);
    const t = await latest();
    expect(t.status).toBe('in_progress');
    expect(t.workerPubkey).toBe(worker.pub);
  });

  it('worker marks the work submitted', async () => {
    publishTmpl(markTaskStatus(await latest(), 'submitted'), worker.sec);
    expect((await latest()).status).toBe('submitted');
  });

  it('arbiter concludes: mocked payout + 3402 + concluded', async () => {
    const submitted = await latest();
    // 1) mocked payout receipt to the worker
    const payout = publishTmpl(
      buildMockZapReceiptTemplate({ senderPubkey: arbiter.pub, recipient: worker.pub, amountSats: 50000, referencedId: taskCoord }),
      arbiter.sec,
    );
    // 2) the 3402 conclusion referencing the task + payout
    const conclusion = publishTmpl(
      buildTaskConclusionTemplate({
        taskCoord, taskId: submitted.id, payoutReceiptId: payout.id,
        patron: patron.pub, arbiter: arbiter.pub, worker: worker.pub, resolution: 'successful',
      }),
      arbiter.sec,
    );
    // 3) task flips to concluded (arbiter is an authorized updater)
    publishTmpl(markTaskStatus(submitted, 'concluded'), arbiter.sec);

    expect((await latest()).status).toBe('concluded');

    const concs = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_CONCLUSION], ids: [conclusion.id] });
    expect(concs).toHaveLength(1);
    const parsed = parseTaskConclusion(concs[0]);
    expect(parsed?.resolution).toBe('successful');
    expect(parsed?.taskReference).toBe(taskCoord);
    expect(parsed?.payoutZapReceiptId).toBe(payout.id);
    expect(parsed?.taskProposalId).toBe(submitted.id);
  });
});
