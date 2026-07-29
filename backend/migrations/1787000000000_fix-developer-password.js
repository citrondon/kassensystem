/**
 * Fix developer account password hash and ensure setup flow still works.
 * - Deletes any existing developer user
 * - Re-creates developer with a fresh bcrypt hash
 * - Setup flow still shows when no manager exists (developer doesn't count)
 */
const bcrypt = require("bcrypt");

export const up = async (pgm) => {
  pgm.sql(`DELETE FROM users WHERE username = 'developer'`);
  const devHash = await bcrypt.hash("dev12345", 10);
  pgm.sql(`
    INSERT INTO users (username, password_hash, role)
    VALUES ('developer', '${devHash}', 'developer')
  `);
};

export const down = (pgm) => {
  pgm.sql(`DELETE FROM users WHERE username = 'developer'`);
};
