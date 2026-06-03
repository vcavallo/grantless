import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relayUp, relayDown, RELAY_URL } from './relay';
import { genAccount, publishCurationList, query } from './harness';
import {
  applicantCurationLists,
  distinctCurators,
  resolveCuratorApplicants,
  GRANTLESS_APPLICANTS_SLUG,
} from '@/lib/grantless';

// Real-event e2e for Story 4: publish grantless-applicants trusted lists (signed
// by list agents, NOT the curators) to a live local strfry, then drive the app's
// own resolver (@/lib/grantless) over the events the relay actually returns —
// proving discovery + per-curator resolution + replaceable latest-wins against
// real protocol data, no mocks.
describe('curator applicant resolution (real events on local strfry)', () => {
  const c1 = genAccount(); // curator 1
  const c2 = genAccount(); // curator 2
  const ta1 = genAccount(); // a list-publishing agent
  const ta2 = genAccount(); // a different list-publishing agent
  const [a1, a2, a3, a4, arb] = [genAccount(), genAccount(), genAccount(), genAccount(), genAccount()];

  beforeAll(async () => {
    await relayUp();
    // c1's applicants — an older list (ta1) and a newer one (ta2), both observed
    // by c1 but signed by different agents, so both persist on the relay.
    publishCurationList(RELAY_URL, { taSec: ta1.sec, observer: c1.pub, slug: GRANTLESS_APPLICANTS_SLUG, members: [a1.pub] });
    publishCurationList(RELAY_URL, { taSec: ta1.sec, observer: c2.pub, slug: GRANTLESS_APPLICANTS_SLUG, members: [a4.pub] });
    // An arbiter list for c1 — must be ignored by the applicant resolver.
    publishCurationList(RELAY_URL, { taSec: ta1.sec, observer: c1.pub, slug: 'grantless-arbiter', members: [arb.pub] });
    // The newer c1 applicants list wins (published last → newest created_at).
    publishCurationList(RELAY_URL, { taSec: ta2.sec, observer: c1.pub, slug: GRANTLESS_APPLICANTS_SLUG, members: [a1.pub, a2.pub, a3.pub] });
  }, 120_000);

  afterAll(async () => {
    await relayDown();
  }, 60_000);

  it('discovers the distinct curators who published an applicants list', async () => {
    const events = await query(RELAY_URL, { kinds: [30392] });
    const curators = distinctCurators(applicantCurationLists(events));
    expect([...curators].sort()).toEqual([c1.pub, c2.pub].sort());
  });

  it('resolves each curator to its own applicants, latest list winning', async () => {
    const events = await query(RELAY_URL, { kinds: [30392] });
    expect(resolveCuratorApplicants(events, c1.pub)).toEqual([a1.pub, a2.pub, a3.pub]);
    expect(resolveCuratorApplicants(events, c2.pub)).toEqual([a4.pub]);
  });

  it('excludes non-applicant (arbiter) lists from the applicant view', async () => {
    const events = await query(RELAY_URL, { kinds: [30392] });
    const lists = applicantCurationLists(events);
    expect(lists.every((l) => l.slug === GRANTLESS_APPLICANTS_SLUG)).toBe(true);
    // The arbiter list's member must not surface as an applicant of c1.
    expect(resolveCuratorApplicants(events, c1.pub)).not.toContain(arb.pub);
  });

  it('resolves by observer, never by the signer', async () => {
    const events = await query(RELAY_URL, { kinds: [30392] });
    // ta1/ta2 signed the lists but are not observers → no applicants resolve for them.
    expect(resolveCuratorApplicants(events, ta1.pub)).toEqual([]);
    expect(resolveCuratorApplicants(events, ta2.pub)).toEqual([]);
  });
});
