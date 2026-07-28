import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../utils/pool.js";

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
const JWT_EXPIRES_IN = "8h";

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
  } catch {
    res.status(401).json({ success: false, error: "Token ungueltig." });
  }
};

// ── Setup: first owner account ──

/**
 * GET /api/auth/setup-status
 * Returns whether any user exists (if not, setup is needed).
 */
export const getSetupStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query("SELECT COUNT(*) AS count FROM users");
    const userCount = Number(result.rows[0].count);
    res.json({ success: true, needsSetup: userCount === 0, userCount });
  } catch (error) {
    console.error("Setup status error:", error);
    res.status(500).json({ success: false, error: "Status abrufen fehlgeschlagen." });
  }
};

/**
 * POST /api/auth/setup
 * Body: { username, password, storeName? }
 * Creates the first owner (manager) account. Only works if no users exist.
 */
export const setupOwner = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: "Benutzername und Passwort erforderlich." });
    return;
  }

  if (password.length < 4) {
    res.status(400).json({ success: false, error: "Passwort muss mindestens 4 Zeichen lang sein." });
    return;
  }

  try {
    // Check if users already exist
    const countResult = await pool.query("SELECT COUNT(*) AS count FROM users");
    if (Number(countResult.rows[0].count) > 0) {
      res.status(403).json({ success: false, error: "Setup bereits abgeschlossen." });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'manager') RETURNING id, username, role`,
      [username, hash]
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
  } catch (error) {
    console.error("Setup owner error:", error);
    res.status(500).json({ success: false, error: "Setup fehlgeschlagen." });
  }
};

// ── User Management (manager/developer only) ──

/**
 * GET /api/users
 * Lists all users (excluding password hashes).
 */
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

/**
 * POST /api/users
 * Body: { username, password, role?: 'cashier'|'manager' }
 * Creates a new user (cashier by default).
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: "Benutzername und Passwort erforderlich." });
    return;
  }

  if (password.length < 4) {
    res.status(400).json({ success: false, error: "Passwort muss mindestens 4 Zeichen lang sein." });
    return;
  }

  const userRole = role === "manager" ? "manager" : "cashier";

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
 * DELETE /api/users/:id
 * Deletes a user. Cannot delete yourself.
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const userId = Number(req.params.id);

  if (req.user?.userId === userId) {
    res.status(400).json({ success: false, error: "Sie koennen sich nicht selbst loeschen." });
    return;
  }

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
