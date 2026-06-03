import { execFileSync } from 'node:child_process';
import type { NostrEvent } from '@nostrify/nostrify';
import { parseTaskProposal, type TaskProposal } from '@/lib/catallax';
import { extractNomineePubkeys } from '@/lib/grantless';

// Thin wrappers over the `nak` CLI: author and query real events on the local
// relay. This is the project's stated testing vocabulary (nak + a real relay).

function nak(args: string[]): string {
  return execFileSync('nak', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 20_000,
    maxBuffer: 32 * 1024 * 1024,
  });
}

export interface Account {
  sec: string;
  pub: string;
}

export function genAccount(): Account {
  const sec = nak(['key', 'generate']).trim();
  const pub = nak(['key', 'public', sec]).trim();
  return { sec, pub };
}

interface PublishOpts {
  kind: number;
  content?: string;
  tags?: string[][];
  sec: string;
  createdAt?: number;
}

// Monotonic created_at: successive replaceable versions must be strictly newer,
// or the relay keeps the first (same-second publishes collide). Real clients hit
// this too; the harness models the "each revision is newer" invariant.
let lastTs = 0;
// Optional anchor. When set (e.g. by the dev seed), timestamps increment from it
// instead of tracking wall clock — so seeded events can be deliberately backdated.
let clockAnchor: number | null = null;
function nextTs(): number {
  if (clockAnchor !== null) {
    lastTs = Math.max(clockAnchor, lastTs + 1);
    return lastTs;
  }
  const now = Math.floor(Date.now() / 1000);
  lastTs = Math.max(now, lastTs + 1);
  return lastTs;
}

/**
 * Anchor `created_at` to a fixed start (used by the dev seed to backdate events).
 * Without this, the monotonic clock can drift *ahead* of wall time when many events
 * publish in the same second — which would make a later real-time action (e.g. a
 * user advancing a seeded task) lose the latest-wins race. Backdating keeps all
 * seeded events safely in the past.
 */
export function anchorClock(startTs: number): void {
  clockAnchor = startTs;
  lastTs = startTs - 1;
}

export function publish(relay: string, o: PublishOpts): { id: string; event: NostrEvent } {
  const createdAt = o.createdAt ?? nextTs();
  const args = ['event', '-k', String(o.kind), '--sec', o.sec, '-c', o.content ?? '', '--created-at', String(createdAt)];
  for (const tag of o.tags ?? []) {
    // nak multi-value tag syntax: -t name=v1;v2;v3
    args.push('-t', `${tag[0]}=${tag.slice(1).join(';')}`);
  }
  args.push(relay);
  const line = nak(args).trim().split('\n').filter(Boolean).pop();
  if (!line) throw new Error(`nak event returned no event (kind ${o.kind})`);
  const event = JSON.parse(line) as NostrEvent;
  return { id: event.id, event };
}

type Filter = {
  kinds?: number[];
  authors?: string[];
  ids?: string[];
  '#d'?: string[];
  '#e'?: string[];
  limit?: number;
};

export function query(relay: string, filter: Filter): NostrEvent[] {
  const args = ['req'];
  for (const k of filter.kinds ?? []) args.push('-k', String(k));
  for (const a of filter.authors ?? []) args.push('-a', a);
  for (const i of filter.ids ?? []) args.push('-i', i);
  for (const d of filter['#d'] ?? []) args.push('-d', d);
  for (const e of filter['#e'] ?? []) args.push('-e', e);
  if (filter.limit) args.push('-l', String(filter.limit));
  args.push(relay);
  const out = nak(args).trim();
  if (!out) return [];
  return out.split('\n').filter(Boolean).map((l) => JSON.parse(l) as NostrEvent);
}

// ---- Curation chain (mirrors the real Brainstorm 30392 observer/source-tag shape) ----

export function publishCurationList(
  relay: string,
  o: { taSec: string; observer: string; slug: string; members: string[] },
): { id: string } {
  const tags: string[][] = [
    ['d', `tl-pin-test-${o.slug}-${o.observer.slice(0, 8)}`],
    ['title', o.slug],
    ['observer', o.observer],
    ['source-tag', `srctag-${o.slug}`, o.observer, o.slug], // [tagEventId, tagAuthor, slug]
    ...o.members.map((m) => ['p', m]),
  ];
  return publish(relay, { kind: 30392, content: '', tags, sec: o.taSec });
}

