/**
 * Adds a free-text note to debts, matching the mobile SQLite schema where
 * debts.note already exists. This closes the mobile<->backend divergence so
 * notes survive sync and stay visible server-side.
 */
export const up = (pgm) => {
  pgm.addColumn(
    "debts",
    { note: { type: "text", notNull: false } },
    { ifNotExists: true }
  );
};

export const down = (pgm) => {
  pgm.dropColumn("debts", "note", { ifExists: true });
};
