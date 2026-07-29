/**
 * Fix developer account password hash (ESM).
 */
import bcrypt from "bcrypt";

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
