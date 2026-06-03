import { type Page } from '@playwright/test';
import { ROSTER } from '../seed/accounts';

export const ALICE = ROSTER.applicants[0];
export const BOB = ROSTER.applicants[1];
export const CLEO = ROSTER.curator;
export const QUINN = ROSTER.curator2;

/**
 * Log in as a seed account by injecting the nostr-login storage shape before the
 * app loads (decoupled from the login UI, which the login spec tests separately).
 */
export async function loginAs(page: Page, account = ALICE): Promise<void> {
  await page.addInitScript((acct) => {
    localStorage.setItem(
      'nostr:login',
      JSON.stringify([
        {
          id: `nsec:${acct.pub}`,
          type: 'nsec',
          pubkey: acct.pub,
          createdAt: '2026-06-03T00:00:00.000Z',
          data: { nsec: acct.nsec },
        },
      ]),
    );
  }, account);
}

/** Pre-set the remembered curator (Story-4 persistence) before load. */
export async function rememberCurator(page: Page, pubkey = CLEO.pub): Promise<void> {
  await page.addInitScript((pk) => {
    localStorage.setItem('grantless:lastCurator', JSON.stringify(pk));
  }, pubkey);
}

/** Pick a curator in the browse picker. */
export async function selectCurator(page: Page, name = CLEO.name): Promise<void> {
  await page.locator('#curator-select').click();
  await page.getByRole('option', { name: new RegExp(name, 'i') }).click();
}
