import { describe, it, expect } from 'vitest';
// Story 18: pure gating/parse rules for patron task-editing. Not yet exported —
// this is the red.
import { canEditTask, canEditTaskAmount, parseDeadlineInput } from './grantless';
import type { TaskProposal, TaskStatus } from './catallax';

const PATRON = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);

let seq = 0;
function task(o: { patron?: string; status?: TaskStatus; goalId?: string } = {}): TaskProposal {
  seq += 1;
  return {
    id: `evt-${seq}`,
    pubkey: o.patron ?? PATRON,
    created_at: seq,
    content: { title: `T${seq}`, description: 'd', requirements: 'r' },
    d: `task-${seq}`,
    patronPubkey: o.patron ?? PATRON,
    amount: '50000',
    categories: ['catallax'],
    status: o.status ?? 'proposed',
    fundingType: 'crowdfunding',
    goalId: o.goalId,
  };
}

describe('canEditTask', () => {
  it('is true only for the patron when the task is proposed', () => {
    expect(canEditTask(task({ status: 'proposed' }), PATRON)).toBe(true);
  });

  it('is false for a non-patron viewer', () => {
    expect(canEditTask(task({ status: 'proposed' }), OTHER)).toBe(false);
  });

  it('is false when there is no logged-in viewer', () => {
    expect(canEditTask(task({ status: 'proposed' }), undefined)).toBe(false);
  });

  it('is false once the task is past proposed', () => {
    for (const status of ['funded', 'in_progress', 'submitted', 'concluded'] as TaskStatus[]) {
      expect(canEditTask(task({ status }), PATRON), status).toBe(false);
    }
  });

  it('treats every pubkey identically — no key is special-cased (openness)', () => {
    // Two distinct patrons: each may edit only their own proposed task.
    const mine = task({ patron: PATRON, status: 'proposed' });
    const theirs = task({ patron: OTHER, status: 'proposed' });
    expect(canEditTask(mine, PATRON)).toBe(true);
    expect(canEditTask(mine, OTHER)).toBe(false);
    expect(canEditTask(theirs, OTHER)).toBe(true);
    expect(canEditTask(theirs, PATRON)).toBe(false);
  });
});

describe('canEditTaskAmount', () => {
  it('is true on a proposed task with no goal yet', () => {
    expect(canEditTaskAmount(task({ status: 'proposed' }))).toBe(true);
  });

  it('is false once a goal exists (funding opened)', () => {
    expect(canEditTaskAmount(task({ status: 'proposed', goalId: 'goal-123' }))).toBe(false);
  });

  it('is false when the task is past proposed', () => {
    expect(canEditTaskAmount(task({ status: 'funded' }))).toBe(false);
  });
});

describe('parseDeadlineInput', () => {
  it('parses a YYYY-MM-DD date to a unix-seconds timestamp (UTC midnight)', () => {
    expect(parseDeadlineInput('2030-01-01')).toBe(Math.floor(Date.UTC(2030, 0, 1) / 1000));
  });

  it('returns undefined for empty/whitespace input — never a default date', () => {
    expect(parseDeadlineInput('')).toBeUndefined();
    expect(parseDeadlineInput('   ')).toBeUndefined();
  });

  it('returns undefined for invalid input', () => {
    expect(parseDeadlineInput('not-a-date')).toBeUndefined();
  });
});
