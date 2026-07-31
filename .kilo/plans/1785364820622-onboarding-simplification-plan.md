# Plan: Kunden-Onboarding vereinfachen (Quick Wins + Docker-Provisionierung)

## Kontext & Zielbild

Die Session 2026-07-29/30 hat gezeigt: Das Erst-Onboarding (Lizenz-Key erzeugen → aktivieren → Manager-Setup) ist fehleranfällig und undurchsichtig. Konkrete Vorfälle: versehentlicher Test-Manager blockierte den Setup-Flow (Fix nur via Migration+Redeploy), Verwirrung zwischen Lizenz-Gate (localStorage) und Account-Gate (globale DB), Key-Verteilung per Copy/Paste im Chat, Token-Verwirrung (8h-TTL).

**Entschiedenes Zielbild:**
- Mon Comptoir = Multi-Kunden-Produkt, **eine Instanz pro Kunde** (kein Multi-Tenancy-Umbau).
- Hosting später: eigener VPS mit Docker-Compose-Stack pro Kunde. Aktuell Interim: Render Free (Pilot-Instanz des Freunds läuft dort, Manager `kabo` ist gesetzt — funktioniert, nicht anfassen).
- Zentralserver (Lizenz/Analytics) bleibt auf Render.

**Nicht-Ziele (out of scope):** Einladungsflow (Manager lädt Nutzer per Link ein), VPS-Umzug selbst, Reverse-Proxy/TLS-Automation auf dem VPS, Multi-Tenancy, Umbau der Fachdaten.

## Phase 1 — Quick Wins (sofort auf Render deploybar)

