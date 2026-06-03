import { test, expect } from '@playwright/test';
import { nip19 } from 'nostr-tools';
import { loginAs, rememberCurator, ALICE, BOB } from './helpers';
import { ROSTER } from '../seed/accounts';

const KIND = 33401;
const CAROL = ROSTER.worker;
const DAVE = ROSTER.arbiters[0];
const naddr = (patronPub: string, d: string) => nip19.naddrEncode({ kind: KIND, pubkey: patronPub, identifier: d });

const ACTION_RE = /mark funded|assign|mark submitted|conclude/i;

test('a non-participant sees no management actions', async ({ page }) => {
  await loginAs(page, ROSTER.funders[0]); // a funder holds no role on this task
  await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
  await expect(page.getByText('Patron').first()).toBeVisible({ timeout: 15_000 }); // page loaded
  await expect(page.getByRole('button', { name: ACTION_RE })).toHaveCount(0);
});

test('patron marks a proposed task funded', async ({ page }) => {
  await loginAs(page, ALICE);
  await rememberCurator(page);
  await page.goto(`/task/${naddr(ALICE.pub, 'seed-proposed-alice')}`);
  await page.getByRole('button', { name: /mark funded/i }).click();
  await expect(page.getByText(/^funded$/i).first()).toBeVisible({ timeout: 15_000 });
});

test('patron self-assigns as worker on a funded task', async ({ page }) => {
  await loginAs(page, BOB);
  await page.goto(`/task/${naddr(BOB.pub, 'seed-funded-bob')}`);
  await page.getByRole('button', { name: /^assign$/i }).click(); // worker input defaults to self
  await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 15_000 });
});

test('worker marks an in-progress task submitted', async ({ page }) => {
  await loginAs(page, CAROL);
  await page.goto(`/task/${naddr(ALICE.pub, 'seed-inprogress-alice')}`);
  await page.getByRole('button', { name: /mark submitted/i }).click();
  await expect(page.getByText(/^submitted$/i).first()).toBeVisible({ timeout: 15_000 });
});

test('arbiter concludes a submitted task', async ({ page }) => {
  await loginAs(page, DAVE);
  await page.goto(`/task/${naddr(BOB.pub, 'seed-submitted-bob-self')}`);
  await page.getByRole('button', { name: /^conclude$/i }).click(); // resolution defaults to successful
  await expect(page.getByText(/concluded/i).first()).toBeVisible({ timeout: 15_000 });
});
