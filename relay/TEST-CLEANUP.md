# Real-Lightning test → relay cleanup runbook

A repeatable way to run a **real-zap crowdfund test** against production and then remove the test
events from `relay.grantless.org` cleanly.

## The one thing to understand first

Deletion is **per-relay**. The app publishes to your whole active relay set, and zap **receipts
(9735)** are published by the *recipient's LNURL server* — not by you (so you can't NIP-09 them). If
your test events scatter onto public relays (`relay.nostr.band`, `relay.primal.net`, …), **no one can
purge them there.** So the trick is to keep the test on **one relay you own**, then cleanup is total.

---

## A. Run the test single-relay (so it's fully cleanable)

1. **Point the app at only your relay.** In the app: **Settings → relay → Custom →
   `wss://relay.grantless.org`** (or run with `VITE_RELAY_URL=wss://relay.grantless.org`). This makes
   every event you publish — and every zap receipt the LNURL server returns — land **only** on your
   relay.
2. **Prerequisites for a real zap to land:** the test project's **arbiter must have a real, zap-capable
   Lightning address** (`lud16`/`lud06` with `allowsNostr` — e.g. an Alby address). Easiest: be your
   own arbiter on the project.
3. **Reach the project by its task URL**, not via curator browse (browse needs the brainstorm relay,
   which you just switched away from): open `https://grantless.org/task/<naddr>` directly.
4. Post the project → assign the arbiter → **Open for funding** → **Contribute** from a separate
   wallet. Confirm the funding bar moves (the real 9735 arrived on your relay).
5. **Write down**, for cleanup: the hex **pubkey(s)** you posted/funded as, and the goal's **naddr /
   event id**.

> If you instead test with the default multi-relay set, the test events also live on public relays
> you can't purge — accept that residue, or NIP-09-delete the ones you signed (33401/9041/33400);
> the 9735 receipts can't be removed there at all.

---

## B. Clean up — option 1: nuclear wipe (recommended PRE-announce)

While the relay holds only your test data, just reset it:

```sh
docker compose -f relay/docker-compose.prod.yml down -v   # -v drops the strfry-db volume
docker compose -f relay/docker-compose.prod.yml up -d
```

Clean slate, no per-event work. **Do NOT do this after launch** — it deletes everything on the relay.

---

## C. Clean up — option 2: surgical delete (after there's real data)

### 1. Back up first (nothing irreversible)

```sh
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry export > relay-backup-$(date +%Y%m%d-%H%M%S).jsonl
```

### 2. Collect what the test created

```sh
# everything you authored
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry scan '{"authors":["<YOURPUB_HEX>"]}'
# the zap receipts (published by the LNURL server) — typically filter to your goal:
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry scan '{"kinds":[9735],"#e":["<GOAL_EVENT_ID>"]}'
```

Review the JSONL output and confirm these are only your test events (check `created_at`, `kind`,
`tags`).

### 3. Delete (dry-run first)

> `strfry delete` flags vary by version — confirm with
> `docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry delete --help`.

```sh
# preview
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry delete --dry-run --filter '{"authors":["<YOURPUB_HEX>"]}'
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry delete --dry-run --filter '{"kinds":[9735],"#e":["<GOAL_EVENT_ID>"]}'

# for real (drop --dry-run) once the preview looks right
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry delete --filter '{"authors":["<YOURPUB_HEX>"]}'
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry delete --filter '{"kinds":[9735],"#e":["<GOAL_EVENT_ID>"]}'
```

Be careful with `{"authors":["<YOURPUB_HEX>"]}` if that pubkey also published things you want to keep
(e.g. your profile, or your curator lists if they live here) — narrow with `"kinds"` /
`"since"`/`"until"` as needed. When unsure, paste the scan output to Claude and get exact, scoped
filters.

### 4. Verify

```sh
docker compose -f relay/docker-compose.prod.yml exec -T strfry strfry scan --count '{"authors":["<YOURPUB_HEX>"]}'
```

---

## Caveats

- Cleanup only affects **this relay**. Anything that reached other relays persists there.
- The `--age`/`--filter` flags and `scan --count` syntax depend on your strfry build — `--help` is the
  source of truth; back up before deleting.
- `down -v` is irreversible for the relay's stored events (that's the point) — use it only while the
  relay is disposable (pre-announce).
