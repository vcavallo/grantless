# Grantless relay

A [strfry](https://github.com/hoytech/strfry) relay. Two configs:

- **Dev / tests** — `docker-compose.yml` + `strfry.conf`. RAM-backed (tmpfs), wiped on
  every `down`. Driven by `npm run relay:up` / `relay:down`.
- **Production** — `docker-compose.prod.yml` + `strfry.prod.conf`. Persistent volume,
  open (no NIP-42 auth), reverse-proxy aware. Backs `wss://relay.grantless.org`.

## Not privileged

`relay.grantless.org` is the app's **default** relay (`VITE_DEFAULT_RELAY`), a plain
bootstrapping convenience — never a privileged anchor. Anyone can run their own strfry
with these same files and repoint the app at it; it works identically. (Grantless prime
directive.)

## Standing up production

On the host (DNS for `relay.grantless.org` → this server already pointed):

```sh
docker compose -f relay/docker-compose.prod.yml up -d
```

strfry now listens on `127.0.0.1:7777`. Put a TLS reverse proxy in front so
`wss://relay.grantless.org` terminates to it. Example Caddy:

```
relay.grantless.org {
    reverse_proxy 127.0.0.1:7777
}
```

(Caddy auto-provisions the TLS cert. nginx works too — proxy `/` to `http://127.0.0.1:7777`
with `Upgrade`/`Connection` headers and set `X-Forwarded-For`.)

Verify:

```sh
npx nak req -k 1 --limit 1 wss://relay.grantless.org
```

## Mirror curation lists onto this relay (resilience)

Curator applicant/arbiter lists (kind **30392**) are minted on a point-of-view relay
(`wss://tags.brainstorm.world/relay` by default), **not** on `relay.grantless.org`. So if
that source relay is unreachable, curator discovery breaks even though this relay is up —
a real single point of failure. Mirroring the 30392s here removes it: `relay.grantless.org`
is already in the app's default read set, so once it serves the lists, discovery survives a
source-relay outage **with no app change**.

This is **pull-only** (we never write upstream) and not privileged: point it at your own PoV
relay and it works identically (Grantless prime directive). `negentropy` is enabled in
`strfry.prod.conf`, so this relay can be the sync initiator.

### 1. One-shot / backfill — and the NIP-77 caveat

Run from the host where the strfry container runs:

The `dockurr/strfry` image keeps the binary at `/app/strfry` (NOT on `$PATH`) and resolves
its config/DB relative to `/app` (its wrapper does `cd /app && ./strfry relay`), so call it
by absolute path **with `-w /app`**. Confirm the binary path with
`docker exec grantless-strfry-prod sh -c 'find / -name strfry -type f 2>/dev/null'`.

```sh
# Negentropy (NIP-77) — efficient diff. Try this first:
docker exec -w /app grantless-strfry-prod \
  /app/strfry sync wss://tags.brainstorm.world/relay --filter '{"kinds":[30392]}' --dir down
```

(If it complains about config/DB, add the global `--config /etc/strfry.conf` before `sync`.)

⚠️ `tags.brainstorm.world` is a `strfry+nip50-proxy` reached at `/relay`; the search proxy
**may not pass NIP-77 (`NEG-OPEN`) through**. If the command errors or hangs, use the
**proxy-safe fallback** (a plain REQ → import, needs `nak` on the host):

```sh
nak req -k 30392 wss://tags.brainstorm.world/relay \
  | docker exec -i -w /app grantless-strfry-prod /app/strfry import
```

`relay/sync-curation.sh` wraps both: it tries negentropy and falls back to `nak|import`
automatically (`MODE=auto`). Every input is an overridable env var (`SOURCE_RELAY`,
`STRFRY_CONTAINER`, `KIND`, `MODE`, `SYNC_TIMEOUT`).

> The wire filter can only be `{"kinds":[30392]}` — Grantless keys on the multi-letter
> `observer`/`source-tag` tags, which relays don't index, so we mirror **all** kind-30392
> from the source. Fine at today's volume; a strfry `writePolicy` plugin could narrow to the
> grantless slugs later if it grows.

### 2. Keep it current (recommended: cron)

```sh
# every 5 minutes — cheap (negentropy diffs; or a ~23-event fetch)
*/5 * * * * /path/to/relay/sync-curation.sh >> /var/log/grantless-sync.log 2>&1
```

### 3. Advanced: continuous streaming (image-native `ROUTER`)

For real-time mirroring instead of polling, the `dockurr/strfry` image has a **built-in
router**: its entrypoint runs `./strfry router /etc/strfry-router.conf` when `ROUTER=1`. So,
in `docker-compose.prod.yml`, mount the filtered config and flip the flag:

```yaml
    environment:
      - ROUTER=1
    volumes:
      - ./router.conf:/etc/strfry-router.conf:ro
```

`relay/router.conf` is that config (a `down`-only, kind-30392 subscription — proxy-safe, no
NIP-77 needed). Backfill once with step 1, then the router keeps it current live; a
low-frequency cron sync (step 2) covers any reconnect gaps.

> Don't use the image's `STREAMS=<relay>` env for this — `strfry stream` is an unfiltered
> firehose (it'd pull *all* of Brainstorm). The router config is the filtered path.
> Verify the router schema against your strfry version — it has shifted across releases.

> **Relay-policy note:** the app deliberately does **not** broadcast list/tagging events to
> `relay.grantless.org` (only Catallax protocol events). This mirror is a separate,
> relay-side **read** failsafe for resilience — it doesn't change what the app publishes, and
> a forker who repoints `SOURCE_RELAY` (or skips the mirror entirely) gets an identical app.