### A. Onboarding-Wizard (killt Gate-Verwirrung)
- `frontend/src/components/LicenseActivation.tsx` + `SetupView.tsx` zu einem geführten Flow mit Schritt-Anzeige verheiraten: „Schritt 1/2: Lizenz aktivieren" → „Schritt 2/2: Konto erstellen". Nach erfolgreicher Aktivierung direkt Schritt 2 einblenden (statt implizitem Screen-Wechsel).
- `frontend/src/App.tsx`: License-Gate rendert den Wizard; `needsSetup`-Logik bleibt, steuert nur noch ob Schritt 2 angeboten wird.
- `LoginView.tsx`: Bei `setup-status.needsSetup === false` erklärenden Hinweis zeigen („Setup bereits abgeschlossen — bitte mit deinem Konto einloggen. Weitere Accounts erstellt der Manager in den Einstellungen.").
- Neue Texte in den bestehenden i18n-Mechanismus (`t()`) einpflegen, Deutsch + vorhandene Sprachen.

### B. Aktivierungs-Links (killt Copy/Paste-Verteilung)
- Lizenz-Screen liest URL-Parameter `?key=` und optional `?store=` und füllt die Felder vor. Nach erfolgreicher Aktivierung Parameter per `history.replaceState` aus der Adresszeile entfernen.
- Dev-Panel (`frontend/src/components/AnalyticsDashboard.tsx`, Key-Verwaltung): Button „Aktivierungs-Link kopieren" pro Key → `${window.location.origin}/?key=<KEY>` in die Zwischenablage.
- Akzeptiertes Risiko: Key in URL ist okay, da Keys ohnehin per Chat verschickt werden.

### C. Lizenz-Reset-Button (killt Cache-Trickserei)
- `frontend/src/contexts/LicenseContext.tsx`: `reset()`-Funktion exportieren — löscht gezielt die License-localStorage-Einträge (`LICENSE_TOKEN_STORAGE`, `LICENSE_KEY_STORAGE`) und setzt State zurück.
- Button „Lizenz zurücksetzen" im Lizenz-Screen (und Einstellungen, falls dort Lizenz-Info angezeigt wird).

### D. Factory-Reset im Dev-Panel (killt Migration+Redeploy für Setup-Reset)
- Backend: neuer Endpoint `POST /api/auth/factory-reset` in `backend/src/routes/authRoutes.ts` + Controller in `authController.ts`, geschützt mit `authenticate` + `requireDeveloper`. Löscht alle Manager (Body-Flag `includeCashiers: true` optional auch Cashier; Developer-Accounts nie). Antwort: aktualisierter `needsSetup`-Status.
- Frontend Dev-Panel: Button mit Bestätigungsdialog („Manager-Accounts werden gelöscht, Setup wird wieder geöffnet — nur für Demo/Test!").
- Backend-Test für den Endpoint ergänzen (Testsetup existiert: vitest, `backend/.env.test`).

### G. Token-/Fehler-Klarheit
- `backend/src/controllers/authController.ts` / `middleware/authMiddleware.ts`: `TokenExpiredError` von `jwt.verify` explizit abfangen → 401 mit `errorCode: "token_expired"`; sonst `"token_invalid"`.
- `JWT_EXPIRES_IN` per Env konfigurierbar machen (Default `"8h"`, in `render.yaml` dokumentiert).
- Frontend: bei `token_expired` automatisch ausloggen und Hinweis im Login-Screen zeigen („Sitzung abgelaufen, bitte erneut einloggen").

### Validierung Phase 1
- `cd backend && npm run test` grün (inkl. neuem Factory-Reset-Test).
- Manuell lokal (Docker-DB): Wizard-Flow komplett durchklicken; Aktivierungs-Link mit `?key=` öffnen (Felder vorbefüllt); Lizenz-Reset; Factory-Reset als Developer → Setup wieder offen → erneutes Setup möglich.
- Deploy auf Render wie bisher (push auf das Online-Repo triggert Deploy); danach Smoke-Test gegen `https://kassensystem-8vl2.onrender.com`.

## Phase 2 — Docker-Produktiv-Bundle + Provisionierung (VPS-ready)

### Dockerfile (neu, Repo-Root)
- Multi-Stage: (1) Frontend bauen (`frontend/`), (2) Backend bauen (`backend/`, TypeScript), (3) Runtime `node:20-alpine` mit `backend/dist`, Frontend-Build als `dist-static` (wie `render.yaml`-Build), `migrations/`, `scripts/`.
- Start-Kommando analog Render: `node scripts/migrate.cjs up && node dist/server.js`.

### docker-compose.prod.yml (neu)
- Services: `app` (Dockerfile-Build) + `db` (`postgres:16-alpine`, named Volume, Healthcheck analog bestehender `docker-compose.yml`).
- Env über `.env.production`-Template (`.env.production.example` committen): `DATABASE_URL` auf Compose-DB, `JWT_SECRET`, `PORT`, `NODE_ENV=production`.
- Für Multi-Kunden-VPS vorbereitet: Compose-Projektname und App-Port per Variable (`CUSTOMER`, `APP_PORT`), damit mehrere Stacks nebeneinander laufen.

### scripts/provision-customer.sh (neu, bash)
- Parameter: Kundenname, Plan (`trial|basic|pro`), optionale Laufzeit.
- Schritte: (1) Lizenz-Key via Developer-API (`POST /api/license/keys`) auf dem Zentralserver erzeugen (Developer-Credentials + Zentral-URL aus env/`provision.env`), (2) `docker compose -f docker-compose.prod.yml -p <kunde> up -d`, (3) Aktivierungs-Link ausgeben: `http(s)://<host>:<port>/?key=<KEY>`.
- Idempotent machen (bei erneutem Lauf Stack nur neu starten, Key nicht doppelt erzeugen — oder bewusst neu + Hinweis).

### Doku
- `AGENTS.md`: neue Sektion „Produktiv-Deployment (Docker/VPS) + Kunden-Provisionierung" — Build, Compose, Provisionierungs-Skript, Hinweis dass Render-Setup Interim ist.

### Validierung Phase 2
- `docker build` erfolgreich; `docker compose -f docker-compose.prod.yml up -d` lokal → `GET /health` ok → Setup-Flow im Browser durchklickbar.
- `provision-customer.sh` einmal echt lokal durchlaufen (Key landet auf Zentrale, Stack läuft, Link funktioniert).

## Risiken & Mitigation
- **Factory-Reset-Missbrauch:** Endpoint strikt developer-only, UI mit Confirm-Dialog, Developer-Accounts sind nie löschbar.
- **Aktivierungs-Link-Leak:** Key in URL akzeptiert (Verteilung läuft eh per Chat); URL-Cleanup nach Aktivierung.
- **Render Free Postgres läuft zeitlich ab:** Pilot-Instanz als Demo behandeln; Phase 2 ist der Exit-Pfad. Kein produktiver Kunde auf Render Free DB.
- **Wizard-Umbau bricht bestehenden Flow:** Lizenz-Gate-Reihenfolge in `App.tsx` (`checking → none/expired → active → needsSetup → login`) beim Refactoring 1:1 erhalten.

## Reihenfolge der Umsetzung
1. D + G (Backend klein, Tests) → sofort spürbare Entzerrung.
2. A + C (Frontend-Wizard, Reset).
3. B (Links, Dev-Panel-Button).
4. Validierung Phase 1, Deploy auf Render.
5. Phase 2: Dockerfile → Compose → Provisionierungs-Skript → lokale Validierung → AGENTS.md.
