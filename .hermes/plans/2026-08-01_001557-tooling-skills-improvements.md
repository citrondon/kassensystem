# Tooling & Skills Verbesserung — Lessons learned aus Session 2026-07-31

> **Für Hermes:** Skills anlegen/pflegen, MCP registrieren, Memory konsolidieren. Kein Produktcode.

**Goal:** Nächste Kassen-Session soll schneller starten: DNS über natives Tool, Browser-Automation über OpenCLI statt Ad-hoc-Python, APK-Debug über wiederverwendbares Script, Memory konsolidiert.

**Architecture:** 3 Hebel — (1) MCP-Server registrieren (site.de hat einen!), (2) Skills anlegen/pflegen, (3) Memory aufräumen + Scripts in Repo.

**Tech Stack:** Hermes MCP config (`config.yaml`), OpenCLI, Python/websockets (CDP), bash.

---

## Warum das heute wichtig war (Retrospektive)

Was heute passiert ist und was es uns gekostet hat:

| Ereignis | Kosten | Lesson |
|----------|--------|--------|
| `.env.mobile` nicht geladen → "expected token" | ~10 Tool-Calls Debugging | `build:mobile` Pflicht — schon im Skill, aber erst NACH dem Fehler |
| Debug↔Release Signatur-Mismatch → Reinstall → Lizenz weg | Verwirrung, Neuinstallation | Release-Keystore IMMER für Distribution |
| Freund: "StorName/MaschineID erforderlich" | Hin- und Her mit Freund | Error-Messages klarer machen, Demo-Key pro Gerät |
| setup-status global statt per-Store | Backend-Fix nötig | store_id durchziehen (schon im Skill) |
| DNS blockiert (.bj Registry) | Support-Mail an site.de | **site.de hat MCP-Endpoint — natives Tool möglich** |
| OpenCLI installiert, funktioniert | — | Für Desktop-Chrome-Automation nutzen |

**Der wichtigste Fund:** site.de API hat `POST /v2/mcp` — einen echten MCP-Endpoint. Hermes kann den als MCP-Server registrieren → DNS/Admin-Funktionen werden native Tools statt curl+Token-Gefummel.

---

## Task 1: site.de MCP-Server in Hermes registrieren

**Objective:** DNS-Verwaltung für moncomptoir.bj als natives Tool verfügbar machen (kein Token-Pasten, keine curl-Doku).

**Files:**
- Modify: `C:\Users\pasca\AppData\Local\hermes\config.yaml` (mcp_servers Sektion, Zeile ~616)

**Step 1: MCP-Endpoint prüfen**

Der site.de MCP-Endpoint: `https://backend.site.de/v2/mcp` (GET/POST/HEAD/OPTIONS). Braucht API-Key-Auth (Bearer). Erlaubt supplier, domain, invoice, translation management.

Frage: unterstützt Hermes Remote-MCP mit Bearer-Header? → `hermes mcp add --help` oder `hermes-agent` Skill checken.

**Step 2: Konfiguration ergänzen**

```yaml
mcp_servers:
  site-de:
    url: https://backend.site.de/v2/mcp
    headers:
      Authorization: "Bearer <API_KEY>"
    enabled: true
    connect_timeout: 30
    timeout: 120
```

API-Key liegt bei: (User hat ihn heute im Chat gepostet — in eine sichere .env/Secrets-Datei legen, NICHT in config.yaml committen).

**Step 3: Verifizieren**

Run: `hermes mcp status` oder Tools-Liste checken → site.de Tools sichtbar (z.B. `site_de_get_domain`, `site_de_update_dns`)

Expected: Domain 35051 (moncomptoir.bj) abrufbar, DNS-Records änderbar ohne curl.

**Step 4: Commit**

Kein Commit — lokale Hermes-Config, nicht im Repo.

**Pitfalls:**
- Token nicht in config.yaml hardcoden wenn Repo gesynct wird
- MCP-Endpoint könnte OAuth brauchen statt Bearer → dann `auth: oauth` statt headers (wie prism Eintrag)
- `.bj` Registry-Problem bleibt: DNS control aktivieren geht evtl. auch über MCP nicht — Support-Mail bleibt parallel offen

---

