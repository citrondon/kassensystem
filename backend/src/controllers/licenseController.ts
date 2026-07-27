import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../utils/pool.js";

const LICENSE_JWT_SECRET = process.env.LICENSE_JWT_SECRET || process.env.JWT_SECRET || "license-fallback-secret";
const TOKEN_TTL_DAYS = 7; // license token valid 7 days → 7 days offline grace

export interface LicenseTokenPayload {
  licenseKey: string;
  storeId: number;
  plan: string;
  status: string;
  expiresAt: string; // ISO date — the subscription expiry
  iat: number;
  exp: number;
}

/**
 * POST /api/license/keys  (developer-only)
 * Body: { plan?: "trial"|"basic"|"pro", durationDays?: number }
 * Creates a new license key + subscription row.
 */
export const createLicenseKey = async (req: Request, res: Response): Promise<void> => {
  const plan = (req.body.plan as string) || "trial";
  const durationDays = Number(req.body.durationDays) || 365;

  if (!["trial", "basic", "pro"].includes(plan)) {
    res.status(400).json({ success: false, error: "plan muss trial, basic oder pro sein." });
    return;
  }

  const licenseKey = generateLicenseKey();
  const expiresAt = new Date(Date.now() + durationDays * 86400000);

  try {
    await pool.query(
      `INSERT INTO subscriptions (license_key, plan, status, expires_at) VALUES ($1, $2, 'active', $3)`,
      [licenseKey, plan, expiresAt.toISOString()]
    );

    res.json({
      success: true,
      licenseKey,
      plan,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Create license key error:", error);
    res.status(500).json({ success: false, error: "Lizenzschlüssel konnte nicht erstellt werden." });
  }
};

/**
 * POST /api/license/activate
 * Body: { licenseKey: string, storeName: string, machineId: string }
 * Registers a store, links the license key, returns a license token.
 */
export const activateLicense = async (req: Request, res: Response): Promise<void> => {
  const { licenseKey, storeName, machineId } = req.body;

  if (!licenseKey || !storeName || !machineId) {
    res.status(400).json({ success: false, error: "licenseKey, storeName und machineId erforderlich." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check license exists and is valid
    const subResult = await client.query(
      `SELECT id, plan, status, expires_at FROM subscriptions WHERE license_key = $1 FOR UPDATE`,
      [licenseKey]
    );

    if (subResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Lizenzschlüssel nicht gefunden." });
      await client.query("ROLLBACK");
      return;
    }

    const sub = subResult.rows[0];

    if (sub.status === "cancelled" || sub.status === "suspended") {
      res.status(403).json({ success: false, error: `Lizenz ist ${sub.status}.` });
      await client.query("ROLLBACK");
      return;
    }

    // Check if a store already has this license_key assigned
    // Clear it first to avoid UNIQUE constraint violation
    await client.query(
      `UPDATE stores SET license_key = NULL WHERE license_key = $1`,
      [licenseKey]
    );

    // Upsert store by machine_id
    const storeResult = await client.query(
      `INSERT INTO stores (name, machine_id, license_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (machine_id) DO UPDATE SET name = $1, license_key = $3
       RETURNING id`,
      [storeName, machineId, licenseKey]
    );
    const storeId = storeResult.rows[0].id;

    // Link store to subscription
    await client.query(
      `UPDATE subscriptions SET store_id = $1 WHERE license_key = $2`,
      [storeId, licenseKey]
    );

    await client.query("COMMIT");

    const token = signLicenseToken({
      licenseKey,
      storeId,
      plan: sub.plan,
      status: sub.status,
      expiresAt: sub.expires_at,
    });

    res.json({
      success: true,
      token,
      license: {
        plan: sub.plan,
        status: sub.status,
        expiresAt: sub.expires_at,
        storeId,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("License activation error:", error);
    res.status(500).json({ success: false, error: "Aktivierung fehlgeschlagen." });
  } finally {
    client.release();
  }
};

/**
 * POST /api/license/verify
 * Body: { licenseKey: string, machineId: string }
 * Verifies a license key + machine, returns fresh token.
 * Called on startup when cached token is expired.
 */
export const verifyLicense = async (req: Request, res: Response): Promise<void> => {
  const { licenseKey, machineId } = req.body;

  if (!licenseKey || !machineId) {
    res.status(400).json({ success: false, error: "licenseKey und machineId erforderlich." });
    return;
  }

  try {
    const subResult = await pool.query(
      `SELECT s.id, s.plan, s.status, s.expires_at, st.id AS store_id
       FROM subscriptions s
       LEFT JOIN stores st ON st.license_key = s.license_key
       WHERE s.license_key = $1 AND st.machine_id = $2`,
      [licenseKey, machineId]
    );

    if (subResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Lizenz nicht gefunden oder Maschine nicht registriert." });
      return;
    }

    const sub = subResult.rows[0];

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    if (expiresAt < now) {
      // Auto-update status
      await pool.query(`UPDATE subscriptions SET status = 'expired' WHERE id = $1`, [sub.id]);
      res.status(403).json({
        success: false,
        error: "Lizenz abgelaufen.",
        expired: true,
        expiresAt: sub.expires_at,
      });
      return;
    }

    const token = signLicenseToken({
      licenseKey,
      storeId: sub.store_id,
      plan: sub.plan,
      status: sub.status,
      expiresAt: sub.expires_at,
    });

    res.json({
      success: true,
      token,
      license: {
        plan: sub.plan,
        status: sub.status,
        expiresAt: sub.expires_at,
        storeId: sub.store_id,
      },
    });
  } catch (error) {
    console.error("License verify error:", error);
    res.status(500).json({ success: false, error: "Verifizierung fehlgeschlagen." });
  }
};

/**
 * GET /api/license/status
 * Requires: Bearer license token
 * Returns current license status from the token (no DB call needed).
 */
export const getLicenseStatus = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Kein Lizenz-Token." });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, LICENSE_JWT_SECRET) as LicenseTokenPayload;

    const now = new Date();
    const subExpiry = new Date(payload.expiresAt);
    const tokenExpiry = new Date(payload.exp * 1000);

    res.json({
      success: true,
      license: {
        plan: payload.plan,
        status: subExpiry < now ? "expired" : payload.status,
        expiresAt: payload.expiresAt,
        tokenExpiresAt: new Date(tokenExpiry).toISOString(),
        storeId: payload.storeId,
      },
    });
  } catch {
    res.status(401).json({ success: false, error: "Lizenz-Token ungültig oder abgelaufen." });
  }
};

// ── Helpers ──

function signLicenseToken(data: {
  licenseKey: string;
  storeId: number;
  plan: string;
  status: string;
  expiresAt: string;
}): string {
  return jwt.sign(
    {
      licenseKey: data.licenseKey,
      storeId: data.storeId,
      plan: data.plan,
      status: data.status,
      expiresAt: data.expiresAt,
    },
    LICENSE_JWT_SECRET,
    { expiresIn: `${TOKEN_TTL_DAYS}d` }
  );
}

export function verifyLicenseToken(token: string): LicenseTokenPayload {
  return jwt.verify(token, LICENSE_JWT_SECRET) as LicenseTokenPayload;
}

/**
 * Generate a random license key (for developer use).
 */
export function generateLicenseKey(): string {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return parts.join("-");
}
