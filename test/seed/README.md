# Dev seed

Fills a **local** strfry relay with a fixed, reproducible Grantless world so the
UI is browsable during development and you can log in as any role to test write
flows by hand. Built on the Story-2 relay + nak harness; produces no production
data and no privileged actors.

> ⚠️ **`accounts.ts` holds DEV-ONLY throwaway keys.** They are published in plain
> sight on purpose (so you can paste an nsec into the signer). Never use them on
> mainnet, never treat any of these pubkeys as privileged, never wire them into a
> production default. Regenerate your own with `nak key generate` if you fork.

## What it seeds

A fixed cast — 1 list agent, 1 curator, 2 applicants (Alice, Bob), 1 separate
worker (Carol), 2 arbiters (Dave, Erin), 3 funders — and:

- a kind-0 profile for every account;
- the curator's **`grantless-applicants`** and **`grantless-arbiter`** lists
  (kind 30392, `observer`/`source-tag` shape — the data Story 4 resolves);
- a kind-33400 announcement for each arbiter;
- projects (kind 33401) across **every** status — `proposed`, `funded`,
  `in_progress`, `submitted`, `concluded` — spread over both applicants and both
  arbiters, including one self-assigned project (Bob is his own worker) and the
  concluded one driven through its full revision history;
- NIP-75 zap goals (9041) with **mocked** zap receipts (9735) for funded+
  projects, and a kind-3402 conclusion + mocked payout for the concluded one.

## Run it

```sh
npm run relay:up   # start the local strfry (tmpfs — clean each start)
npm run seed       # publish the dataset, then print the account roster
```

`npm run dev` does all of this for you (relay up → seed → Vite) and points the
app at the local relay via `VITE_RELAY_URL` (overridable — see `.env.example`).

### Log in as a role

`npm run seed` prints each role's `npub` + `nsec`. Copy an `nsec` and paste it
into the app's login dialog ("nsec" option) to act as that account.

### Reset

```sh
npm run relay:down   # stops the relay and wipes its (tmpfs) data
```

Re-run `npm run seed` only against a **fresh** relay — the addressable events
(profiles, lists, tasks) are replaceable, but re-seeding a dirty relay duplicates
the regular events (goals, receipts, conclusions).

## Tests

- `test/seed/accounts.test.ts` — unit (runs in `npm test`, no Docker): the roster
  is deterministic and self-consistent.
- `test/seed/seed.e2e.test.ts` — real-event e2e (`npm run test:e2e`): the seeded
  world is correct on a live local strfry.
