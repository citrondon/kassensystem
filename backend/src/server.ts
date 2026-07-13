import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import pool from "./utils/pool.js";

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT) || 5000;

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

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
app.use("/api/reports", reportRoutes);

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
  process.argv[1]?.endsWith("server.ts");

if (isMainModule) {
  start();
}
