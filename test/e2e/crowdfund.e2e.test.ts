import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from './relay';
import { genAccount, publish, query, publishArbiter } from './harness';
import {
  buildTaskProposalTemplate,
  buildZapGoalTemplate,
  buildMockZapReceiptTemplate,
  taskProposalToInput,
  parseTaskProposal,
  calculateGoalProgress,
  CATALLAX_KINDS,
  type TaskProposal,
} from '@/lib/catallax';

// Real-event e2e for Story 7: open a crowdfund goal, contribute (mocked), and
// compute progress from the receipts on a live local strfry.
describe('crowdfund a task (real events on local strfry)', () => {
  const patron = genAccount();
  const arbiter = genAccount();
  const funderA = genAccount();
  const funderB = genAccount();
  const D = 'crowdfund-1';
  let goalId = '';

  const publishTmpl = (tmpl: { kind: number; content: string; tags: string[][] }, sec: string) =>
    publish(RELAY_URL, { kind: tmpl.kind, content: tmpl.content, tags: tmpl.tags, sec });
  const latestTask = async (): Promise<TaskProposal> => {
    const events = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_PROPOSAL], '#d': [D] });
    const parsed = events
      .map(parseTaskProposal)
      .filter((t): t is TaskProposal => t !== null && t.patronPubkey === patron.pub && t.d === D);
    return parsed.reduce((a, b) => (b.created_at > a.created_at ? b : a));
  };

  beforeAll(async () => {
    await relayUp();
    const svc = publishArbiter(RELAY_URL, { sec: arbiter.sec, d: 'svc' }).coord;
    publishTmpl(
      buildTaskProposalTemplate({
        d: D, patronPubkey: patron.pub, title: 'Crowdfund me', description: 'd', requirements: 'r',
        amount: '100', status: 'proposed', fundingType: 'crowdfunding', arbiterPubkey: arbiter.pub, arbiterService: svc,
      }),
      patron.sec,
    );
    // Open for funding: publish the 9041 goal (relays = the local relay), then link it.
    goalId = publishTmpl(
      buildZapGoalTemplate({ title: 'Crowdfund me', description: 'd', amount: '100', d: D }, patron.pub, arbiter.pub, [RELAY_URL]),
      patron.sec,
    ).id;
    publishTmpl(buildTaskProposalTemplate({ ...taskProposalToInput(await latestTask()), goalId }), patron.sec);
    // Two funders contribute (mocked).
    publishTmpl(buildMockZapReceiptTemplate({ senderPubkey: funderA.pub, recipient: arbiter.pub, amountSats: 60, referencedId: goalId }), funderA.sec);
    publishTmpl(buildMockZapReceiptTemplate({ senderPubkey: funderB.pub, recipient: arbiter.pub, amountSats: 50, referencedId: goalId }), funderB.sec);
  }, 120_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  it('links the goal to the task (latest version carries the goal tag)', async () => {
    expect((await latestTask()).goalId).toBe(goalId);
  });

  it('computes funding progress from the contributions, reaching the goal', async () => {
    const goals = await query(RELAY_URL, { kinds: [9041], ids: [goalId] });
    expect(goals).toHaveLength(1);
    const receipts = await query(RELAY_URL, { kinds: [9735], '#e': [goalId] });
    expect(receipts.length).toBeGreaterThanOrEqual(2);

    const progress = calculateGoalProgress(goals[0], receipts);
    expect(progress.targetSats).toBe(100);
    expect(progress.raisedSats).toBe(110); // 60 + 50
    expect(progress.isGoalMet).toBe(true);
    expect(progress.contributors).toHaveLength(2);
  });
});
