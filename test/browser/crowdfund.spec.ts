import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, ALICE } from './helpers';

const KIND = 33401;
const naddr = (patronPub: string, d: string) => nip19.naddrEncode({ kind: KIND, pubkey: patronPub, identifier: d });

test('patron opens a project for funding, then it shows a contribute affordance', async ({ page }) => {
  await loginAs(page, ALICE);
  // seed-proposed-alice is proposed with arbiter Dave and no goal yet.
  await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
  await page.getByRole('button', { name: /open for funding/i }).click();
  // Once the goal exists, a contribute control appears.
  await expect(page.getByRole('button', { name: /^contribute$/i })).toBeVisible({ timeout: 15_000 });
});

// The old "a funder can contribute to a goal" test asserted the MOCK behavior
// (an instant "contribution sent" toast). Story 13 removes that path — contributing
// now opens a real-Lightning flow. Its real behavior is covered by
// contribute-real-lightning.spec.ts (the no-theater honest path) plus manual
// real-wallet verification (see 13-real-lightning-contributions.test-plan.md).
