# Autonomous APK Testing — Best Practice Plan

> **Für Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Mon Comptoir APK auf dem Handy automatisiert testen — Fehler finden, API testen, autonome Exploration. Best Practice für Capacitor-Apps 2026.

**Architecture:** Capacitor-App = WebView + native Shell. Testing muss beide Layer abdecken: WebView-Inhalt via CDP (was wir haben), native Shell via Maestro (YAML, modern), API via curl/scripts. Autonome Exploration via AI-Agent (browser-use oder MaestroGPT).

**Tech Stack:** CDP (adb forward), Maestro (YAML), browser-use (Python), curl, pytest (Backend)

---

## Best Practice Erkenntnisse (Research)

| Tool | Für | Warum |
|------|-----|-------|
| **CDP via adb** | WebView-Inhalt (DOM, JS, Console) | Schnell, deterministisch, keine Installation auf Device |
| **Maestro** | Native UI (Permissions, Splash, Back-Button) | YAML-basiert, auto-retry, MaestroGPT für AI-Exploration |
| **Appium** | Cross-platform native tests | Overkill für einzelne Capacitor-App, hoher Setup-Aufwand |
| **browser-use** | Autonome AI-Exploration | LLM navigiert selbstständig, findet unerwartete Bugs |
| **Playwright MCP** | WebView als "Browser" | Funktioniert, aber mehr Tokens als OpenCLI/agent-browser |

**Kernaussage aus Research:** Capacitor-Apps brauchen **hybrides Testing** — WebView via CDP (wie Web-App), native Shell via Maestro/Appium (wie native App). Reines CDP reicht nicht für System-Dialogs (Kamera-Permission, etc.).

---

## Task 1: Maestro installieren + konfigurieren

**Objective:** YAML-basierte native UI Tests für die APK.

**Files:**
- Create: `maestro/flows/pos-license-flow.yaml`
- Create: `maestro/flows/pos-checkout-flow.yaml`

**Step 1: Install Maestro**

```bash
# Windows
winget install maestro
# oder
npm install -g @maestro/cli
```

Verify: `maestro --version`

**Step 2: License Activation Flow (YAML)**

```yaml
# maestro/flows/pos-license-flow.yaml
appId: bj.moncomptoir.pos
---
- launchApp
- assertVisible: "Étape 1/2"
- tapOn:
    text: "Clé de licence"
- inputText: "MC-PRO-2026-DEMO-KEY"
- tapOn:
    text: "Nom du magasin"
- inputText: "Test Store"
- tapOn:
    text: "Continuer"
- assertVisible: "Conditions Générales"
- scrollUntilVisible:
    text: "J'ai lu et j'accepte"
- tapOn:
    text: "J'ai lu et j'accepte"
- tapOn:
    text: "Activer la licence"
- assertVisible: "Étape 2/2"
```

**Step 3: Checkout Flow (YAML)**

```yaml
# maestro/flows/pos-checkout-flow.yaml
appId: bj.moncomptoir.pos
---
- launchApp
# Skip license if already activated
- runFlow:
    when:
      visible: "Étape 1/2"
    file: pos-license-flow.yaml
- assertVisible: "Tableau de bord"
- tapOn: "Caisse"
- assertVisible: "Scanner"
- tapOn: "Scanner"
# Camera permission dialog (native!)
- tapOn:
    text: "Autoriser"
- assertVisible: "Scanner actif"
# Simulate barcode scan (via CDP injection or manual)
```

**Step 4: Run test**

```bash
maestro test maestro/flows/pos-license-flow.yaml
```

Expected: App startet, License aktiviert, Setup-Screen erscheint. Bei Fehler: Screenshot + Log.

**Step 5: Commit**

```bash
git add maestro/
git commit -m "feat: Maestro E2E test flows for license + checkout"
```

