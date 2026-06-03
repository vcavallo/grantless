import {
  anchorClock,
  publish,
  publishArbiter,
  publishCurationList,
  publishTask,
  publishGoal,
  mockZapReceipt,
  publishConclusion,
} from '../e2e/harness';
import { ROSTER, allSeedAccounts, type SeedAccount } from './accounts';

// Lays down a fixed, reproducible Grantless world on a local relay: profiles,
// both curation lists (observer/source-tag), arbiter announcements, and projects
// spanning every lifecycle status (with mocked funding + conclusions). Pure
// orchestration over the Story-2 nak harness — no new event-shaping logic.
//
// The target relay is a parameter, never hardcoded: `runSeed` behaves identically
// against any relay, and no seeded key is privileged (Grantless prime directive).

export interface SeededTask {
  d: string;
  patron: string;
  status: string;
  worker?: string;
}

export interface SeedSummary {
  profiles: number;
  curationLists: number;
  arbiters: number;
  tasks: SeededTask[];
  goals: number;
  receipts: number;
  conclusions: number;
}

const STATUS_ORDER = ['proposed', 'funded', 'in_progress', 'submitted', 'concluded'] as const;
type Status = (typeof STATUS_ORDER)[number];

interface ProjectSpec {
  d: string;
  title: string;
  patron: SeedAccount;
  arbiter: SeedAccount;
  /** Worker for in_progress+; may equal the patron (self-assignment). */
  worker?: SeedAccount;
  target: Status;
  amount: string;
}

/**
 * The fixed project table. Covers every status, spreads across both applicants
 * and both arbiters, and includes one self-assigned project (Bob is his own
 * worker) plus the separate worker (Carol) on others. The concluded project is
 * driven through its whole lifecycle, signed by each acting role in turn, so
 * the relay holds a real revision history and latest-wins is exercised.
 */
function projectSpecs(): ProjectSpec[] {
  const [alice, bob] = ROSTER.applicants;
  const [dave, erin] = ROSTER.arbiters;
  const carol = ROSTER.worker;
  return [
    { d: 'seed-proposed-alice', title: 'Reproducible builds for the wallet', patron: alice, arbiter: dave, target: 'proposed', amount: '50000' },
    { d: 'seed-funded-bob', title: 'Accessibility pass on the onboarding flow', patron: bob, arbiter: erin, target: 'funded', amount: '80000' },
    { d: 'seed-inprogress-alice', title: 'Offline-first sync for notes', patron: alice, arbiter: erin, worker: carol, target: 'in_progress', amount: '120000' },
    { d: 'seed-submitted-bob-self', title: 'Self-hosted relay quickstart guide', patron: bob, arbiter: dave, worker: bob, target: 'submitted', amount: '60000' },
    { d: 'seed-concluded-alice', title: 'NIP-44 encryption migration', patron: alice, arbiter: dave, worker: carol, target: 'concluded', amount: '100000' },
  ];
}

/** Signer for a given status transition — the role that actually acts. */
function signerFor(status: Status, spec: ProjectSpec): SeedAccount {
  if (status === 'submitted') return spec.worker ?? spec.patron;
  if (status === 'concluded') return spec.arbiter;
  return spec.patron; // proposed / funded / in_progress are patron-driven
}

