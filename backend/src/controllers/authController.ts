import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../utils/pool.js";
import { verifyLicenseToken } from "./licenseController.js";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: "manager" | "cashier" | "developer";
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: "manager" | "cashier" | "developer";
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET Umgebungsvariable muss gesetzt sein.");
}

// Platzhalter-Schutz: Beispiel-Secrets oder zu kurze Secrets ablehnen.
// Produktion: harter Abbruch beim Start. Dev/Test: nur Warnung (nicht blockieren).
const INSECURE_JWT_PLACEHOLDERS = [
  "your-super-secret-jwt-key-change-in-production",
  "change-me-long-random-string",
];
const isInsecureJwtSecret =
  INSECURE_JWT_PLACEHOLDERS.includes(JWT_SECRET) || JWT_SECRET.length < 32;
if (isInsecureJwtSecret) {
  const message =
    "JWT_SECRET ist unsicher (Platzhalter oder < 32 Zeichen). Bitte starkes Secret setzen: openssl rand -hex 32";
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(`[WARN] ${message}`);
}
// Token-Laufzeit per Env konfigurierbar (Default 8h, z.B. "8h", "24h", "7d")
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"];

// storeId für den Setup-Flow kommt aus dem signierten Lizenz-Token
// (nicht aus client-kontrollierten Headern wie X-Store-Id).
function extractLicenseStoreId(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return verifyLicenseToken(authHeader.slice(7)).storeId ?? null;
  } catch {
    return null;
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: "Benutzername und Passwort erforderlich." });
    return;
  }

  try {
    const result = await pool.query<UserRow>(
      `SELECT id, username, password_hash, role FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: "Ungueltige Anmeldedaten." });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ success: false, error: "Ungueltige Anmeldedaten." });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, error: "Anmeldung fehlgeschlagen." });
  }
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Nicht authentifiziert." });
    return;
  }

  try {
    const payload = verifyToken(authHeader.slice(7));
    res.json({ success: true, user: payload });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: "Token abgelaufen.", errorCode: "token_expired" });
      return;
    }
    res.status(401).json({ success: false, error: "Token ungueltig.", errorCode: "token_invalid" });
  }
};

// ── Setup: first owner account ──

export const getSetupStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Per-store setup: check if a manager exists for this store.
    // storeId kommt aus dem signierten Lizenz-Token (Query-Param nur als Fallback).
    const licenseStoreId = extractLicenseStoreId(req);
    const queryStoreId = req.query.storeId as string | undefined;
    const storeId = licenseStoreId ?? (queryStoreId ? Number(queryStoreId) : null);

    if (storeId) {
      // Per-store check: manager with this store_id
      const result = await pool.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'manager' AND store_id = $1",
        [storeId]
      );
      const managerCount = Number(result.rows[0].count);
      const needsSetup = managerCount === 0;
      res.json({ success: true, needsSetup, userCount: managerCount });
    } else {
      // Fallback: global check (single-store deployments)
      const result = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'manager'");
      const managerCount = Number(result.rows[0].count);
      const needsSetup = managerCount === 0;
      res.json({ success: true, needsSetup, userCount: managerCount });
    }
  } catch (error) {
    console.error("Setup status error:", error);
    res.status(500).json({ success: false, error: "Status abrufen fehlgeschlagen." });
  }
};

export const setupOwner = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: "Benutzername und Passwort erforderlich." });
    return;
  }

  if (password.length < 10) {
    res.status(400).json({ success: false, error: "Manager-Passwort muss mindestens 10 Zeichen lang sein." });
    return;
  }

  try {
    // Allow setup if no manager exists for this store.
    // storeId kommt aus dem signierten Lizenz-Token — der X-Store-Id-Header wird ignoriert.
    const storeId = extractLicenseStoreId(req);

    if (storeId) {
      const countResult = await pool.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'manager' AND store_id = $1",
        [storeId]
      );
      if (Number(countResult.rows[0].count) > 0) {
        res.status(403).json({ success: false, error: "Setup bereits abgeschlossen." });
        return;
      }
    } else {
      const countResult = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'manager'");
      if (Number(countResult.rows[0].count) > 0) {
        res.status(403).json({ success: false, error: "Setup bereits abgeschlossen." });
        return;
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (username, password_hash, role, store_id) VALUES ($1, $2, 'manager', $3)
       RETURNING id, username, role`,
      [username, hash, storeId]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ success: false, error: "Benutzername bereits vergeben." });
      return;
    }
    console.error("Setup owner error:", error);
    res.status(500).json({ success: false, error: "Setup fehlgeschlagen." });
  }
};

// ── User Management (manager/developer only) ──

export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, username, role, created_at FROM users ORDER BY id ASC`
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ success: false, error: "Benutzer abrufen fehlgeschlagen." });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: "Benutzername und Passwort erforderlich." });
    return;
  }

  const userRole = role === "manager" ? "manager" : "cashier";

  // Manager: starkes Passwort (>= 10); Kassierer: PIN-lang (>= 4)
  const minPasswordLength = userRole === "manager" ? 10 : 4;
  if (password.length < minPasswordLength) {
    res.status(400).json({
      success: false,
      error: userRole === "manager"
        ? "Manager-Passwort muss mindestens 10 Zeichen lang sein."
        : "Passwort muss mindestens 4 Zeichen lang sein.",
    });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
       RETURNING id, username, role`,
      [username, hash, userRole]
    );

    res.json({
      success: true,
      user: { id: result.rows[0].id, username: result.rows[0].username, role: result.rows[0].role },
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ success: false, error: "Benutzername bereits vergeben." });
      return;
    }
    console.error("Create user error:", error);
    res.status(500).json({ success: false, error: "Benutzer anlegen fehlgeschlagen." });
  }
};

/**
 * POST /api/auth/factory-reset
 * Developer-only. Deletes all manager accounts (optionally cashiers too via
 * body flag includeCashiers). Developer accounts are never touched.
 * Re-opens the setup flow (needsSetup = true) without migration/redeploy.
 */
export const factoryReset = async (req: Request, res: Response): Promise<void> => {
  const includeCashiers = req.body?.includeCashiers === true;

  try {
    const roles = includeCashiers ? ["manager", "cashier"] : ["manager"];
    const result = await pool.query(
      `DELETE FROM users WHERE role = ANY($1::text[]) RETURNING id`,
      [roles]
    );

    res.json({
      success: true,
      deletedCount: result.rows.length,
      includeCashiers,
      needsSetup: true,
    });
  } catch (error) {
    console.error("Factory reset error:", error);
    res.status(500).json({ success: false, error: "Factory-Reset fehlgeschlagen." });
  }
};

/**
 * DELETE /api/users/:id
 * Deletes a user. Self-deletion allowed (useful for factory reset).
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const userId = Number(req.params.id);

  try {
    const result = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Benutzer nicht gefunden." });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, error: "Loeschen fehlgeschlagen." });
  }
};
