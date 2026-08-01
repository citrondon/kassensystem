# Kassensystem Workflow-Härtung: Skill + Scripts + MCP Integration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Die heutigen Learnings (APK-Build, OTA, per-Store Setup, VPS-Deploy, Debugging) in wiederverwendbare Artefakte gießen, damit die nächste Session nicht wieder alles von Null rekonstruieren muss.

**Architecture:** Drei Ebenen: (1) Hermes-Skill mit kompletter Runbook, (2) Ein-Kommando-Scripts im Repo, (3) MCP-Server der die site.de API + VPS-Operationen kapselt.

**Tech Stack:** Bash, Node.js, Hermes Skills, MCP (Model Context Protocol)

---

## Kontext: Was heute gelernt wurde (Session 2026-07-31)

### Bugs & Fixes (Zeitfresser)
1. **"Unexpected token '<'" in APK** → `npm run build:mobile` nutzen, nicht `npm run build` (`.env.mobile` → VITE_API_BASE). WebView serviert sonst index.html für API-Calls.
2. **Debug/Release Keystore-Mismatch** → Neuinstallation + Lizenzverlust. Fix: Release-Keystore konsistent nutzen.
3. **Per-Store Setup-Status** → users.store_id Migration + X-Store-Id Header. Ohne Fix: neuer Store sieht Login statt Setup-Wizard.
4. **site.de DNS Control blockiert** → .bj Registry lässt Nameserver-Sync nicht zu. Support-Mail geschickt.

### Infrastruktur (fertiggestellt)
- OTA-Updates via @capgo/capacitor-updater (per-store versioning, rollback, staged rollout)
- /api/app-version Endpoint mit storeOverrides + history
- VPS: Port 5000 direkt exponiert, CORS_ORIGIN='*', OTA_UPLOAD_KEY konfiguriert
- Release-Keystore signiert, APK auf Desktop

### Tooling-Erkenntnis
- **OpenCLI** installiert für Desktop-Browser-Automation (viel besser als CDP für Web)
- **CDP bleibt nötig** für Android WebView Debugging
- **paramiko SSH** für VPS statt interaktiver SSH (lockt nach ~5 Versuchen)

---

## Task 1: Hermes-Skill "kassensystem-dev" erstellen

**Objective:** Ein Skill der die komplette Runbook enthält — nächstes Mal reicht `skill_view`.

**Files:**
- Create: `~/AppData/Local/hermes/skills/devops/kassensystem-dev/SKILL.md`

**Inhalt (Struktur):**
```markdown
---
name: kassensystem-dev
description: Use when working on the kassensystem POS repo (Mon Comptoir) — APK builds, OTA, VPS deploys, device debugging.
---

# Kassensystem Dev Runbook

## Projekt-Fakten
- GitHub: citrondon/kassensystem (branch master → origin2)
- Stack: React+Vite+TS frontend, Express+PG backend, Capacitor APK
- VPS: 37.114.41.246 (paramiko SSH, root)
- Dev login: developer/dev12345, Demo key: MC-PRO-2026-DEMO-KEY

## APK-Build (CRITICAL)
1. IMMER `npm run build:mobile` (nicht `npm run build`!)
2. `npx cap sync android`
3. `cd android && ./gradlew.bat assembleRelease` (Release) oder `assembleDebug`
4. APK: frontend/android/app/build/outputs/apk/{debug,release}/app-{debug,release}.apk

## OTA Deploy
- `bash scripts/deploy-ota.sh` (braucht OTA_UPLOAD_KEY in provision.env)
- `bash scripts/deploy-ota.sh v1.2.0 --store=2` (staged)
- Rollback: POST /api/app-version/rollback

## VPS Deploy
- git push origin master → paramiko SSH → git pull → docker compose up -d --build app

## Device Debugging
- WebView: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
- Desktop: opencli browser <session> open/type/click

## Pitfalls
- Keystore-Mismatch = Neuinstallation = Lizenz weg
- store_id fehlt = Setup-Wizard übersprungen
- .bj Registry blockt DNS control
```

**Verification:** `hermes skill view kassensystem-dev` zeigt Inhalt.

---

## Task 2: Ein-Kommando-Build-Script

**Objective:** `npm run apk:release` das Frontend+Sync+Gradle in einem Schritt macht.

**Files:**
- Modify: `frontend/package.json` (scripts)

**Step 1: Add script**

```json
"apk:release": "npm run cap:sync && cd android && ./gradlew.bat assembleRelease",
"apk:debug": "npm run cap:sync && cd android && ./gradlew.bat assembleDebug"
```

**Step 2: Verify**

Run: `cd frontend && npm run apk:debug`
Expected: APK in `android/app/build/outputs/apk/debug/`

---

## Task 3: VPS-Deploy-Script (paramiko)

**Objective:** `scripts/deploy-vps.sh` das pull+rebuild+restart per paramiko macht (kein interaktives SSH).

**Files:**
- Create: `scripts/deploy-vps.py` (Python paramiko)
- Create: `scripts/deploy-vps.sh` (Wrapper)

**Step 1: Write deploy-vps.py**

