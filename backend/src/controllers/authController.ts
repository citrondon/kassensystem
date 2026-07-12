import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../utils/pool.js";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: "manager" | "cashier";
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: "manager" | "cashier";
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
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
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

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    res.json({ success: true, user: payload });
  } catch {
    res.status(401).json({ success: false, error: "Token ungueltig." });
  }
};
