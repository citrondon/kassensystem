# AI Setup Prompt – Kassensystem POS

## Schnellstart (Linux)

```bash
git clone https://github.com/citrondon/kassensystem.git
cd kassensystem
bash setup.sh
```

`setup.sh` übernimmt alles: Prereqs-Check, .env kopieren, Docker DB, npm install, migrate, seed, Healthcheck.

## Prompt zum Kopieren (für KI-Assistenten)

> Kopiere den folgenden Block in deinen KI-Assistenten. Der Agent soll das Projekt automatisch klonen, aufsetzen und starten.

```
Setze das Repository https://github.com/citrondon/kassensystem.git auf meinem Rechner auf.

Ablauf:
1. Klone das Repo: git clone https://github.com/citrondon/kassensystem.git
2. Wechsle ins Verzeichnis: cd kassensystem
3. Führe aus: bash setup.sh
4. Starte Backend: cd backend && npm run dev
5. Starte Frontend (neues Terminal): cd frontend && npm run dev
6. Prüfe: http://localhost:5000/health → {"status":"ok"}
7. Prüfe: http://localhost:3000 → Login mit admin/pos123 oder kasse/pos123

Hinweise:
- Linux: Docker via apt install docker.io. Node 20+ via nvm: nvm install 20.
- bcrypt braucht build-essential: sudo apt install build-essential python3 make g++
- Ports 3000, 5000, 5432 müssen frei sein.
- backend/.env und backend/.env.test dürfen niemals committed werden.
- npm run dev beendet sich nicht — das ist korrekt (Dev-Server).
```

---

## Manuelle Schritt-für-Schritt-Anleitung

### Schritt 1: Repository klonen

```bash
git clone https://github.com/citrondon/kassensystem.git
cd kassensystem
```

### Schritt 2: Umgebungsvariablen anlegen

Diese Dateien müssen **vor** Docker Compose existieren:

```bash
cd backend
cp .env.example .env
cp .env.test.example .env.test
cd ..
```

### Schritt 3: Datenbank starten (Docker)

```bash
docker compose up -d
```

> Docker muss installiert und laufen. Die Datenbank läuft auf `localhost:5432` und wird beim ersten Start mit `db/init.sql` initialisiert.

Falls Docker nicht verfügbar ist:
- PostgreSQL 16+ lokal installieren.
- `backend/.env` und `backend/.env.test` an lokale DB-Zugangsdaten anpassen.
- `db/init.sql` manuell ausführen.

### Schritt 4: Backend einrichten

```bash
cd backend
npm install
npm run migrate      # Datenbank-Schema + Migrationen anwenden
npm run seed         # Demo-Benutzer anlegen
npm run dev
```

Das Backend läuft auf **http://localhost:5000**.

### Schritt 5: Frontend einrichten

Neues Terminal:

```bash
cd frontend
npm install
npm run dev
```

Das Frontend läuft auf **http://localhost:3000** und leitet API-Calls automatisch an `localhost:5000` weiter.

### Schritt 6: Tests optional ausführen

```bash
cd backend
npm run test
```

### Schritt 7: Validierung

- Frontend: `http://localhost:3000` sollte die POS-App laden.
- Backend-Healthcheck: `GET http://localhost:5000/health` sollte `{status: "ok"}` zurückgeben.
- API: `GET http://localhost:5000/api/products` sollte JSON mit Produkten zurückgeben.
- Anmelden mit `admin`/`pos123` (Manager) oder `kasse`/`pos123` (Kassierer).

---

### Tech-Stack-Übersicht

| Layer      | Technologie                              |
|------------|------------------------------------------|
| Frontend   | React 18, Vite, TypeScript, Tailwind CSS |
| Backend    | Express 4, TypeScript, tsx (dev)         |
| Datenbank  | PostgreSQL 16 (Docker)                   |
| Icons      | lucide-react                             |
| Scanner    | react-qr-barcode-scanner (Webcam)        |

### Wichtige Ports

| Service    | Port  |
|------------|-------|
| Frontend   | 3000  |
| Backend    | 5000  |
| PostgreSQL | 5432  |

### Verfügbare npm-Scripts

**Backend** (`cd backend/`):
- `npm run dev` – Dev-Server mit Hot-Reload (tsx watch)
- `npm run build` – TypeScript kompilieren
- `npm run start` – Produktiv-Build starten
- `npm run migrate` – Migrationen anwenden
- `npm run migrate:down` – Letzte Migration zurückrollen
- `npm run seed` – Demo-Benutzer anlegen
- `npm run test` – Backend-API-Tests ausführen

**Frontend** (`cd frontend/`):
- `npm run dev` – Vite Dev-Server
- `npm run build` – Produktiv-Build
- `npm run preview` – Preview des Builds

### Projektstruktur

```
├── backend/           # Express + TypeScript API (Port 5000)
│   ├── src/
│   │   ├── controllers/    # Business-Logik
│   │   ├── middleware/     # Auth-Middleware
│   │   ├── routes/         # API-Routen
│   │   ├── utils/          # DB-Pool
│   │   ├── validation/     # Zod-Validierung
│   │   └── server.ts       # Entrypoint
│   ├── migrations/         # node-pg-migrate
│   ├── scripts/            # Migration/Seed-Wrapper
│   ├── .env.example        # Template für .env
│   ├── .env.test.example   # Template für .env.test
│   └── vitest.config.ts    # Test-Konfiguration
├── frontend/        # React + Vite (Port 3000)
│   ├── src/
│   │   ├── components/     # UI-Komponenten
│   │   ├── contexts/       # AuthContext
│   │   ├── services/       # API-Client
│   │   ├── utils/          # categoryStyles, Helpers
│   │   ├── App.tsx         # Haupt-Layout
│   │   └── types.ts        # TypeScript-Typen
│   └── vite.config.ts      # Vite-Config mit Proxy
├── db/
│   └── init.sql            # DB-Schema + Demo-Daten (erster Docker-Start)
└── docker-compose.yml      # PostgreSQL-Container
```

