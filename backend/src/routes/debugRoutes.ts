import { Request, Response, Router } from "express";
import pool from "../utils/pool.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireDeveloper } from "../middleware/developerMiddleware.js";

const router = Router();

// Developer-only: exposes users (hash prefixes), migrations and license keys
router.get("/status", authenticate, requireDeveloper, async (_req: Request, res: Response) => {
  try {
    const usersResult = await pool.query(
      `SELECT id, username, role, substring(password_hash for 20) as hash_prefix FROM users ORDER BY id`
    );
    const migrationResult = await pool.query(
      `SELECT name, run_on FROM pgmigrations ORDER BY run_on DESC LIMIT 10`
    );
    const managerResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'manager'`
    );
    const devResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'developer'`
    );
    const licenseResult = await pool.query(
      `SELECT license_key, plan, status, expires_at FROM subscriptions ORDER BY id`
    );

    res.json({
      success: true,
      users: usersResult.rows,
      migrations: migrationResult.rows,
      setup: {
        needsSetup: Number(managerResult.rows[0].count) === 0,
        managerCount: Number(managerResult.rows[0].count),
        developerCount: Number(devResult.rows[0].count),
      },
      licenses: licenseResult.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