## Task 2: Skill `opencli` anlegen

**Objective:** OpenCLI-Workflow dokumentieren — Browser-Automation auf Desktop-Chrome als CLI-Befehle statt CDP-Python.

**Files:**
- Create: `C:\Users\pasca\AppData\Local\hermes\skills\software-development\opencli\SKILL.md`

**Step 1: Skill-Inhalt schreiben**

```markdown
---
name: opencli
description: "Browser automation on Desktop Chrome via OpenCLI CLI — faster than raw CDP. Not for Android WebView."
---

# OpenCLI — Browser Automation CLI

Use when automating logged-in Chrome on the desktop (form filling, scraping,
navigation). NOT for Android WebView (Capacitor APK) — that needs CDP over adb.

## Setup (already done on this machine)
- Extension in Chrome installiert (jrywhhfj profile)
- `npm install -g @jackwener/opencli` → opencli v1.8.6
- Daemon: `opencli daemon restart` (Port 19825)
- Diagnose: `opencli doctor`

## Grundbefehle
opencli browser <session> open <url>          # Tab öffnen
opencli browser <session> state               # AX-Tree mit [N] Refs
opencli browser <session> find --css <sel>    # Elemente finden
opencli browser <session> type <target> <txt> # Klicken + Tippen
opencli browser <session> click <ref>         # Klicken
opencli browser <session> keys "Enter"        # Tastendruck
opencli browser <session> screenshot [path]   # Screenshot
opencli browser <session> eval <js>           # JS ausführen

## Site-Adapter (163 verfügbar)
opencli list                                  # alle Adapter
opencli <site> --help                         # ein Site-Adapter

## Vergleich CDP vs OpenCLI
- Desktop Chrome: OpenCLI (Extension, eingeloggt) — schneller, lesbarer
- Android WebView: CDP via adb forward (keine Extension in WebView möglich)

## Pitfalls
- Daemon muss laufen: `opencli daemon status` / `restart`
- Extension "No daemon connected" → daemon restart
- `find` braucht --css für CSS-Selektoren, sonst semantische Suche
- `type` nutzt Positional-Args, nicht --css
- Google Enter: Form kann anders sein — `keys "Enter"` wirkt nicht immer, dann Form-Submit-Button finden
```

**Step 2: Verifizieren**

Run: `skill_view(name='opencli')` → Inhalt korrekt

---

## Task 3: CDP-WebView-Debug als Script im Repo

**Objective:** Ad-hoc-Python (websockets) von heute in wiederverwendbares Script verwandeln — `scripts/cdp-debug.py`.

**Files:**
- Create: `C:\Users\pasca\kassensystem\scripts\cdp-debug.py`

**Step 1: Script schreiben**

```python
#!/usr/bin/env python3
"""CDP-Debug für Capacitor-Android-WebView.
Usage:
  python scripts/cdp-debug.py connect   # adb forward + target id ausgeben
  python scripts/cdp-debug.py eval "<js>"  # Runtime.evaluate auf der Seite
  python scripts/cdp-debug.py body      # body.innerText anzeigen
  python scripts/cdp-debug.py fetch <url> # fetch-Test (JSON/HTML-Detektiv)
"""
import json, subprocess, sys, asyncio, websockets, re

def adb(*args):
    return subprocess.run(["adb", *args], capture_output=True, text=True).stdout.strip()

def find_webview_pid():
    out = adb("shell", "cat /proc/net/unix | grep webview_devtools")
    m = re.search(r"webview_devtools_remote_(\d+)", out)
    return m.group(1) if m else None

def connect():
    pid = find_webview_pid()
    if not pid:
        print("Keine WebView gefunden — App starten?")
        sys.exit(1)
    port = adb("forward", "tcp:9222", f"localabstract:webview_devtools_remote_{pid}")
    targets = json.loads(subprocess.run(["curl", "-s", "http://localhost:9222/json"], capture_output=True, text=True).stdout)
    print(f"pid={pid} port={port} target={targets[0]['id']} url={targets[0]['url']}")

async def evaluate(js):
    port = adb("forward", "tcp:9222", "localabstract:" + adb("shell", "cat /proc/net/unix | grep webview_devtools | tail -1").split("webview_devtools_remote_")[-1])
    targets = json.loads(subprocess.run(["curl", "-s", "http://localhost:9222/json"], capture_output=True, text=True).stdout)
    uri = targets[0]["webSocketDebuggerUrl"].replace("localhost:9222", "localhost:9222")
    async with websockets.connect(uri, max_size=10*1024*1024) as ws:
        await ws.send(json.dumps({"id":1, "method":"Runtime.enable"}))
        await ws.send(json.dumps({"id":2, "method":"Runtime.evaluate", "params":{"expression": js, "awaitPromise": True}}))
        while True:
            msg = json.loads(await ws.recv())
            if msg.get("id") == 2:
                r = msg["result"]["result"]
                print(r.get("value", r.get("description", "")))
                return

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "connect"
    if cmd == "connect": connect()
    elif cmd == "eval": asyncio.run(evaluate(sys.argv[2]))
    elif cmd == "body": asyncio.run(evaluate("document.body ? document.body.innerText.substring(0,1000) : 'no body'"))
    elif cmd == "fetch":
        asyncio.run(evaluate(f"fetch('{sys.argv[2]}').then(r=>r.text()).then(t=>t.substring(0,500)).catch(e=>'ERR: '+e)"))
```

