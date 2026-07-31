/**
 * Add store_id to users table for per-store setup detection.
 * In multi-store VPS deployments, each store needs its own manager.
 * store_id NULL = legacy/global users (developer, seeded accounts).
 */
export const up = (pgm) => {
  pgm.addColumn("users", {
    store_id: { type: "integer", references: "stores(id)", onDelete: "SET NULL", nullable: true },
  }, { ifNotExists: true });

  // Index for fast setup-status queries
  pgm.createIndex("users", ["store_id", "role"], { ifNotExists: true, name: "users_store_role_idx" });
};

export const down = (pgm) => {
  pgm.dropIndex("users", "store_id", { ifExists: true, name: "users_store_role_idx" });
  pgm.dropColumn("users", "store_id", { ifExists: true });
};