```python
#!/usr/bin/env python3
"""Deploy kassensystem to VPS: git pull + docker rebuild."""
import paramiko, sys, os

HOST = os.environ.get("VPS_HOST", "37.114.41.246")
USER = os.environ.get("VPS_USER", "root")
PASS = os.environ.get("VPS_PASSWORD")  # aus provision.env oder env var

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=10)

for cmd in [
    "cd /opt/kassensystem && git pull origin master",
    "cd /opt/kassensystem && docker compose --env-file .env.server -f docker-compose.server.yml up -d --build app",
    "sleep 6 && curl -s http://localhost:5000/health",
]:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"$ {cmd}\n{out}")
    if err and "warning" not in err.lower():
        print(f"STDERR: {err}")

ssh.close()
```

**Step 2: Write wrapper**

```bash
#!/usr/bin/env bash
# Usage: bash scripts/deploy-vps.sh
cd "$(dirname "$0")/.."
if [ ! -f provision.env ]; then echo "provision.env fehlt"; exit 1; fi
export VPS_PASSWORD=$(grep '^DEV_PASSWORD=' provision.env | cut -d= -f2-)
python3 scripts/deploy-vps.py
```

**Step 3: Commit**

```bash
git add scripts/deploy-vps.py scripts/deploy-vps.sh
git commit -m "feat: paramiko VPS deploy script"
```

---

## Task 4: MCP-Server für site.de API

**Objective:** MCP-Server der DNS-Records für moncomptoir.bj verwaltet — kein Token mehr per Hand.

**Files:**
- Create: `mcp/site-de-server.js` (Node.js)

**Step 1: Install MCP SDK**

Run: `npm install -g @modelcontextprotocol/sdk`

**Step 2: Write server**

```javascript
// mcp/site-de-server.js
// MCP Server: site.de API für moncomptoir.bj (Domain ID 35051)
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const TOKEN = process.env.SITE_DE_TOKEN; // aus provision.env

const server = new McpServer({ name: "site-de", version: "1.0.0" });

// DNS-Records auslesen
server.tool("dns_get", async () => {
  const res = await fetch(`https://backend.site.de/v2/domain_names/35051`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(data.dns_records || [], null, 2) }] };
});

// DNS-Records setzen (A-Records auf VPS-IP)
server.tool("dns_set", async ({ records }) => {
  const res = await fetch(`https://backend.site.de/v2/domain_names/35051/dns_records`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify({ dns_records: records }),
  });
  return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
```

**Step 3: Token in provision.env**

```bash
echo "SITE_DE_TOKEN=<token>" >> provision.env
```

**Step 4: MCP konfigurieren**

In Hermes config: `hermes mcp add site-de --command "node mcp/site-de-server.js"`

**Step 5: Verify**

Run: `opencli browser pos state` → kein Fehler; dann MCP tool `dns_get` testen

---

## Task 5: Changelog + Version-Management

**Objective:** Jede Release-APK trägt versionCode/versionName und einen CHANGELOG-Eintrag.

**Files:**
- Create: `frontend/CHANGELOG.md`
- Modify: `frontend/android/app/build.gradle` (versionCode auto-increment)

**Step 1: CHANGELOG anlegen**

```markdown
# Changelog — Mon Comptoir

## v1.1.0 (2026-07-31)
- Per-store Setup-Wizard (users.store_id)
- OTA per-store versioning + rollback
- Release-Keystore signiert

## v1.0.0 (2026-07-31)
- Erste Release-APK
```

**Step 2: versionCode automatisch**

```gradle
versionCode Integer.parseInt(new Date().format('yyyyMMdd'))  // oder git describe
versionName "1.1.0"
```

**Step 3: Commit**

```bash
git add frontend/CHANGELOG.md frontend/android/app/build.gradle
git commit -m "feat: changelog + dynamic versionCode"
```

---

## Task 6: Abschluss-Check + Skill verifizieren

**Step 1: Alle Scripts testen**

Run: `bash scripts/deploy-vps.sh` (dry-run, nur git pull)
Run: `cd frontend && npm run apk:debug`
Run: `hermes skill view kassensystem-dev`

**Step 2: README Sektion "Dev Workflow"**

```markdown
## Dev Workflow (schnell)
- APK bauen: cd frontend && npm run apk:release
- VPS deployen: bash scripts/deploy-vps.sh
- OTA pushen: bash scripts/deploy-ota.sh [version] [--store=ID]
- Debuggen: hermes skill kassensystem-dev
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: dev workflow tooling + docs"
git push origin master
```

---

## Files Changed

| File | Change |
|------|--------|
| `~/AppData/Local/hermes/skills/devops/kassensystem-dev/SKILL.md` | Neuer Skill |
| `frontend/package.json` | apk:release script |
| `scripts/deploy-vps.py` + `.sh` | paramiko VPS deploy |
| `mcp/site-de-server.js` | MCP Server |
| `provision.env` | SITE_DE_TOKEN |
| `frontend/CHANGELOG.md` | Neu |
| `frontend/android/app/build.gradle` | versionCode dynamisch |
| `README.md` | Dev Workflow Sektion |

## Risks

- **paramiko Passwort in provision.env** — gitignored, aber Zugriff schützen
- **SITE_DE_TOKEN** — gleiche Behandlung wie andere Secrets
- **MCP braucht @modelcontextprotocol/sdk** — global installieren, Version pinnen

## Open Questions

- Soll das MCP auch License-Keys verwalten (create/list/update)? Das wäre nützlich für Kunden-Provisionierung.
- Soll der Skill in's Repo (unter .hermes/) statt global? Dann wäre er versioniert mit-tragbar.
