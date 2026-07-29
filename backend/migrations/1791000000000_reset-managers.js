/**
 * Wipe manager accounts so the owner setup flow can run again.
 * Keeps cashier accounts and the developer account untouched.
 */
export const up = async (pgm) => {
  pgm.sql(`DELETE FROM users WHERE role = 'manager'`);
};

export const down = (pgm) => {
  // Not reversible; managers would have to be recreated through setup.
};
