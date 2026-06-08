#!/usr/bin/env bash
#
# Mirror Grantless curation lists (kind 30392) from a source relay into the local
# strfry, so wss://relay.grantless.org also SERVES them. Resilience: curator
# discovery no longer dies if the source relay (where curators mint their lists)
# is unreachable. Pull-only — we never write upstream.
#
# NOT privileged / forkable (Grantless prime directive): every value below is an
# overridable env var. Point SOURCE_RELAY at your own point-of-view relay and this
# works identically — nothing here depends on a specific operator.
#
# Run on the host where the prod strfry container runs. Typical cron (every 5 min):
#   */5 * * * * /path/to/relay/sync-curation.sh >> /var/log/grantless-sync.log 2>&1
#
# Note: 30392 is the only filter the relay can apply at the wire — Grantless keys
# on the multi-letter `observer`/`source-tag` tags, which aren't relay-indexed, so
# we mirror ALL kind-30392 from the source (fine at today's volume; a strfry
# writePolicy plugin could narrow to the grantless slugs later if it ever grows).

set -euo pipefail

SOURCE_RELAY="${SOURCE_RELAY:-wss://tags.brainstorm.world/relay}"
STRFRY_CONTAINER="${STRFRY_CONTAINER:-grantless-strfry-prod}"
# The strfry binary path INSIDE the container, and the working dir to run it from.
# The dockurr/strfry image keeps the binary at /app/strfry (NOT on $PATH) and resolves
# its config/DB relative to /app (the wrapper does `cd /app && ./strfry relay`), so we
# match that. Confirm yours with:
#   docker exec <container> sh -c 'find / -name strfry -type f 2>/dev/null'
STRFRY_BIN="${STRFRY_BIN:-/app/strfry}"
STRFRY_WORKDIR="${STRFRY_WORKDIR:-/app}"
KIND="${KIND:-30392}"
# auto = try negentropy, fall back to fetch | negentropy = NIP-77 only | fetch = nak|import only
MODE="${MODE:-auto}"
SYNC_TIMEOUT="${SYNC_TIMEOUT:-120}"

filter="{\"kinds\":[${KIND}]}"
echo "[$(date -u +%FT%TZ)] mirroring ${filter} from ${SOURCE_RELAY} → ${STRFRY_CONTAINER} (down-only, mode=${MODE})"

sync_negentropy() {
  # NIP-77 set reconciliation — efficient diff. Needs the source to support it;
  # tags.brainstorm.world is a strfry+nip50-proxy and may NOT pass NEG-OPEN through.
  timeout "${SYNC_TIMEOUT}" docker exec -w "${STRFRY_WORKDIR}" "${STRFRY_CONTAINER}" \
    "${STRFRY_BIN}" sync "${SOURCE_RELAY}" --filter "${filter}" --dir down
}

fetch_import() {
  # Proxy-safe fallback: a plain REQ via nak, piped into strfry import. Always
  # works (no NIP-77 needed). Requires `nak` on the host.
  nak req -k "${KIND}" "${SOURCE_RELAY}" \
    | timeout "${SYNC_TIMEOUT}" docker exec -i -w "${STRFRY_WORKDIR}" "${STRFRY_CONTAINER}" "${STRFRY_BIN}" import
}

case "${MODE}" in
  negentropy)
    sync_negentropy; echo "synced via negentropy" ;;
  fetch)
    fetch_import; echo "imported via nak|strfry import" ;;
  auto)
    if sync_negentropy; then
      echo "synced via negentropy"
    else
      echo "negentropy sync failed (source may not support NIP-77) — falling back to nak|import"
      fetch_import
      echo "imported via nak|strfry import"
    fi ;;
  *)
    echo "unknown MODE='${MODE}' (use auto|negentropy|fetch)" >&2; exit 2 ;;
esac
