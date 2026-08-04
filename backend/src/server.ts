import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import licenseRoutes from "./routes/licenseRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import appVersionRoutes from "./routes/appVersionRoutes.js";
import pool from "./utils/pool.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(
  cors({
    // Explizite Origins (kommagetrennt) via CORS_ORIGIN. Capacitor-WebView
    // (capacitor://localhost / https://localhost) und lokale Dev-Ursprünge
    // werden IMMER erlaubt, sonst blockiert die APK den API-Zugriff.
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // no-origin Requests (curl, OTA-Scripte)
      const allowed = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) || [];
      const ok =
        origin.startsWith("capacitor://") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("https://localhost") ||
        allowed.includes(origin);
      callback(null, ok);
    },
  })
);

// Hinter Caddy (VPS) die echte Client-IP fürs Rate-Limiting verwenden
const trustProxy = Number(process.env.TRUST_PROXY || 0);
if (trustProxy > 0) {
  app.set("trust proxy", trustProxy);
}

app.use(
  helmet({
    // CSP bewusst aus: Capacitor-WebView + QR-Scanner benötigen inline/Blob-Quellen
    contentSecurityPolicy: false,
    // APK lädt /uploads-Bilder cross-origin vom API-Server
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// In production: serve built frontend
if (isProduction) {
  // Prefer bundled dist-static (committed), fall back to source frontend/dist
  const frontendDist = fs.existsSync(path.join(__dirname, "..", "dist-static"))
    ? path.join(__dirname, "..", "dist-static")
    : path.join(__dirname, "..", "..", "frontend", "dist");
  app.use(express.static(frontendDist));
  // SPA fallback: non-API routes → index.html
  app.get(/^\/(?!api|health|uploads).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error", error: "Datenbank nicht erreichbar" });
  }
});

app.get("/", (_req, res) => {
  res.json({ message: "Willkommen bei der Logistics & POS API" });
});

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/checkout", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/license", licenseRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/app-version", appVersionRoutes);

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: "Etwas ist schiefgelaufen. Bitte spaeter erneut versuchen.",
    });
  }
);

export async function start(): Promise<void> {
  try {
    await pool.query("SELECT NOW()");
    console.log("Datenbankverbindung erfolgreich");
  } catch (err) {
    console.error("Datenbankverbindung fehlgeschlagen:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server laeuft auf http://localhost:${PORT}`);
  });
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("src/server.ts") ||
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js");

if (isMainModule) {
  start();
}