**Pitfalls:**
- **testID fehlt**: Maestro braucht accessibility IDs. Capacitor generiert keine automatisch. Manuell in React-Komponenten ergänzen: `data-testid="license-key-input"` → wird zu `resource-id` in WebView.
- **WebView vs Native**: Maestro sieht WebView als natives View. Für DOM-Interaktion besser CDP nutzen.
- **Camera Permission**: System-Dialog ist nativ — Maestro kann klicken, CDP nicht.

---

## Task 2: CDP Test-Suite für WebView-Inhalt

**Objective:** Automatisierte Tests für den WebView-Teil (DOM, JS-Errors, API-Calls).

**Files:**
- Create: `scripts/apk-webview-test.py`

**Step 1: Script erweitern (basierend auf cdp-debug.py)**

```python
#!/usr/bin/env python3
"""Automated WebView test suite for Mon Comptoir APK."""
import asyncio, json, subprocess, sys, time

class WebViewTester:
    def __init__(self):
        self.errors = []
        self.screenshots = []
    
    async def run_test_suite(self):
        await self.connect()
        await self.test_license_flow()
        await self.test_login_flow()
        await self.test_checkout_flow()
        await self.report()
    
    async def test_license_flow(self):
        # Screenshot before
        # Inject license key via JS
        # Click continue
        # Assert terms visible
        # Check for JS errors
        pass
    
    async def test_api_connectivity(self):
        # fetch /api/products → expect JSON array
        # fetch /api/auth/setup-status → expect JSON
        # Any HTML response = bug
        pass
    
    async def report(self):
        # Generate HTML report with screenshots + errors
        pass
```

**Step 2: Test cases implementieren**

- License activation mit gültigem Key
- License activation mit ungültigem Key (Fehlerbehandlung)
- Login mit richtigen/falschen Credentials
- API-Connectivity (alle Endpoints testen)
- Console-Error Monitoring während Navigation
- Screenshot-Vergleich (Visuelles Regression Testing)

**Step 3: Run**

```bash
python scripts/apk-webview-test.py
```

Expected: JSON-Report mit passed/failed, Screenshots, Console-Errors.

**Step 4: Commit**

```bash
git add scripts/apk-webview-test.py
git commit -m "feat: automated WebView test suite"
```

---

## Task 3: API Test-Suite (Backend)

**Objective:** Backend-Endpoints automatisiert testen — unabhängig von UI.

**Files:**
- Create: `backend/tests/api.test.ts` (erweitern bestehende Tests)

**Step 1: Vitest erweitern**

```typescript
// backend/tests/api.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('API Endpoints', () => {
  it('GET /api/app-version returns version info', async () => {
    const res = await request(app).get('/api/app-version');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
  
  it('GET /api/app-version?storeId=2 returns store-specific version', async () => {
    const res = await request(app).get('/api/app-version?storeId=2');
    expect(res.body.success).toBe(true);
  });
  
  it('POST /api/license/activate requires termsVersion', async () => {
    const res = await request(app)
      .post('/api/license/activate')
      .send({ licenseKey: 'TEST', storeName: 'Test', machineId: 'test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('CGU');
  });
});
```

**Step 2: Run**

```bash
cd backend && npm run test
```

Expected: All API tests pass.

**Step 3: Commit**

```bash
git add backend/tests/
git commit -m "feat: extended API test coverage"
```

---

## Task 4: Autonome AI-Exploration (browser-use)

**Objective:** AI-Agent erkundet die App selbstständig, findet unerwartete Bugs.

**Files:**
- Create: `scripts/ai-explore.py`

**Step 1: browser-use installieren**

```bash
pip install browser-use
# .env: ANTHROPIC_API_KEY=sk-...
```

**Step 2: Exploration Script**

