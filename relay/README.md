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

## Later: mirror real curation data (negentropy)

`negentropy` is enabled in `strfry.prod.conf`. A future chore can `strfry sync` curation
events (e.g. 30392s) from `wss://tags.brainstorm.world/relay` so the default relay also
serves them. Deferred — the app already reads Brainstorm's tags relay directly (it's in
the default preset set).
