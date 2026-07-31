# OTA Per-Store Versioning + Rollback Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Extend `/api/app-version` to serve different OTA bundles per store, add rollback endpoint, add `minNativeVersion` guard so a bundle never loads on an incompatible APK.

**Architecture:** The existing `/api/app-version` endpoint reads `manifest.json` from `ota-bundles/`. Extend the manifest to support per-store version overrides and version history. App sends its `storeId` (from license context) when checking for updates. Backend resolves the right bundle for that store.

**Tech Stack:** Express 4, TypeScript, Capacitor + @capgo/capacitor-updater

---

## Current State

- `backend/src/routes/appVersionRoutes.ts` — GET /api/app-version returns `{success, version, bundle, bundlesPath}`
- `backend/ota-bundles/manifest.json` — `{current: "builtin", bundles: [{version, checksum, url, size}]}`
- `frontend/src/services/ota.ts` — `checkForOTAUpdate()` fetches `/api/app-version` (no storeId)
- App license context has `storeId` in `localStorage.pos_license_info`

---

## Manifest Format (New)

```json
{
  "current": "v20260731-2118",
  "bundles": [
    {
      "version": "v20260731-2118",
      "checksum": "abc123...",
      "url": "/api/app-version/download/v20260731-2118",
      "size": 702000,
      "minNativeVersion": "1.0"
    }
  ],
  "history": [
    { "version": "v20260731-2118", "deployedAt": "2026-07-31T21:18:00Z" }
  ],
  "storeOverrides": {
    "2": "v20260731-2055",
    "5": "v20260731-2118"
  }
}
```

- `current` = default version for stores without override
- `storeOverrides` = per-store pinned version (staged rollout)
- `history` = last 10 deployments for rollback
- `minNativeVersion` = semver guard; app skips update if APK version < minNativeVersion

---

## Task 1: Add storeId to OTA check in frontend

**Objective:** App sends its storeId when checking for updates so backend can serve per-store bundle.

**Files:**
- Modify: `frontend/src/services/ota.ts:45-55`

**Step 1: Read storeId from license info**

```typescript
function getStoreId(): string | null {
  try {
    const info = localStorage.getItem("pos_license_info");
    if (!info) return null;
    const parsed = JSON.parse(info);
    return parsed.storeId ? String(parsed.storeId) : null;
  } catch {
    return null;
  }
}
```

**Step 2: Include storeId in OTA fetch**

```typescript
export async function checkForOTAUpdate(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const storeId = getStoreId();
    const url = storeId
      ? `${API_BASE}/app-version?storeId=${storeId}`
      : `${API_BASE}/app-version`;

    const res = await fetch(url);
    if (!res.ok) return false;
    // ... rest unchanged
```

**Step 3: Add minNativeVersion guard**

```typescript
// After parsing data.bundle:
const bundle = data.bundle;
if (bundle?.minNativeVersion) {
  // Compare with APK native version (stored in capacitor.config or build)
  const apkVersion = "1.0"; // TODO: read from Capacitor AppInfo if available
  if (compareSemver(apkVersion, bundle.minNativeVersion) < 0) {
    console.log(`[OTA] Skipping ${bundle.version}: requires APK >= ${bundle.minNativeVersion}`);
    return false;
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}
```

**Step 4: Build and verify**

Run: `cd frontend && npm run build:mobile`
Expected: Build succeeds, no TS errors

**Step 5: Commit**

```bash
git add frontend/src/services/ota.ts
git commit -m "feat: OTA per-store versioning — send storeId, respect minNativeVersion"
```

---

## Task 2: Extend manifest type + per-store resolution in backend

**Objective:** `/api/app-version` accepts `?storeId` and returns the right bundle for that store.

**Files:**
- Modify: `backend/src/routes/appVersionRoutes.ts`

**Step 1: Update manifest interface**

