/**
 * Wipe all users — enables fresh setup flow.
 * This is a one-time migration that clears the users table.
 */
export const up = (pgm) => {
  pgm.sql(`DELETE FROM users`);
};

export const down = (pgm) => {
  // no-op
};
