#!/usr/bin/env bash
# provision-customer.sh — Kunden-Onboarding auf dem VPS
#
# Ablauf:
#   1) Lizenz-Key auf dem Zentralserver erzeugen (Developer-API) — oder vorhandenen wiederverwenden
#   2) Docker-Stack (docker-compose.prod.yml) für den Kunden starten
#   3) Aktivierungs-Link ausgeben
#
# Idempotent: erneuter Lauf mit gleichem Kundennamen startet nur den Stack neu,
# Key und Secrets bleiben unverändert (Stand in provisioned/<kunde>/.env).
#
# Usage: provision-customer.sh <kundenname> [plan=trial|basic|pro] [laufzeit-tage=365] [app-port]
set -euo pipefail

CUSTOMER="${1:-}"
PLAN="${2:-trial}"
DAYS="${3:-365}"
PORT="${4:-}"

if [[ -z "$CUSTOMER" ]]; then
  echo "Usage: $0 <kundenname> [plan=trial|basic|pro] [laufzeit-tage=365] [app-port]" >&2
  exit 1
fi
if [[ ! "$PLAN" =~ ^(trial|basic|pro)$ ]]; then
  echo "Fehler: Plan muss trial, basic oder pro sein." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$ROOT_DIR/provisioned/$CUSTOMER"
STATE_ENV="$STATE_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
PROVISION_ENV="${PROVISION_ENV:-$ROOT_DIR/provision.env}"

mkdir -p "$STATE_DIR"

# ── 1) Lizenz-Key (idempotent: vorhandenen Key wiederverwenden) ──
if [[ -f "$STATE_ENV" ]] && grep -q '^LICENSE_KEY=.' "$STATE_ENV"; then
  # shellcheck disable=SC1090
  source "$STATE_ENV"
  echo "== Bestehender Lizenz-Key für '$CUSTOMER' wird wiederverwendet (kein neuer Key)."
else
  if [[ -f "$PROVISION_ENV" ]]; then
    # shellcheck disable=SC1090
    source "$PROVISION_ENV"
  fi
  : "${CENTRAL_URL:?CENTRAL_URL fehlt — provision.env anlegen (Vorlage: provision.env.example)}"
  : "${DEV_USERNAME:?DEV_USERNAME fehlt (provision.env)}"
  : "${DEV_PASSWORD:?DEV_PASSWORD fehlt (provision.env)}"

  echo "== Login am Zentralserver $CENTRAL_URL als $DEV_USERNAME"
  LOGIN_RESP="$(curl -fsS -X POST "$CENTRAL_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$DEV_USERNAME\",\"password\":\"$DEV_PASSWORD\"}")"
  TOKEN="$(printf '%s' "$LOGIN_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  if [[ -z "$TOKEN" ]]; then
    echo "Fehler: Login am Zentralserver fehlgeschlagen: $LOGIN_RESP" >&2
    exit 1
  fi

  echo "== Erzeuge Lizenz-Key (plan=$PLAN, laufzeit=${DAYS} Tage)"
  KEY_RESP="$(curl -fsS -X POST "$CENTRAL_URL/api/license/keys" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"plan\":\"$PLAN\",\"durationDays\":$DAYS}")"
  LICENSE_KEY="$(printf '%s' "$KEY_RESP" | sed -n 's/.*"licenseKey":"\([^"]*\)".*/\1/p')"
  LICENSE_EXPIRES_AT="$(printf '%s' "$KEY_RESP" | sed -n 's/.*"expiresAt":"\([^"]*\)".*/\1/p')"
  if [[ -z "$LICENSE_KEY" || -z "$LICENSE_EXPIRES_AT" ]]; then
    echo "Fehler: Key-Erzeugung fehlgeschlagen: $KEY_RESP" >&2
    exit 1
  fi
  echo "== Neuer Key: $LICENSE_KEY (bis $LICENSE_EXPIRES_AT)"
fi

# ── 2) Stack-Env erzeugen (nur beim ersten Lauf — Secrets bleiben danach stabil) ──
if [[ ! -f "$STATE_ENV" ]]; then
  APP_PORT="${PORT:-5000}"
  cat > "$STATE_ENV" <<EOF
CUSTOMER=$CUSTOMER
APP_PORT=$APP_PORT
POSTGRES_USER=posuser
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=posdb
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=8h
LICENSE_KEY=$LICENSE_KEY
LICENSE_PLAN=$PLAN
LICENSE_EXPIRES_AT=$LICENSE_EXPIRES_AT
EOF
  chmod 600 "$STATE_ENV"
else
  # Port-Wechsel bei erneutem Lauf erlauben
  if [[ -n "$PORT" ]]; then
    sed -i "s/^APP_PORT=.*/APP_PORT=$PORT/" "$STATE_ENV"
  fi
  # Key nachpflegen, falls alter Stand ohne Key existiert
  if ! grep -q '^LICENSE_KEY=' "$STATE_ENV"; then
    {
      echo "LICENSE_KEY=$LICENSE_KEY"
      echo "LICENSE_PLAN=$PLAN"
      echo "LICENSE_EXPIRES_AT=$LICENSE_EXPIRES_AT"
    } >> "$STATE_ENV"
  fi
  # shellcheck disable=SC1090
  source "$STATE_ENV"
fi

# ── 3) Stack starten ──
echo "== Starte Stack 'kassensystem-$CUSTOMER' auf Port $APP_PORT"
docker compose --env-file "$STATE_ENV" -f "$COMPOSE_FILE" -p "kassensystem-$CUSTOMER" up -d --build

# ── 4) Lizenz-Key in die Kunden-DB spiegeln ──
# Die Kunden-Instanz aktiviert/verifiziert gegen ihre eigene subscriptions-Tabelle.
# Der Zentralserver bleibt Master (Analytics, Key-Verwaltung); die Kopie hier
# macht den Key auf der Instanz aktivierbar. Hinweis: cancel/extend auf der
# Zentrale propagiert aktuell NICHT auf Kunden-Instanzen.
echo "== Warte auf App-Health (max. 60s)..."
HEALTHY=0
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:$APP_PORT/health" >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 2
done
if [[ "$HEALTHY" != "1" ]]; then
  echo "Fehler: App wurde nicht gesund — Key-Spiegelung übersprungen." >&2
  echo "Stack-Logs prüfen: docker compose -p kassensystem-$CUSTOMER logs app" >&2
  exit 1
fi

echo "== Spiegle Lizenz-Key in die Kunden-DB (subscriptions)"
docker compose --env-file "$STATE_ENV" -f "$COMPOSE_FILE" -p "kassensystem-$CUSTOMER" exec -T db \
  psql -U "${POSTGRES_USER:-posuser}" -d "${POSTGRES_DB:-posdb}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO subscriptions (license_key, plan, status, expires_at)
SELECT '${LICENSE_KEY}', '${LICENSE_PLAN:-$PLAN}', 'active', '${LICENSE_EXPIRES_AT}'
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE license_key = '${LICENSE_KEY}');
SQL

# ── 5) Aktivierungs-Link ausgeben ──
PUBLIC_HOST="${PUBLIC_HOST:-localhost}"
echo ""
echo "== Fertig. Aktivierungs-Link für den Kunden:"
echo "   http://$PUBLIC_HOST:$APP_PORT/?key=$LICENSE_KEY"
echo ""
echo "   (Link öffnen → Lizenz vorbefüllt → aktivieren → Manager-Konto erstellen)"
