/**
 * Wipe all manager accounts again so the owner setup flow is open for the user.
 */
export const up = async (pgm) => {
  pgm.sql(`DELETE FROM users WHERE role = 'manager'`);
};

export const down = (pgm) => {
  // Not reversible.
};