### Hinweise für KI-Agents

1. **Niemals `backend/.env` oder `backend/.env.test` committen** – sie enthalten Passwörter und sind in `.gitignore` aufgeführt.
2. **Docker ist Pflicht** für die Datenbank, es sei denn PostgreSQL ist lokal installiert.
3. **Beide Server (Backend + Frontend) müssen parallel laufen**.
4. **Das Frontend leitet `/api`-Calls via Proxy an das Backend weiter** – kein CORS-Problem.
5. **Migrationen**: Nach dem ersten DB-Start `npm run migrate` im `backend/`-Ordner ausführen.
6. **Demo-Benutzer**: `npm run seed` im `backend/`-Ordner ausführen. Login: `admin`/`pos123` (Manager) oder `kasse`/`pos123` (Kassierer).
7. **Tests**: `npm run test` im `backend/`-Ordner ausführen. Benötigen `backend/.env.test`.
8. **Docker-Container muss gesund sein**, bevor Migrationen/Seed ausgeführt werden. Prüfbar mit `docker ps`.
9. **Ports 3000, 5000, 5432** müssen auf dem Rechner frei sein.

### Troubleshooting

- **Docker Compose findet kein `.env`:** `cp backend/.env.example backend/.env` wurde vergessen oder aus der falschen Position ausgeführt.
- **Datenbank nicht erreichbar:** Container noch nicht gesund. `docker compose up -d` wiederholen und `docker ps` prüfen.
- **Port 5432 belegt:** Vorhandene PostgreSQL-Instanz stoppen oder `DB_PORT` in `backend/.env` ändern.
- **Tests schlagen fehl:** `backend/.env.test` fehlt. Vorlage: `backend/.env.test.example`.

---

## Produktiv-Deployment (Docker/VPS) + Kunden-Provisionierung

**Modell:** Mon Comptoir = Multi-Kunden-Produkt, **eine Instanz pro Kunde** (kein Multi-Tenancy). Hosting-Ziel: eigener VPS mit einem Docker-Compose-Stack pro Kunde. **Render ist Interim** (Zentralserver für Lizenz/Analytics + Pilot-Instanz).

### Dateien

| Datei | Zweck |
|-------|-------|
| `Dockerfile` | Multi-Stage-Build (Frontend → Backend → Runtime `node:20-alpine`). Start: `node scripts/migrate.cjs up && node dist/server.js` (wie Render). |
| `docker-compose.prod.yml` | Produktiv-Stack: `app` (Dockerfile-Build) + `db` (`postgres:16-alpine`, Volume, Healthcheck). Projektname `kassensystem-${CUSTOMER}`, Port `${APP_PORT}` → mehrere Kunden-Stacks nebeneinander. |
| `.env.production.example` | Template für Stack-Variablen (`CUSTOMER`, `APP_PORT`, `POSTGRES_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`). |
| `scripts/provision-customer.sh` | Kunden-Onboarding: Lizenz-Key auf Zentralserver erzeugen → Stack starten → Key in Kunden-DB spiegeln → Aktivierungs-Link ausgeben. Idempotent (Stand in `provisioned/<kunde>/.env`). |
| `provision.env.example` | Template für Zentralserver-Zugang des Provisionierungs-Skripts. |

### Manueller Stack-Start (ohne Provisionierungs-Skript)

```bash
cp .env.production.example .env.production   # Werte anpassen!
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
curl http://localhost:${APP_PORT:-5000}/health   # {"status":"ok"}
```

### Kunden provisionieren (VPS)

```bash
cp provision.env.example provision.env        # CENTRAL_URL, DEV_USERNAME, DEV_PASSWORD, PUBLIC_HOST
bash scripts/provision-customer.sh <kunde> [plan=trial|basic|pro] [laufzeit-tage=365] [app-port]
# Ausgabe: Aktivierungs-Link http(s)://<host>:<port>/?key=<KEY>
```

Der Kunde öffnet den Link → Lizenz-Felder vorbefüllt → aktivieren → Manager-Konto erstellen (Wizard-Schritte 1/2, 2/2).

### Wichtige Hinweise

1. **Key-Spiegelung:** Die Kunden-Instanz aktiviert/verifiziert Lizenzen gegen ihre **eigene** `subscriptions`-Tabelle. Das Skript spiegelt den zentral erzeugten Key deshalb in die Kunden-DB. Der Zentralserver bleibt Master; **cancel/extend auf der Zentrale propagiert aktuell nicht** auf Kunden-Instanzen.
2. **DB_SSL=false** ist im Prod-Compose gesetzt (Compose-interne Postgres kann kein SSL). Externe DBs mit SSL (Render): `DATABASE_URL` ohne `DB_SSL=false` → SSL bleibt an.
3. **`JWT_EXPIRES_IN`** steuert die Token-Laufzeit (Default `8h`).
4. **Factory-Reset** (`POST /api/auth/factory-reset`, developer-only) öffnet den Setup-Flow neu — kein Migration+Redeploy mehr nötig. Auch als Button im Dev-Panel (Analytics).
5. **`/api/debug/status`** ist developer-only (JWT), nicht mehr öffentlich.
6. **Geheimnisse:** `.env.production`, `provision.env`, `provisioned/` sind gitignored.
7. **Render Free Postgres läuft zeitlich ab** — kein produktiver Kunde auf Render Free DB; der Docker-Stack ist der Exit-Pfad.
