import { Router } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

// Where OTA bundles live on the VPS
const BUNDLES_DIR = process.env.OTA_BUNDLES_DIR
  || path.join(process.cwd(), "ota-bundles");

fs.mkdirSync(BUNDLES_DIR, { recursive: true });

interface BundleInfo {
  version: string;
  checksum: string;
  url: string;
  size: number;
  minNativeVersion?: string;
}

interface HistoryEntry {
  version: string;
  deployedAt: string;
}

interface Manifest {
  current: string;
  bundles: BundleInfo[];
  history: HistoryEntry[];
  storeOverrides: Record<string, string>;
}

function readVersionManifest(): Manifest {
  const manifestPath = path.join(BUNDLES_DIR, "manifest.json");
  const empty: Manifest = { current: "builtin", bundles: [], history: [], storeOverrides: {} };
  if (!fs.existsSync(manifestPath)) {
    return empty;
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
    return empty;
  }
}

function writeManifest(manifest: Manifest): void {
  fs.writeFileSync(
    path.join(BUNDLES_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
}

function checkOtaKey(req: import("express").Request, res: import("express").Response): boolean {
  const otaKey = process.env.OTA_UPLOAD_KEY;
  if (!otaKey) {
    res.status(503).json({ success: false, error: "OTA_UPLOAD_KEY not configured" });
    return false;
  }
  const providedKey = req.headers["x-ota-key"];
  if (providedKey !== otaKey) {
    res.status(403).json({ success: false, error: "Invalid OTA key" });
    return false;
  }
  return true;
}

// GET /api/app-version — app checks this on startup
// Optional: ?storeId=N for per-store version override
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

// GET /api/app-version/download/:version — serve a specific bundle zip
router.get("/download/:version", (req, res) => {
  const { version } = req.params;
  // Sanitize: only alphanumeric, dots, dashes
  if (!/^[\w.-]+$/.test(version)) {
    res.status(400).json({ success: false, error: "Invalid version" });
    return;
  }
  const zipPath = path.join(BUNDLES_DIR, `${version}.zip`);
  if (!fs.existsSync(zipPath)) {
    res.status(404).json({ success: false, error: `Bundle ${version} not found` });
    return;
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${version}.zip"`
  );
  fs.createReadStream(zipPath).pipe(res);
});

// POST /api/app-version/upload — deploy script pushes new bundle here
// Auth: shared secret header (X-OTA-Key)
router.post("/upload", (req, res) => {
  if (!checkOtaKey(req, res)) return;

  const { version, checksum } = req.query as { version?: string; checksum?: string };
  if (!version || !/^[\w.-]+$/.test(version)) {
    res.status(400).json({ success: false, error: "Invalid version format" });
    return;
  }

  // Expect raw zip body
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const zipBuffer = Buffer.concat(chunks);
    if (zipBuffer.length === 0) {
      res.status(400).json({ success: false, error: "Empty bundle" });
      return;
    }

    // Verify checksum if provided
    const actualChecksum = crypto.createHash("sha256").update(zipBuffer).digest("hex");
    if (checksum && actualChecksum !== checksum) {
      res.status(400).json({
        success: false,
        error: "Checksum mismatch",
        expected: checksum,
        actual: actualChecksum,
      });
      return;
    }

    // Write zip
    const zipPath = path.join(BUNDLES_DIR, `${version}.zip`);
    fs.writeFileSync(zipPath, zipBuffer);

    // Update manifest
    const manifest = readVersionManifest();
    const existing = manifest.bundles.findIndex((b) => b.version === version);
    const bundleInfo: BundleInfo = {
      version,
      checksum: actualChecksum,
      url: `/api/app-version/download/${version}`,
      size: zipBuffer.length,
    };
    if (existing >= 0) {
      manifest.bundles[existing] = bundleInfo;
    } else {
      manifest.bundles.push(bundleInfo);
    }
    manifest.current = version;

    // Record in history (keep last 10)
    manifest.history.push({ version, deployedAt: new Date().toISOString() });
    if (manifest.history.length > 10) {
      manifest.history = manifest.history.slice(-10);
    }

    writeManifest(manifest);

    res.json({
      success: true,
      version,
      size: zipBuffer.length,
      checksum: actualChecksum,
    });
  });
});

// POST /api/app-version/rollback — revert to previous version
// Auth: X-OTA-Key
router.post("/rollback", (req, res) => {
  if (!checkOtaKey(req, res)) return;

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
  const fromVersion = manifest.history[currentIdx].version;
  manifest.current = previous.version;

  writeManifest(manifest);

  res.json({
    success: true,
    rolledBackTo: previous.version,
    from: fromVersion,
  });
});

// POST /api/app-version/set-store — pin a store to a version (staged rollout)
// Body: { storeId: string, version: string }
// Auth: X-OTA-Key
router.post("/set-store", (req, res) => {
  if (!checkOtaKey(req, res)) return;

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
  writeManifest(manifest);

  res.json({ success: true, storeId, version });
});

// DELETE /api/app-version/set-store/:storeId — remove store override, back to default
// Auth: X-OTA-Key
router.delete("/set-store/:storeId", (req, res) => {
  if (!checkOtaKey(req, res)) return;

  const { storeId } = req.params;
  const manifest = readVersionManifest();
  delete manifest.storeOverrides[storeId];
  writeManifest(manifest);

  res.json({ success: true, storeId, version: manifest.current });
});

export default router;