**Step 2: Testen**

Run: `python scripts/cdp-debug.py connect` → pid + target ausgeben  
Run: `python scripts/cdp-debug.py body` → sichtbarer Text der App  
Expected: WebView gefunden, Text ausgegeben

**Step 3: Commit**

```bash
git add scripts/cdp-debug.py
git commit -m "feat: CDP debug script for Capacitor WebView"
```

**Pitfalls:**
- Keine WebView-Connection wenn App nicht läuft oder force-stop nötig
- adb-Pfad kann variieren: `/c/Users/pasca/Android/Sdk/platform-tools/adb.exe`
- Port-Konflikt: wenn 9222 belegt, anderen Port nutzen

---

## Task 4: Skill `kassensystem-frontend` pflegen (heutige Learnings)

**Objective:** Was heute gelernt wurde in den Skill — OTA-Deploy-Commands, Rollback, Demo-Key-Problematik, site.de-MCP.

**Files:**
- Modify: `C:\Users\pasca\AppData\Local\hermes\skills\software-development\kassensystem-frontend\SKILL.md`

**Step 1: OTA-Abschnitt erweitern (bereits teilweise da)**

Ergänzen:
- **Rollback**: `curl -X POST -H "X-OTA-Key: $KEY" http://37.114.41.246:5000/api/app-version/rollback`
- **Staged rollout**: `bash scripts/deploy-ota.sh v20260801-0900 --store=2` → pinnt Store auf Version
- **Store-Pin entfernen**: `curl -X DELETE -H "X-OTA-Key: $KEY" http://37.114.41.246:5000/api/app-version/set-store/2`
- **Per-Store versioning**: GET `/api/app-version?storeId=N` — App sendet storeId aus `pos_license_info`

**Step 2: Demo-Key-Abschnitt ergänzen**

- Demo-Key `MC-PRO-2026-DEMO-KEY` ist **einmal pro Gerät** — nach Aktivierung auf Gerät A kann Gerät B nicht mehr. Neuen Key via Developer-API erzeugen (steht schon im Skill, Verweis reicht).

**Step 3: Verifizieren**

Run: `skill_view(name='kassensystem-frontend')` → Ergänzungen sichtbar

---

## Task 5: Memory konsolidieren (98% voll)

**Objective:** Memory-Entries aufräumen — Platz für neues schaffen, Veraltetes kürzen.

**Aktuell:** 4,337/4,400 Zeichen (98%).

**Step 1: Kandidaten prüfen (nicht löschen ohne Freigabe!):**

- `Tool quirks: like4like repo git...` — alt, aber klein (~110 Zeichen)
- `Reddit: karma farm v2` — lang (~230 Zeichen), nur relevant bei Reddit-Sessions
- `LC ci_session=UA-bound` — lang (~400 Zeichen), spezifisch für linkcollider
- Omega-Eintrag — sehr lang (~700 Zeichen), NSFW-Kontext

**Step 2: Kürzen statt löschen:**

