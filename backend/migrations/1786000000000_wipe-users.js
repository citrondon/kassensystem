/**
 * Wipe users + seed fresh demo license key + developer account.
 * ESM only — package.json has "type": "module".
 */
import bcrypt from "bcrypt";

export const up = async (pgm) => {
  // Wipe all users
  pgm.sql(`DELETE FROM users`);

  // Seed developer account
  const devHash = await bcrypt.hash("dev12345", 10);
  pgm.sql(`
    INSERT INTO users (username, password_hash, role)
    VALUES ('developer', '${devHash}', 'developer')
  `);

  // Seed fresh Pro license key
  pgm.sql(`
    INSERT INTO subscriptions (license_key, plan, status, expires_at)
    VALUES ('MC-PRO-2026-DEMO-KEY', 'pro', 'active', NOW() + INTERVAL '365 days')
    ON CONFLICT (license_key) DO UPDATE SET
      plan = 'pro',
      status = 'active',
      expires_at = NOW() + INTERVAL '365 days'
  `);
};

export const down = (pgm) => {
  pgm.sql(`DELETE FROM users`);
  pgm.sql(`DELETE FROM subscriptions WHERE license_key = 'MC-PRO-2026-DEMO-KEY'`);
};
