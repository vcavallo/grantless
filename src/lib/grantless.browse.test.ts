import { describe, it, expect } from 'vitest';
import type { GoalProgress, TaskProposal, TaskStatus } from './catallax';
import { filterTasks, sortTasks } from './grantless';

function task(o: Partial<TaskProposal>): TaskProposal {
  return {
    id: 'id', pubkey: 'pk', created_at: 0,
    content: { title: 't', description: 'd', requirements: 'r' },
    d: 'd', patronPubkey: 'patron', amount: '1000', categories: [],
    status: 'proposed', fundingType: 'crowdfunding',
    ...o,
  } as TaskProposal;
}
function prog(goalId: string, raised: number, target: number): GoalProgress {
  return {
    goalId, targetSats: target, raisedSats: raised,
    percentComplete: target > 0 ? Math.min((raised / target) * 100, 100) : 0,
    isGoalMet: raised >= target, contributors: [],
  };
}
const ALL: TaskStatus[] = ['proposed', 'funded', 'in_progress', 'submitted', 'concluded'];
const noProgress = new Map<string, GoalProgress>();

describe('filterTasks', () => {
  it('filters by status (e.g. concluded hidden when not selected)', () => {
    const tasks = [task({ status: 'proposed' }), task({ status: 'funded' }), task({ status: 'concluded' })];
    const visible = filterTasks(tasks, { statuses: ['proposed', 'funded', 'in_progress', 'submitted'], seekingFunding: false, needsWorker: false }, noProgress);
    expect(visible.map((t) => t.status)).toEqual(['proposed', 'funded']);
  });

  it('seekingFunding keeps only tasks with a goal that is not met', () => {
    const progress = new Map([['g1', prog('g1', 30, 100)], ['g2', prog('g2', 100, 100)]]);
    const tasks = [
      task({ status: 'proposed', goalId: 'g1' }), // unmet → keep
      task({ status: 'funded', goalId: 'g2' }), // met → drop
      task({ status: 'proposed' }), // no goal → drop
    ];
    const visible = filterTasks(tasks, { statuses: ALL, seekingFunding: true, needsWorker: false }, progress);
    expect(visible.map((t) => t.goalId)).toEqual(['g1']);
  });

  it('needsWorker keeps only funded tasks with no worker', () => {
    const tasks = [
      task({ status: 'funded' }), // keep
      task({ status: 'funded', workerPubkey: 'w' }), // has worker → drop
      task({ status: 'in_progress' }), // not funded → drop
    ];
    const visible = filterTasks(tasks, { statuses: ALL, seekingFunding: false, needsWorker: true }, noProgress);
    expect(visible).toHaveLength(1);
    expect(visible[0].status).toBe('funded');
    expect(visible[0].workerPubkey).toBeUndefined();
  });
});

describe('sortTasks', () => {
  it('sorts by newest (created_at desc)', () => {
    const tasks = [task({ d: 'a', created_at: 1 }), task({ d: 'b', created_at: 3 }), task({ d: 'c', created_at: 2 })];
    expect(sortTasks(tasks, 'newest', noProgress).map((t) => t.d)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by largest goal (amount desc)', () => {
    const tasks = [task({ d: 'a', amount: '500' }), task({ d: 'b', amount: '9000' }), task({ d: 'c', amount: '1000' })];
    expect(sortTasks(tasks, 'amount', noProgress).map((t) => t.d)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by funding progress (most-funded first; no-goal last)', () => {
    const progress = new Map([['g1', prog('g1', 80, 100)], ['g2', prog('g2', 20, 100)]]);
    const tasks = [
      task({ d: 'low', goalId: 'g2' }),
      task({ d: 'none' }), // no goal → last
      task({ d: 'high', goalId: 'g1' }),
    ];
    expect(sortTasks(tasks, 'funding', progress).map((t) => t.d)).toEqual(['high', 'low', 'none']);
  });
});
