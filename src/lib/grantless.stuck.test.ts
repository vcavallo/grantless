import { describe, it, expect } from 'vitest';
import { GRANTLESS_APPLICANTS_SLUG } from './grantless';
// Story 16: stuck-project detection over the data the browse already fetches.
// Pure — no relay. These symbols don't exist yet; this is the red.
import { vouchedApplicantPubkeys, findStuckProjects } from './grantless';
import type { CurationList } from './grantless';
import type { TaskProposal, TaskStatus } from './catallax';

const ALICE = 'a'.repeat(64); // applicant (vouched)
const BOB = 'b'.repeat(64); // applicant (vouched)
const CAROL = 'c'.repeat(64); // NOT in any applicant list (unvouched)
const ARB = 'd'.repeat(64); // an arbiter

function list(members: string[], observer = 'cur'.repeat(16), createdAt = 1): CurationList {
  return { observer, slug: GRANTLESS_APPLICANTS_SLUG, members, createdAt };
}

let seq = 0;
function task(o: { patron: string; arbiter?: string; status?: TaskStatus }): TaskProposal {
  seq += 1;
  return {
    id: `evt-${seq}`,
    pubkey: o.patron,
    created_at: seq,
    content: { title: `Project ${seq}`, description: 'desc', requirements: 'reqs' },
    d: `task-${seq}`,
    patronPubkey: o.patron,
    arbiterPubkey: o.arbiter,
    amount: '1000',
    categories: ['catallax'],
    status: o.status ?? 'proposed',
    fundingType: 'crowdfunding',
  };
}

const ids = (tasks: TaskProposal[]) => tasks.map((t) => t.id).sort();

describe('vouchedApplicantPubkeys', () => {
  it('returns the union of all lists members, deduped', () => {
    const vouched = vouchedApplicantPubkeys([list([ALICE, BOB]), list([BOB], 'cur2'.repeat(16))]);
    expect([...vouched].sort()).toEqual([ALICE, BOB].sort());
  });

  it('returns an empty set when there are no lists', () => {
    expect(vouchedApplicantPubkeys([]).size).toBe(0);
  });
});

describe('findStuckProjects', () => {
  const vouched = new Set([ALICE, BOB]);

  it('lists a project whose creator is in no curator applicant set under unvouched; not a vouched creator', () => {
    const unvouchedTask = task({ patron: CAROL, arbiter: ARB });
    const vouchedTask = task({ patron: ALICE, arbiter: ARB });
    const { unvouched } = findStuckProjects([unvouchedTask, vouchedTask], vouched);
    expect(ids(unvouched)).toEqual([unvouchedTask.id]);
  });

  it('lists a project with no arbiter under arbiterless; not one that has an arbiter (regardless of vouched)', () => {
    const noArb = task({ patron: ALICE });
    const withArb = task({ patron: ALICE, arbiter: ARB });
    const { arbiterless } = findStuckProjects([noArb, withArb], vouched);
    expect(ids(arbiterless)).toEqual([noArb.id]);
  });

  it('surfaces a project that is BOTH unvouched and arbiter-less in both buckets', () => {
    const both = task({ patron: CAROL });
    const { unvouched, arbiterless } = findStuckProjects([both], vouched);
    expect(ids(unvouched)).toEqual([both.id]);
    expect(ids(arbiterless)).toEqual([both.id]);
  });

  it('leaves a vouched-but-arbiter-less project out of unvouched but in arbiterless', () => {
    const t = task({ patron: ALICE });
    const { unvouched, arbiterless } = findStuckProjects([t], vouched);
    expect(ids(unvouched)).toEqual([]);
    expect(ids(arbiterless)).toEqual([t.id]);
  });

  it('excludes concluded projects from both buckets', () => {
    const concluded = task({ patron: CAROL, status: 'concluded' }); // unvouched + arbiter-less + concluded
    const { unvouched, arbiterless } = findStuckProjects([concluded], vouched);
    expect(unvouched).toEqual([]);
    expect(arbiterless).toEqual([]);
  });

  it('returns empty buckets when nothing is stuck', () => {
    const healthy = task({ patron: ALICE, arbiter: ARB });
    expect(findStuckProjects([healthy], vouched)).toEqual({ unvouched: [], arbiterless: [] });
    expect(findStuckProjects([], vouched)).toEqual({ unvouched: [], arbiterless: [] });
  });

  it('treats all pubkeys uniformly — no key is special-cased (openness)', () => {
    const t = task({ patron: BOB, arbiter: ARB });
    // BOB vouched ⇒ not stuck; flip the vouched set and the SAME task becomes unvouched.
    expect(findStuckProjects([t], new Set([ALICE, BOB])).unvouched).toEqual([]);
    expect(ids(findStuckProjects([t], new Set([ALICE])).unvouched)).toEqual([t.id]);
  });
});
