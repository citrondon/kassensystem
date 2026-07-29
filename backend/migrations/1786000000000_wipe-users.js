/**
 * Wipe all users + seed a fresh license key.
 * Enables the full setup flow experience from scratch.
 */
export const up = (pgm) => {
  // Wipe all users → triggers setup flow on next login
  pgm.sql(`DELETE FROM users`);

  // Create a fresh 1-year Pro license key
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
  pgm.sql(`DELETE FROM subscriptions WHERE license_key = 'MC-PRO-2026-DEMO-KEY'`);
};