```python
#!/usr/bin/env python3
"""Autonomous AI exploration of Mon Comptoir APK."""
from browser_use import Agent
import asyncio

async def explore():
    agent = Agent(
        task="""Explore the Mon Comptoir POS app:
        1. Try to activate a license with key MC-PRO-2026-DEMO-KEY
        2. If license works, try to create a manager account
        3. Try to login with developer/dev12345
        4. Navigate to Cashier, try to scan a product
        5. Try to checkout with any product
        
        Document any errors, unexpected behavior, or UI issues you find.
        Take screenshots at each step.
        Report what works and what doesn't.""",
        llm="claude-sonnet-4-20250514",
    )
    result = await agent.run()
    print(result)

asyncio.run(explore())
```

**Step 3: Connect to Android WebView**

browser-use kann über CDP mit dem WebView sprechen, aber das ist experimentell. Alternativ: **MaestroGPT** (in Maestro Studio) für AI-Exploration.

**Step 4: Run**

```bash
python scripts/ai-explore.py
```

Expected: AI-Agent navigiert die App, dokumentiert Bugs mit Screenshots.

**Step 5: Commit**

```bash
git add scripts/ai-explore.py
git commit -m "feat: autonomous AI exploration script"
```

---

## Task 5: Integration — Vollständiger Test-Run

**Objective:** Alle Test-Ebenen in einem Skript kombinieren.

**Files:**
- Create: `scripts/run-all-tests.sh`

**Step 1: Test-Pipeline**

```bash
#!/bin/bash
# Full test pipeline: API → WebView → Native → AI Exploration

echo "=== 1. API Tests ==="
cd backend && npm run test

echo "=== 2. WebView Tests ==="
python scripts/apk-webview-test.py

echo "=== 3. Native UI Tests (Maestro) ==="
maestro test maestro/flows/

echo "=== 4. AI Exploration ==="
python scripts/ai-explore.py

echo "=== 5. Report ==="
# Combine all results into HTML report
```

**Step 2: CI-ready**

Als Cron-Job oder GitHub Action einrichten — bei jedem APK-Build automatisch testen.

**Step 3: Commit**

```bash
git add scripts/run-all-tests.sh
git commit -m "feat: full test pipeline"
```

---

## Files Changed

| File | Change |
|------|--------|
| `maestro/flows/*.yaml` | Maestro native UI tests |
| `scripts/apk-webview-test.py` | CDP WebView test suite |
| `backend/tests/api.test.ts` | Extended API tests |
| `scripts/ai-explore.py` | AI exploration script |
| `scripts/run-all-tests.sh` | Test pipeline |
| `frontend/src/components/*.tsx` | Add `data-testid` attributes for Maestro |

## Tests / Validation

- `maestro test` → License flow passes
- `python scripts/apk-webview-test.py` → WebView tests pass
- `cd backend && npm run test` → API tests pass
- `python scripts/ai-explore.py` → AI finds bugs or confirms stability

## Risks / Tradeoffs

| Risiko | Mitigation |
|--------|-----------|
| **testID fehlt in Capacitor** | Manuell `data-testid` in React-Komponenten ergänzen — einmaliger Aufwand |
| **AI-Exploration unzuverlässig** | Als ergänzendes Tool, nicht als Ersatz für deterministische Tests |
| **Maestro Setup auf Windows** | Dokumentation folgen, evtl. WSL2 nötig |
| **LLM-Kosten für browser-use** | Nur bei Major-Releases nutzen, nicht bei jedem Commit |

## Open Questions

- Sollen die `data-testid` Attributes Teil des Produktiv-Codes sein? (Best Practice: ja, für Accessibility)
- Maestro Cloud (managed devices) vs. lokales Handy? (Start: lokal, später Cloud für CI)
- Soll der AI-Explorer auch die Backend-API direkt testen (nicht nur UI)?

---

**Empfohlene Reihenfolge für Implementation:**
1. Task 2 (CDP WebView Tests) — baut auf bestehendem cdp-debug.py auf
2. Task 1 (Maestro) — für native UI Tests
3. Task 3 (API Tests) — Backend-Härtung
4. Task 4 (AI Exploration) — autonome Bug-Suche
5. Task 5 (Pipeline) — Integration
