import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from '../e2e/relay';
import { query, resolveCuration, latestTask } from '../e2e/harness';
import { runSeed, type SeedSummary } from './seed';
import { ROSTER } from './accounts';
import { CATALLAX_KINDS } from '@/lib/catallax';

// Real-event e2e: run the dev seed against a fresh local strfry and assert the
// browsable world it lays down. Authored/queried with nak; no mocks except the
// Lightning payments (fabricated 9735s), exactly as in the happy-path harness.
describe('dev seed (real events on local strfry)', () => {
  let summary: SeedSummary;

  beforeAll(async () => {
    await relayUp();
    summary = await runSeed(RELAY_URL);
  }, 180_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  const allPubs = [
    ROSTER.ta,
    ROSTER.curator,
    ...ROSTER.applicants,
    ROSTER.worker,
    ...ROSTER.arbiters,
    ...ROSTER.funders,
  ].map((a) => a.pub);

  it('publishes a kind-0 profile for every account in the cast', async () => {
    const profiles = await query(RELAY_URL, { kinds: [0], authors: allPubs });
    const withProfile = new Set(profiles.map((e) => e.pubkey));
    for (const pub of allPubs) {
      expect(withProfile.has(pub), `profile for ${pub}`).toBe(true);
    }
  });

  it("resolves the curator's grantless-applicants list to exactly the two applicants", async () => {
    const members = await resolveCuration(RELAY_URL, {
      curator: ROSTER.curator.pub,
      slug: 'grantless-applicants',
    });
    expect(members).toEqual(ROSTER.applicants.map((a) => a.pub));
  });

  it("resolves the curator's grantless-arbiter list to exactly the two arbiters", async () => {
    const members = await resolveCuration(RELAY_URL, {
      curator: ROSTER.curator.pub,
      slug: 'grantless-arbiter',
    });
    expect(members).toEqual(ROSTER.arbiters.map((a) => a.pub));
  });

  it('publishes an arbiter announcement for each arbiter', async () => {
    const announcements = await query(RELAY_URL, {
      kinds: [CATALLAX_KINDS.ARBITER_ANNOUNCEMENT],
    });
    const authors = new Set(announcements.map((e) => e.pubkey));
    for (const arb of ROSTER.arbiters) {
      expect(authors.has(arb.pub), `33400 from ${arb.name}`).toBe(true);
    }
  });

  it('seeds projects covering every lifecycle status, each authoritative (latest wins)', async () => {
    const statuses = new Set<string>();
    for (const task of summary.tasks) {
      const events = await query(RELAY_URL, {
        kinds: [CATALLAX_KINDS.TASK_PROPOSAL],
        '#d': [task.d],
      });
      const current = latestTask(events, { patron: task.patron, d: task.d });
      expect(current?.status, `latest status of ${task.d}`).toBe(task.status);
      if (current) statuses.add(current.status);
    }
    expect([...statuses].sort()).toEqual(
      ['concluded', 'funded', 'in_progress', 'proposed', 'submitted'],
    );
  });

  it('publishes at least one project through a full revision chain (stale revisions do not win)', async () => {
    const concluded = summary.tasks.find((t) => t.status === 'concluded');
    expect(concluded, 'a concluded project exists').toBeDefined();
    const events = await query(RELAY_URL, {
      kinds: [CATALLAX_KINDS.TASK_PROPOSAL],
      '#d': [concluded!.d],
    });
    // The chain re-published the replaceable 33401 across statuses.
    expect(events.length).toBeGreaterThan(1);
    const current = latestTask(events, { patron: concluded!.patron, d: concluded!.d });
    expect(current?.status).toBe('concluded');
  });

  it('gives funded-or-later projects a zap goal with mocked receipts', async () => {
    const goals = await query(RELAY_URL, { kinds: [9041] });
    const receipts = await query(RELAY_URL, { kinds: [9735] });
    expect(goals.length).toBeGreaterThanOrEqual(1);
    // At least one receipt per funder for the crowdfund.
    expect(receipts.length).toBeGreaterThanOrEqual(ROSTER.funders.length);
  });

  it('concludes the concluded project with a 3402 referencing the task and a payout', async () => {
    const concluded = summary.tasks.find((t) => t.status === 'concluded')!;
    const coord = `${CATALLAX_KINDS.TASK_PROPOSAL}:${concluded.patron}:${concluded.d}`;
    const conclusions = await query(RELAY_URL, { kinds: [CATALLAX_KINDS.TASK_CONCLUSION] });
    const match = conclusions.find((e) =>
      e.tags.some((t) => t[0] === 'a' && t[1] === coord),
    );
    expect(match, 'a 3402 references the concluded task coord').toBeDefined();
    const eRefs = match!.tags.filter((t) => t[0] === 'e').map((t) => t[1]);
    expect(eRefs.length, 'conclusion references the payout + task by id').toBeGreaterThanOrEqual(2);
  });

  it('seeds both a self-assigned (proposer = worker) and a separate-worker project', async () => {
    const selfAssigned = summary.tasks.some((t) => t.worker && t.worker === t.patron);
    const separateWorker = summary.tasks.some((t) => t.worker === ROSTER.worker.pub);
    expect(selfAssigned, 'a proposer=worker project').toBe(true);
    expect(separateWorker, 'a separate-worker project').toBe(true);
  });
});