export async function runSeed(relayUrl: string): Promise<SeedSummary> {
  // Backdate all seeded events ~1h into the past (incrementing) so the lifecycle's
  // relative order is preserved but any later real-time action (a user advancing a
  // seeded task) always wins the latest-wins race.
  anchorClock(Math.floor(Date.now() / 1000) - 3600);

  const summary: SeedSummary = {
    profiles: 0,
    curationLists: 0,
    arbiters: 0,
    tasks: [],
    goals: 0,
    receipts: 0,
    conclusions: 0,
  };

  // 1. Profiles for everyone, so the browser shows names, not just fallbacks.
  for (const acct of allSeedAccounts()) {
    publish(relayUrl, {
      kind: 0,
      content: JSON.stringify({ name: acct.name, about: `Grantless dev-seed account (${acct.name}).` }),
      sec: acct.sec,
    });
    summary.profiles++;
  }

  // 2. Arbiter announcements (one service each). Remember the coordinates so
  //    tasks can reference the arbiter's service.
  const serviceCoord = new Map<string, string>();
  for (const arb of ROSTER.arbiters) {
    const { coord } = publishArbiter(relayUrl, { sec: arb.sec, d: 'svc-grantless' });
    serviceCoord.set(arb.pub, coord);
    summary.arbiters++;
  }

  // 3. Curation lists, signed by the list agent, observed by the curator —
  //    exactly the shape Story 4's selector will resolve.
  publishCurationList(relayUrl, {
    taSec: ROSTER.ta.sec,
    observer: ROSTER.curator.pub,
    slug: 'grantless-applicants',
    members: ROSTER.applicants.map((a) => a.pub),
  });
  publishCurationList(relayUrl, {
    taSec: ROSTER.ta.sec,
    observer: ROSTER.curator.pub,
    slug: 'grantless-arbiter',
    members: ROSTER.arbiters.map((a) => a.pub),
  });
  // A second curator with a deliberately different world — fewer applicants and a
  // different arbiter set — so switching curators visibly changes both.
  publishCurationList(relayUrl, {
    taSec: ROSTER.ta.sec,
    observer: ROSTER.curator2.pub,
    slug: 'grantless-applicants',
    members: [ROSTER.applicants[1].pub], // Bob only (not Alice)
  });
  publishCurationList(relayUrl, {
    taSec: ROSTER.ta.sec,
    observer: ROSTER.curator2.pub,
    slug: 'grantless-arbiter',
    members: [ROSTER.arbiters[1].pub], // Erin only (not Dave)
  });
  summary.curationLists += 4;

  // 4. Projects across every status.
  for (const spec of projectSpecs()) {
    await seedProject(relayUrl, spec, serviceCoord, summary);
  }

  return summary;
}

async function seedProject(
  relayUrl: string,
  spec: ProjectSpec,
  serviceCoord: Map<string, string>,
  summary: SeedSummary,
): Promise<void> {
  const taskCoord = `33401:${spec.patron.pub}:${spec.d}`;
  const arbiterService = serviceCoord.get(spec.arbiter.pub);
  const targetIndex = STATUS_ORDER.indexOf(spec.target);

  let goalId: string | undefined;
  let submittedTaskId: string | undefined;
  let payoutReceiptId: string | undefined;

  const baseTags = () => ({
    d: spec.d,
    patron: spec.patron.pub,
    arbiter: spec.arbiter.pub,
    arbiterService,
    amount: spec.amount,
    fundingType: 'crowdfunding',
    title: spec.title,
    description: `${spec.title} — a seeded Grantless project.`,
  });

  for (let i = 0; i <= targetIndex; i++) {
    const status = STATUS_ORDER[i] as Status;

    // Funding artifacts appear at the moment the project becomes funded.
    if (status === 'funded' && !goalId) {
      const goal = publishGoal(relayUrl, {
        sec: spec.patron.sec,
        taskCoord,
        arbiter: spec.arbiter.pub,
        amount: spec.amount,
      });
      goalId = goal.id;
      summary.goals++;
      // Each funder contributes a (mocked) zap toward the goal, custodied by the arbiter.
      const share = String(Math.ceil(parseInt(spec.amount, 10) / ROSTER.funders.length));
      for (const funder of ROSTER.funders) {
        mockZapReceipt(relayUrl, { sec: funder.sec, goalId, amount: share, recipient: spec.arbiter.pub });
        summary.receipts++;
      }
    }

    // The arbiter pays the worker (mocked) just before concluding.
    if (status === 'concluded') {
      const payout = mockZapReceipt(relayUrl, {
        sec: spec.arbiter.sec,
        goalId: goalId ?? taskCoord,
        amount: spec.amount,
        recipient: (spec.worker ?? spec.patron).pub,
      });
      payoutReceiptId = payout.id;
      summary.receipts++;
    }

    const includeWorker = i >= STATUS_ORDER.indexOf('in_progress') && spec.worker;
    const { id } = publishTask(relayUrl, {
      sec: signerFor(status, spec).sec,
      ...baseTags(),
      worker: includeWorker ? spec.worker!.pub : undefined,
      status,
      goalId,
    });
    if (status === 'submitted') submittedTaskId = id;

    // Conclude after the concluded task version is on the relay.
    if (status === 'concluded') {
      publishConclusion(relayUrl, {
        sec: spec.arbiter.sec,
        taskCoord,
        taskId: submittedTaskId ?? id,
        payoutReceiptId: payoutReceiptId!,
        patron: spec.patron.pub,
        arbiter: spec.arbiter.pub,
        worker: (spec.worker ?? spec.patron).pub,
        resolution: 'successful',
      });
      summary.conclusions++;
    }
  }

  summary.tasks.push({
    d: spec.d,
    patron: spec.patron.pub,
    status: spec.target,
    worker: spec.worker?.pub,
  });
}
