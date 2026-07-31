import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../utils/pool.js";

const LICENSE_JWT_SECRET = process.env.LICENSE_JWT_SECRET || process.env.JWT_SECRET || "license-fallback-secret";
const TOKEN_TTL_DAYS = 7;

export interface LicenseTokenPayload {
  licenseKey: string;
  storeId: number;
  plan: string;
  status: string;
  expiresAt: string;
  iat: number;
  exp: number;
}

// ── License Key Management (developer-only) ──

/**
 * GET /api/license/keys
 * Lists all license keys with store info.
 */
export const listLicenseKeys = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT
         s.id, s.license_key, s.plan, s.status, s.expires_at, s.started_at, s.created_at,
         st.id   AS store_id,
         st.name AS store_name,
         st.location AS store_location,
         st.machine_id
       FROM subscriptions s
       LEFT JOIN stores st ON st.license_key = s.license_key
       ORDER BY s.created_at DESC`
    );

    res.json({ success: true, keys: result.rows });
  } catch (error) {
    console.error("List license keys error:", error);
    res.status(500).json({ success: false, error: "Abruf fehlgeschlagen." });
  }
};

/**
 * POST /api/license/keys
 * Body: { plan?, durationDays? }
 * Creates a new license key.
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

    res.json({ success: true, licenseKey, plan, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("Create license key error:", error);
    res.status(500).json({ success: false, error: "Lizenzschlüssel konnte nicht erstellt werden." });
  }
};

/**
 * PATCH /api/license/keys/:key
 * Body: { action: "extend"|"cancel"|"reactivate", durationDays? }
 */
export const updateLicenseKey = async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;
  const { action, durationDays } = req.body;

  if (!["extend", "cancel", "reactivate"].includes(action)) {
    res.status(400).json({ success: false, error: "action muss extend, cancel oder reactivate sein." });
    return;
  }

  try {
    if (action === "extend") {
      const days = Number(durationDays) || 30;
      const result = await pool.query(
        `UPDATE subscriptions
         SET expires_at = GREATEST(expires_at, NOW()) + INTERVAL '${days} days',
             status = 'active',
             cancelled_at = NULL
         WHERE license_key = $1
         RETURNING license_key, plan, status, expires_at`,
        [key]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: "Lizenz nicht gefunden." });
        return;
      }

      res.json({ success: true, license: result.rows[0] });
    } else if (action === "cancel") {
      const result = await pool.query(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
         WHERE license_key = $1 RETURNING license_key, plan, status, expires_at`,
        [key]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: "Lizenz nicht gefunden." });
        return;
      }

      res.json({ success: true, license: result.rows[0] });
    } else if (action === "reactivate") {
      const days = Number(durationDays) || 30;
      const result = await pool.query(
        `UPDATE subscriptions
         SET status = 'active',
             expires_at = NOW() + INTERVAL '${days} days',
             cancelled_at = NULL
         WHERE license_key = $1
         RETURNING license_key, plan, status, expires_at`,
        [key]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: "Lizenz nicht gefunden." });
        return;
      }

      res.json({ success: true, license: result.rows[0] });
    }
  } catch (error) {
    console.error("Update license key error:", error);
    res.status(500).json({ success: false, error: "Aktualisierung fehlgeschlagen." });
  }
};

// ── License Activation + Verification (public) ──

export const activateLicense = async (req: Request, res: Response): Promise<void> => {
  const { licenseKey, storeName, machineId, termsVersion } = req.body;

  if (!licenseKey || !storeName || !machineId) {
    res.status(400).json({ success: false, error: "licenseKey, storeName und machineId erforderlich." });
    return;
  }

  // CGU zwingend erforderlich — kein termsVersion = keine Aktivierung
  if (!termsVersion || typeof termsVersion !== "string" || termsVersion.length > 20) {
    res.status(400).json({ success: false, error: "CGU-Akzeptanz erforderlich (termsVersion)." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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

    await client.query(`UPDATE stores SET license_key = NULL WHERE license_key = $1`, [licenseKey]);

    const storeResult = await client.query(
      `INSERT INTO stores (name, machine_id, license_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (machine_id) DO UPDATE SET name = $1, license_key = $3
       RETURNING id`,
      [storeName, machineId, licenseKey]
    );
    const storeId = storeResult.rows[0].id;

    await client.query(`UPDATE subscriptions SET store_id = $1, terms_accepted_version = $2, terms_accepted_at = NOW() WHERE license_key = $3`, [storeId, termsVersion, licenseKey]);

    await client.query("COMMIT");

    const token = signLicenseToken({
      licenseKey, storeId, plan: sub.plan, status: sub.status, expiresAt: sub.expires_at,
    });

    res.json({
      success: true, token,
      license: { plan: sub.plan, status: sub.status, expiresAt: sub.expires_at, storeId },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("License activation error:", error);
    res.status(500).json({ success: false, error: "Aktivierung fehlgeschlagen." });
  } finally {
    client.release();
  }
};

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
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);

    if (expiresAt < now) {
      await pool.query(`UPDATE subscriptions SET status = 'expired' WHERE id = $1`, [sub.id]);
      res.status(403).json({ success: false, error: "Lizenz abgelaufen.", expired: true, expiresAt: sub.expires_at });
      return;
    }

    const token = signLicenseToken({
      licenseKey, storeId: sub.store_id, plan: sub.plan, status: sub.status, expiresAt: sub.expires_at,
    });

    res.json({
      success: true, token,
      license: { plan: sub.plan, status: sub.status, expiresAt: sub.expires_at, storeId: sub.store_id },
    });
  } catch (error) {
    console.error("License verify error:", error);
    res.status(500).json({ success: false, error: "Verifizierung fehlgeschlagen." });
  }
};

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
  licenseKey: string; storeId: number; plan: string; status: string; expiresAt: string;
}): string {
  return jwt.sign(
    { licenseKey: data.licenseKey, storeId: data.storeId, plan: data.plan, status: data.status, expiresAt: data.expiresAt },
    LICENSE_JWT_SECRET,
    { expiresIn: `${TOKEN_TTL_DAYS}d` }
  );
}

export function verifyLicenseToken(token: string): LicenseTokenPayload {
  return jwt.verify(token, LICENSE_JWT_SECRET) as LicenseTokenPayload;
}

export function generateLicenseKey(): string {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return parts.join("-");
}