/** Resolve a curator's list for a tag via observer + source-tag (latest wins). */
export function resolveCuration(relay: string, o: { curator: string; slug: string }): string[] {
  const events = query(relay, { kinds: [30392] }).filter((e) => {
    const observer = e.tags.find((t) => t[0] === 'observer')?.[1];
    const sourceTag = e.tags.find((t) => t[0] === 'source-tag');
    return observer === o.curator && sourceTag?.[3] === o.slug;
  });
  if (events.length === 0) return [];
  const latest = events.reduce((a, b) => (b.created_at > a.created_at ? b : a));
  return extractNomineePubkeys(latest);
}

// ---- Catallax events ----

export function publishArbiter(relay: string, o: { sec: string; d: string }): { id: string; coord: string } {
  const pub = nak(['key', 'public', o.sec]).trim();
  const { id } = publish(relay, {
    kind: 33400,
    content: JSON.stringify({ name: 'Test Arbiter' }),
    tags: [['d', o.d], ['p', pub], ['fee_type', 'flat'], ['fee_amount', '1000'], ['t', 'catallax']],
    sec: o.sec,
  });
  return { id, coord: `33400:${pub}:${o.d}` };
}

interface TaskOpts {
  sec: string;
  d: string;
  patron: string;
  arbiter?: string;
  worker?: string;
  arbiterService?: string;
  amount: string;
  status: string;
  fundingType?: string;
  goalId?: string;
  createdAt?: number;
}

export function publishTask(relay: string, o: TaskOpts): { id: string } {
  const tags: string[][] = [['d', o.d], ['p', o.patron]];
  if (o.arbiter) tags.push(['p', o.arbiter]);
  if (o.worker) tags.push(['p', o.worker]);
  if (o.arbiterService) tags.push(['a', o.arbiterService]);
  tags.push(['amount', o.amount], ['status', o.status], ['t', 'catallax']);
  if (o.fundingType) tags.push(['funding_type', o.fundingType]);
  if (o.goalId) tags.push(['goal', o.goalId]);
  return publish(relay, {
    kind: 33401,
    content: JSON.stringify({ title: 'Test Task', description: 'desc', requirements: 'reqs' }),
    tags,
    sec: o.sec,
    createdAt: o.createdAt,
  });
}

export function publishGoal(
  relay: string,
  o: { sec: string; taskCoord: string; arbiter: string; amount: string },
): { id: string } {
  const targetMsats = String(parseInt(o.amount, 10) * 1000);
  return publish(relay, {
    kind: 9041,
    content: 'Crowdfunding goal',
    tags: [['amount', targetMsats], ['a', o.taskCoord], ['zap', o.arbiter], ['relays', relay]],
    sec: o.sec,
  });
}

export function mockZapReceipt(
  relay: string,
  o: { sec: string; goalId: string; amount: string; recipient: string },
): { id: string } {
  const sender = nak(['key', 'public', o.sec]).trim();
  // Mock: a real 9735 is signed by the LNURL server; for tests the sender signs.
  const description = JSON.stringify({
    pubkey: sender,
    tags: [['amount', String(parseInt(o.amount, 10) * 1000)]],
  });
  return publish(relay, {
    kind: 9735,
    content: '',
    tags: [['e', o.goalId], ['p', o.recipient], ['description', description]],
    sec: o.sec,
  });
}

export function publishConclusion(
  relay: string,
  o: {
    sec: string;
    taskCoord: string;
    taskId: string;
    payoutReceiptId: string;
    patron: string;
    arbiter: string;
    worker: string;
    resolution: string;
  },
): { id: string } {
  return publish(relay, {
    kind: 3402,
    content: JSON.stringify({ resolution_details: 'done' }),
    tags: [
      ['e', o.payoutReceiptId],
      ['e', o.taskId],
      ['p', o.patron],
      ['p', o.arbiter],
      ['p', o.worker],
      ['resolution', o.resolution],
      ['a', o.taskCoord],
    ],
    sec: o.sec,
  });
}

/** Latest authoritative version of a task (newest created_at), via the app parser. */
export function latestTask(events: NostrEvent[], o: { patron: string; d: string }): TaskProposal | null {
  const parsed = events
    .map(parseTaskProposal)
    .filter((t): t is TaskProposal => t !== null)
    .filter((t) => t.patronPubkey === o.patron && t.d === o.d);
  if (parsed.length === 0) return null;
  return parsed.reduce((a, b) => (b.created_at > a.created_at ? b : a));
}
