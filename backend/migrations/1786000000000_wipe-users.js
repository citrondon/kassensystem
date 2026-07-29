/**
 * Wipe users + seed fresh demo license key + developer account.
 * - Wipes all users (triggers setup flow for store owner)
 * - Seeds a developer account (can see Analytics tab)
 * - Seeds a 1-year Pro license key for the store owner
 *
 * Setup flow logic: needsSetup = true when no manager/developer exists.
 * The developer account is always present (separate from store owner).
 */
export const up = (pgm) => {
  // Wipe all users
  pgm.sql(`DELETE FROM users`);

  // Seed developer account (always present, can access Analytics)
  // Password: dev12345
  pgm.sql(`
    INSERT INTO users (username, password_hash, role)
    VALUES ('developer', '$2b$10$pornHHlI/kZaZPR7/K/PKuwRp5rv9fSn1NVwgStcf4KTPGW89h4S2', 'developer')
  `);

  // Create fresh 1-year Pro license key for store owner
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
  pgm.sql(`DELETE FROM users WHERE username = 'developer'`);
  pgm.sql(`DELETE FROM subscriptions WHERE license_key = 'MC-PRO-2026-DEMO-KEY'`);
};
