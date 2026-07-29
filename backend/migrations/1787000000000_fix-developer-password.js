/**
 * Fix developer account password hash (CommonJS).
 * - Deletes any existing developer user
 * - Re-creates developer with a fresh bcrypt hash
 */
const bcrypt = require("bcrypt");

exports.up = async (pgm) => {
  pgm.sql(`DELETE FROM users WHERE username = 'developer'`);
  const devHash = await bcrypt.hash("dev12345", 10);
  pgm.sql(`
    INSERT INTO users (username, password_hash, role)
    VALUES ('developer', '${devHash}', 'developer')
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM users WHERE username = 'developer'`);
};