```typescript
interface BundleInfo {
  version: string;
  checksum: string;
  url: string;
  size: number;
  minNativeVersion?: string;
}

interface Manifest {
  current: string;
  bundles: BundleInfo[];
  history: { version: string; deployedAt: string }[];
  storeOverrides: Record<string, string>;
}

function readVersionManifest(): Manifest {
  const manifestPath = path.join(BUNDLES_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { current: "builtin", bundles: [], history: [], storeOverrides: {} };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return {
      current: raw.current || "builtin",
      bundles: raw.bundles || [],
      history: raw.history || [],
      storeOverrides: raw.storeOverrides || {},
    };
  } catch {
    return { current: "builtin", bundles: [], history: [], storeOverrides: {} };
  }
}
```

**Step 2: Add storeId query param handling**

```typescript
router.get("/", (req, res) => {
  const manifest = readVersionManifest();
  const storeId = req.query.storeId as string | undefined;

  // Resolve version: store override > current
  let version = manifest.current;
  if (storeId && manifest.storeOverrides[storeId]) {
    version = manifest.storeOverrides[storeId];
  }

  const bundle = manifest.bundles.find((b) => b.version === version) || null;

  res.json({
    success: true,
    version,
    bundle,
    bundlesPath: "/api/app-version/download",
  });
});
```

**Step 3: Backend test**

Run: `cd backend && npm run test`
Expected: Existing tests pass (no new test needed — endpoint is read-only)

**Step 4: Commit**

```bash
git add backend/src/routes/appVersionRoutes.ts
git commit -m "feat: per-store OTA versioning — storeId query param, storeOverrides manifest"
```

---

## Task 3: Add rollback endpoint

**Objective:** `POST /api/app-version/rollback` reverts `current` to the previous version in history.

**Files:**
- Modify: `backend/src/routes/appVersionRoutes.ts`

**Step 1: Add rollback route**

```typescript
// POST /api/app-version/rollback — revert to previous version
// Auth: shared secret header (X-OTA-Key)
router.post("/rollback", (req, res) => {
  const otaKey = process.env.OTA_UPLOAD_KEY;
  if (!otaKey) {
    res.status(503).json({ success: false, error: "OTA_UPLOAD_KEY not configured" });
    return;
  }
  const providedKey = req.headers["x-ota-key"];
  if (providedKey !== otaKey) {
    res.status(403).json({ success: false, error: "Invalid OTA key" });
    return;
  }

  const manifest = readVersionManifest();
  if (manifest.history.length < 2) {
    res.status(400).json({ success: false, error: "No previous version to roll back to" });
    return;
  }

  // Find current in history, go one back
  const currentIdx = manifest.history.findIndex((h) => h.version === manifest.current);
  if (currentIdx < 1) {
    res.status(400).json({ success: false, error: "Cannot determine previous version" });
    return;
  }

  const previous = manifest.history[currentIdx - 1];
  manifest.current = previous.version;

  fs.writeFileSync(
    path.join(BUNDLES_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  res.json({
    success: true,
    rolledBackTo: previous.version,
    from: manifest.history[currentIdx].version,
  });
});
```

**Step 2: Also record deployments in history on upload**

In the existing `/upload` handler, after setting `manifest.current = version`:

```typescript
// Record in history (keep last 10)
manifest.history.push({ version, deployedAt: new Date().toISOString() });
if (manifest.history.length > 10) {
  manifest.history = manifest.history.slice(-10);
}
```

**Step 3: Commit**

```bash
git add backend/src/routes/appVersionRoutes.ts
git commit -m "feat: OTA rollback endpoint + deployment history tracking"
```

---

## Task 4: Set per-store version (staged rollout helper)

**Objective:** `POST /api/app-version/set-store` pins a store to a specific bundle version.

**Files:**
- Modify: `backend/src/routes/appVersionRoutes.ts`

**Step 1: Add set-store route**

```typescript
// POST /api/app-version/set-store — pin a store to a version (staged rollout)
// Body: { storeId: string, version: string }
// Auth: X-OTA-Key
router.post("/set-store", (req, res) => {
  const otaKey = process.env.OTA_UPLOAD_KEY;
  if (!otaKey) {
    res.status(503).json({ success: false, error: "OTA_UPLOAD_KEY not configured" });
    return;
  }
  const providedKey = req.headers["x-ota-key"];
  if (providedKey !== otaKey) {
    res.status(403).json({ success: false, error: "Invalid OTA key" });
    return;
  }

  const { storeId, version } = req.body as { storeId?: string; version?: string };
  if (!storeId || !version) {
    res.status(400).json({ success: false, error: "storeId and version required" });
    return;
  }

  const manifest = readVersionManifest();
  if (!manifest.bundles.find((b) => b.version === version)) {
    res.status(404).json({ success: false, error: `Version ${version} not found` });
    return;
  }

  manifest.storeOverrides[storeId] = version;
  fs.writeFileSync(
    path.join(BUNDLES_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  res.json({ success: true, storeId, version });
});
```