Beispiel (LC-Eintrag kürzen):
```
Alt: "LC ci_session=UA-bound: Chrome/124 vs 151→empty body. Fix: UA aus CDP. TW @VexLila. CDP Helpers in linkcollider_bot.py: _cdp_find_tab/_cdp_navigate_and_wait/_cdp_eval — single WS, loadEventFired wait, retry, already-following→True, trust-click. tw_follow_cdp rewritten. Self-check: linkcollider_bot_selfcheck.py (6 mock-WS tests, no framework). tt_follow_cdp+yt_subscribe_cdp noch broken (3×reconnect+fix sleeps) → refactor pending."
Neu: "LC ci_session=UA-bound. CDP helpers in linkcollider_bot.py (_cdp_find_tab/_cdp_navigate_and_wait/_cdp_eval). Self-check: linkcollider_bot_selfcheck.py. tt/yt_subscribe_cdp broken → refactor pending."
```

**Step 3: site.de API-Key sicher speichern**

NICHT in Memory (gehört zu Secrets). Vorschlag: in `provision.env` oder 1Password-Skill. Memory-Entry nur: "site.de API key in provision.env / 1password, Domain ID 35051".

---

## Task 6: deploy-ota.sh Rollback-Helper

**Objective:** Rollback-Befehle in deploy-Script integrieren — kein curl-Merken nötig.

**Files:**
- Modify: `C:\Users\pasca\kassensystem\scripts\deploy-ota.sh`

**Step 1: Rollback-Subcommand**

```bash
# Usage: bash scripts/deploy-ota.sh rollback
if [ "${1:-}" = "rollback" ]; then
  echo "→ Rolling back..."
  curl -s -X POST -H "X-OTA-Key: $OTA_UPLOAD_KEY" "$VPS_URL/api/app-version/rollback"
  exit 0
fi

# Usage: bash scripts/deploy-ota.sh unstore <storeId>
if [ "${1:-}" = "unstore" ]; then
  curl -s -X DELETE -H "X-OTA-Key: $OTA_UPLOAD_KEY" "$VPS_URL/api/app-version/set-store/${2}"
  exit 0
fi
```

**Step 2: Testen**

Run: `bash scripts/deploy-ota.sh rollback` → `{"success":true,"rolledBackTo":"..."}`  
Expected: Fehler "No previous version" falls keine History — OK, kein Schaden.

**Step 3: Commit**

```bash
git add scripts/deploy-ota.sh
git commit -m "feat: deploy-ota.sh rollback + unstore subcommands"
```

---

## Files Changed

| File | Change |
|------|--------|
| `C:\Users\pasca\AppData\Local\hermes\config.yaml` | site-de MCP-Server registrieren |
| `C:\Users\pasca\AppData\Local\hermes\skills\software-development\opencli\SKILL.md` | Neuer Skill |
| `C:\Users\pasca\kassensystem\scripts\cdp-debug.py` | Neues Debug-Script |
| `...\kassensystem-frontend\SKILL.md` | OTA/Rollback/Demo-Key ergänzen |
| Memory | Konsolidieren, Platz schaffen |
| `C:\Users\pasca\kassensystem\scripts\deploy-ota.sh` | rollback + unstore subcommands |

## Tests / Validation

- `opencli doctor` → Extension connected
- `python scripts/cdp-debug.py connect` → WebView pid gefunden
- `bash scripts/deploy-ota.sh rollback` → JSON-Antwort
- `skill_view(name='opencli')` + `skill_view(name='kassensystem-frontend')` → Inhalt korrekt
- `hermes mcp status` → site-de sichtbar

## Risks / Offene Fragen

- **site.de MCP-Auth-Format unklar** — Bearer vs OAuth. Erst ausprobieren, dann konfigurieren.
- **`.bj` Registry-Block** bleibt — MCP hilft evtl. nicht beim Aktivieren von DNS control. Support-Mail parallel.
- **Memory ist 98% voll** — Kürzen nur mit User-Freigabe (User-Regel: NICHTS löschen ohne Erlaubnis).
- **OpenCLI für POS-Testing** — Könnte die Web-Version der App automatisiert testen. Eigener Task wenn gewünscht.
