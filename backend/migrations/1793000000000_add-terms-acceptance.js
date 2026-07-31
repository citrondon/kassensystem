/**
 * Terms acceptance audit trail.
 * Stores which CGU version the licensee accepted + timestamp.
 */
export const up = (pgm) => {
  pgm.addColumn("subscriptions", {
    terms_accepted_version: { type: "varchar(20)" },
    terms_accepted_at: { type: "timestamp with time zone" },
  }, { ifNotExists: true });
};

export const down = (pgm) => {
  pgm.dropColumn("subscriptions", "terms_accepted_at", { ifExists: true });
  pgm.dropColumn("subscriptions", "terms_accepted_version", { ifExists: true });
};