**Step 2: Also support removing override (roll back to default)**

```typescript
// DELETE /api/app-version/set-store/:storeId — remove store override
router.delete("/set-store/:storeId", (req, res) => {
  // ... same auth check ...
  const { storeId } = req.params;
  const manifest = readVersionManifest();
  delete manifest.storeOverrides[storeId];
  fs.writeFileSync(
    path.join(BUNDLES_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  res.json({ success: true, storeId, version: manifest.current });
});
```

**Step 3: Commit**

```bash
git add backend/src/routes/appVersionRoutes.ts
git commit -m "feat: staged rollout — set/remove per-store OTA version override"
```

---

## Task 5: Update deploy script for staged rollout

**Objective:** `deploy-ota.sh` supports `--store` flag to deploy to specific stores first.

**Files:**
- Modify: `scripts/deploy-ota.sh`

**Step 1: Add store flag**

```bash
# Usage: bash scripts/deploy-ota.sh [version] [--store=ID]
STORE_ID=""
if [[ "$*" == *"--store="* ]]; then
  STORE_ID=$(echo "$*" | grep -oP -- '--store=\K\S+')
fi
```

**Step 2: After upload, optionally set store override**

```bash
if [ -n "$STORE_ID" ]; then
  echo "→ Pinning store $STORE_ID to $VERSION..."
  curl -s -X POST \
    -H "X-OTA-Key: $OTA_UPLOAD_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"storeId\":\"$STORE_ID\",\"version\":\"$VERSION\"}" \
    "$VPS_URL/api/app-version/set-store"
  echo ""
fi
```

**Step 3: Commit**

```bash
git add scripts/deploy-ota.sh
git commit -m "feat: deploy-ota.sh supports --store flag for staged rollout"
```

---

## Task 6: Build + deploy + verify on device

**Step 1: Build frontend**

Run: `cd frontend && npm run build:mobile`
Expected: Build succeeds

**Step 2: Build APK**

Run: `cd frontend/android && ./gradlew.bat assembleDebug`
Expected: BUILD SUCCESSFUL

**Step 3: Install on device**

Run: `adb install -r "C:\Users\pasca\kassensystem\frontend\android\app\build\outputs\apk\debug\app-debug.apk"`
Expected: Success

**Step 4: Verify OTA check includes storeId**

```bash
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
# CDP: evaluate fetch with storeId
```

Expected: Network tab shows `/api/app-version?storeId=2`

**Step 5: Test rollback**

```bash
curl -X POST -H "X-OTA-Key: <key>" http://37.114.41.246:5000/api/app-version/rollback
```

Expected: `{"success":true,"rolledBackTo":"..."}`

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: OTA per-store versioning + rollback + staged rollout"
git push origin master
```

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/services/ota.ts` | getStoreId(), storeId in fetch, minNativeVersion guard |
| `backend/src/routes/appVersionRoutes.ts` | Manifest type, storeId resolution, rollback, set-store |
| `scripts/deploy-ota.sh` | --store flag for staged rollout |

## Risks

- **storeId not in localStorage** — first launch before license activation. Fallback: no storeId → gets `current` version. Safe.
- **minNativeVersion mismatch** — if APK version is wrong in code, updates silently skip. Mitigate: log skip reason clearly.
- **Rollback removes history entry** — if you rollback twice quickly, history might not have the entry. Keep last 10 in history, trim only on upload.

## Open Questions

- Do we want analytics gating per plan (trial/pro) via different bundles? That's a separate feature — this plan only does per-store versioning.
- Should the OTA update banner show version number? Nice-to-have, not critical.
