#!/bin/sh
set -eu
umask 077

log() {
  printf '[escalera-deploy] %s\n' "$*"
}

fail() {
  log "FEHLER: $*"
  exit 1
}

[ "$#" -eq 3 ] || fail "Aufruf: deploy-release.sh <Archiv> <Commit> <SHA256>"
[ "$(id -u)" -eq 0 ] || fail "Das Deployment muss als root laufen."

archive=$1
revision=$2
expected_sha=$3
root=/opt/escalera
backup_service=escalera-backup.service
short_revision=$(printf '%s' "$revision" | cut -c1-7)

case "$revision" in
  *[!0-9a-f]*|'') fail "Ungültige Commit-ID." ;;
esac
[ "${#revision}" -eq 40 ] || fail "Die Commit-ID muss 40 Zeichen lang sein."
case "$expected_sha" in
  *[!0-9a-f]*|'') fail "Ungültiger Archiv-Hash." ;;
esac
[ "${#expected_sha}" -eq 64 ] || fail "Der Archiv-Hash muss 64 Zeichen lang sein."
case "$archive" in
  /tmp/escalera-release-*.tar.gz) ;;
  *) fail "Das Release-Archiv muss unter /tmp liegen." ;;
esac

[ -f "$archive" ] || fail "Release-Archiv fehlt: $archive"
[ "$(readlink -f "$root")" = "$root" ] || fail "Unerwarteter Produktionspfad."
[ -f "$root/.env.production" ] || fail "Produktionsumgebung fehlt."
[ -f "$root/docker-compose.production.yml" ] || fail "Produktions-Compose-Datei fehlt."

actual_sha=$(sha256sum "$archive" | awk '{print $1}')
[ "$actual_sha" = "$expected_sha" ] || fail "Der SHA256-Hash des Release-Archivs stimmt nicht."
if tar -tzf "$archive" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  fail "Das Release-Archiv enthält unsichere Pfade."
fi

exec 9>/run/lock/escalera-deploy.lock
flock -n 9 || fail "Ein anderes Deployment läuft bereits."

stage=$(mktemp -d "/opt/escalera-next-$short_revision-XXXXXX")
case "$stage" in
  /opt/escalera-next-"$short_revision"-*) ;;
  *) fail "Unsicherer Staging-Pfad." ;;
esac

activated=0
previous=
script_path=
case "$0" in
  /tmp/escalera-deploy-release-*.sh) script_path=$0 ;;
esac

cleanup_or_rollback() {
  status=$?
  trap - EXIT

  if [ "$status" -ne 0 ] && [ "$activated" -eq 1 ]; then
    log "Deployment fehlgeschlagen; vorherige Version wird wiederhergestellt."
    failed="/opt/escalera-failed-$short_revision-$(date -u +%Y%m%dT%H%M%SZ)"
    if [ -d "$root" ] && [ -n "$previous" ] && [ -d "$previous" ]; then
      mv "$root" "$failed"
      mv "$previous" "$root"
      docker image inspect escalera-client:rollback >/dev/null 2>&1 && docker image tag escalera-client:rollback escalera-client:latest
      docker image inspect escalera-server:rollback >/dev/null 2>&1 && docker image tag escalera-server:rollback escalera-server:latest
      (
        cd "$root"
        docker compose -p escalera --env-file .env.production -f docker-compose.production.yml up -d --force-recreate --remove-orphans --wait --wait-timeout 240
      ) || log "WARNUNG: Automatischer Rollback konnte nicht vollständig gestartet werden."
    fi
  elif [ "$status" -ne 0 ] && [ -n "$stage" ] && [ -d "$stage" ]; then
    rm -rf -- "$stage"
  fi

  rm -f -- "$archive"
  if [ -n "$script_path" ]; then
    rm -f -- "$script_path"
  fi

  exit "$status"
}
trap cleanup_or_rollback EXIT

