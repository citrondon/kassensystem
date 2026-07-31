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

function readVersionManifest(): { current: string; bundles: BundleInfo[] } {
  const manifestPath = path.join(BUNDLES_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { current: "builtin", bundles: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    return { current: "builtin", bundles: [] };
  }
}

// GET /api/app-version — app checks this on startup
router.get("/", (_req, res) => {
  const manifest = readVersionManifest();
  const current = manifest.bundles.find(
    (b) => b.version === manifest.current
  );
  res.json({
    success: true,
    version: manifest.current,
    bundle: current || null,
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

  const { version, checksum } = req.body as { version?: string; checksum?: string };
  if (!version || !/^[\w.-]+$/.test(version)) {
    res.status(400).json({ success: false, error: "Invalid version format" });
    return;
  }

  // Expect multipart form with zip file
  // For simplicity, also accept raw body with Content-Type: application/zip
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
    fs.writeFileSync(
      path.join(BUNDLES_DIR, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );

    res.json({
      success: true,
      version,
      size: zipBuffer.length,
      checksum: actualChecksum,
    });
  });
});

export default router;
