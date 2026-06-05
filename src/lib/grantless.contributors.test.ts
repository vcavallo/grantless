import { describe, it, expect } from 'vitest';
import { aggregateContributors } from './grantless';
import type { GoalProgress, GoalContributor } from './catallax';

// Unit tests for the pure curator-wide contributor aggregator (Story 14 / ADR 0013).
// Failing until aggregateContributors is implemented in lib/grantless.ts.

const A = 'a'.padEnd(64, '0');
const B = 'b'.padEnd(64, '1');
const C = 'c'.padEnd(64, '2');

function contributor(pubkey: string, amountSats: number, i = 0): GoalContributor {
  return { pubkey, zapReceiptId: `r${i}`, amountSats, percentage: 0, timestamp: 0 };
}
function goal(contributors: GoalContributor[]): GoalProgress {
  return {
    goalId: 'g',
    targetSats: 0,
    raisedSats: 0,
    percentComplete: 0,
    isGoalMet: false,
    contributors,
  };
}

describe('aggregateContributors', () => {
  it('sums a contributor across multiple goals', () => {
    const result = aggregateContributors([
      goal([contributor(A, 100), contributor(B, 200, 1)]),
      goal([contributor(A, 50, 2)]),
    ]);
    const a = result.find((r) => r.pubkey === A);
    expect(a?.totalSats).toBe(150);
  });

  it('ranks contributors by total contributed, highest first', () => {
    const result = aggregateContributors([
      goal([contributor(A, 100), contributor(B, 200, 1), contributor(C, 50, 2)]),
      goal([contributor(A, 100, 3)]), // A now 200, tied-ish but B is 200 too
      goal([contributor(B, 10, 4)]), // B 210
    ]);
    expect(result.map((r) => r.pubkey)).toEqual([B, A, C]); // 210, 200, 50
    expect(result[0].totalSats).toBe(210);
    expect(result[2].totalSats).toBe(50);
  });

  it('returns an empty list for no goals (and goals with no contributors)', () => {
    expect(aggregateContributors([])).toEqual([]);
    expect(aggregateContributors([goal([])])).toEqual([]);
  });

  it('does not privilege any pubkey — identical sats sort deterministically and all appear', () => {
    const result = aggregateContributors([goal([contributor(A, 100), contributor(B, 100, 1)])]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.totalSats === 100)).toBe(true);
    expect(result.map((r) => r.pubkey).sort()).toEqual([A, B].sort());
  });
});