log "Release $revision wird vorbereitet."
tar -xzf "$archive" -C "$stage"
[ -f "$stage/package.json" ] || fail "Release enthält kein Projekt."
[ -f "$stage/client/Dockerfile" ] || fail "Client-Dockerfile fehlt."
[ -f "$stage/server/Dockerfile" ] || fail "Server-Dockerfile fehlt."

install -m 600 "$root/.env.production" "$stage/.env.production"
install -m 644 "$root/docker-compose.production.yml" "$stage/docker-compose.production.yml"
install -m 644 "$root/client/Dockerfile" "$stage/client/Dockerfile"
install -m 644 "$root/server/Dockerfile" "$stage/server/Dockerfile"
install -m 644 "$root/infrastructure/nginx.conf" "$stage/infrastructure/nginx.conf"
install -m 644 "$root/infrastructure/Caddyfile" "$stage/infrastructure/Caddyfile"

if [ -f "$root/infrastructure/production.env.example" ]; then
  install -m 644 "$root/infrastructure/production.env.example" "$stage/infrastructure/production.env.example"
fi
if [ -d "$root/infrastructure/systemd" ] && [ ! -d "$stage/infrastructure/systemd" ]; then
  cp -a "$root/infrastructure/systemd" "$stage/infrastructure/"
fi
for runtime_script in backup.sh restore.sh deploy.sh; do
  if [ -f "$root/infrastructure/scripts/$runtime_script" ] && [ ! -f "$stage/infrastructure/scripts/$runtime_script" ]; then
    install -m 755 "$root/infrastructure/scripts/$runtime_script" "$stage/infrastructure/scripts/$runtime_script"
  fi
done

set -a
# shellcheck source=/dev/null
. "$stage/.env.production"
set +a
[ -n "${APP_DOMAIN:-}" ] || fail "APP_DOMAIN fehlt."

compose_stage() {
  docker compose -p escalera --env-file "$stage/.env.production" -f "$stage/docker-compose.production.yml" "$@"
}

compose_stage config --quiet
log "Datenbackup wird erstellt."
systemctl start "$backup_service"
systemctl is-failed --quiet "$backup_service" && fail "Datenbackup ist fehlgeschlagen."

docker image inspect escalera-client:latest >/dev/null 2>&1 && docker image tag escalera-client:latest escalera-client:rollback
docker image inspect escalera-server:latest >/dev/null 2>&1 && docker image tag escalera-server:latest escalera-server:rollback

log "Container-Images werden gebaut."
compose_stage pull
compose_stage build --pull client server

previous="/opt/escalera-previous-$(date -u +%Y%m%dT%H%M%SZ)"
case "$previous" in
  /opt/escalera-previous-*) ;;
  *) fail "Unsicherer Rollback-Pfad." ;;
esac
[ ! -e "$previous" ] || fail "Rollback-Pfad existiert bereits."

mv "$root" "$previous"
if ! mv "$stage" "$root"; then
  mv "$previous" "$root"
  fail "Release konnte nicht aktiviert werden."
fi
stage=
activated=1

log "Neue Container werden aktiviert."
(
  cd "$root"
  docker compose -p escalera --env-file .env.production -f docker-compose.production.yml up -d --remove-orphans --wait --wait-timeout 240
)

log "Öffentlicher Health-Check wird ausgeführt."
curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 5 "https://$APP_DOMAIN/api/health" >/dev/null

mkdir -p /opt/escalera-releases
install -m 600 "$archive" "/opt/escalera-releases/main-$short_revision.tar.gz"
activated=0

log "DEPLOYED_REVISION=$revision"
log "ROLLBACK_SOURCE=$previous"
log "HEALTH_URL=https://$APP_DOMAIN/api/health"
docker inspect -f '{{.Name}} image={{.Image}} status={{.State.Status}} restart={{.RestartCount}}' escalera-client-1 escalera-server-1
