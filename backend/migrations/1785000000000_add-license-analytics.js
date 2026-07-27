/**
 * License + Analytics Tables
 * - stores: registered POS instances
 * - subscriptions: license keys with plan, status, expiry
 * - analytics_snapshots: aggregated sales data synced from each store
 */
export const up = (pgm) => {
  // ── stores ──
  pgm.createTable("stores", {
    id: { type: "serial", primaryKey: true },
    name: { type: "varchar(200)", notNull: true },
    location: { type: "varchar(500)" },
    machine_id: { type: "varchar(255)", notNull: true, unique: true },
    license_key: { type: "varchar(100)", unique: true },
    created_at: { type: "timestamp with time zone", default: pgm.func("CURRENT_TIMESTAMP") },
  }, { ifNotExists: true });

  // ── subscriptions ──
  pgm.createTable("subscriptions", {
    id: { type: "serial", primaryKey: true },
    license_key: { type: "varchar(100)", notNull: true, unique: true },
    store_id: { type: "integer", references: "stores(id)", onDelete: "SET NULL" },
    plan: { type: "varchar(50)", notNull: true, default: "trial" }, // trial | basic | pro
    status: { type: "varchar(50)", notNull: true, default: "active" }, // active | expired | cancelled | suspended
    started_at: { type: "timestamp with time zone", default: pgm.func("CURRENT_TIMESTAMP") },
    expires_at: { type: "timestamp with time zone", notNull: true },
    cancelled_at: { type: "timestamp with time zone" },
    created_at: { type: "timestamp with time zone", default: pgm.func("CURRENT_TIMESTAMP") },
  }, { ifNotExists: true });

  // ── analytics_snapshots ──
  // Each row = one day of aggregated sales from one store
  pgm.createTable("analytics_snapshots", {
    id: { type: "serial", primaryKey: true },
    store_id: { type: "integer", notNull: true, references: "stores(id)", onDelete: "CASCADE" },
    snapshot_date: { type: "date", notNull: true },
    total_orders: { type: "integer", notNull: true, default: 0 },
    total_revenue: { type: "decimal(12,2)", notNull: true, default: 0 },
    total_discount: { type: "decimal(12,2)", notNull: true, default: 0 },
    // JSONB array: [{ "name": "Apfel", "category": "Obst", "quantity": 12, "revenue": 5.88 }, ...]
    top_products: { type: "jsonb", notNull: true, default: "'[]'::jsonb" },
    synced_at: { type: "timestamp with time zone", default: pgm.func("CURRENT_TIMESTAMP") },
  }, { ifNotExists: true });

  pgm.addConstraint("analytics_snapshots", "uq_store_date",
    "UNIQUE (store_id, snapshot_date)", { ifNotExists: true });

  // ── developer role for users ──
  // ALTER existing CHECK if present, else just allow it via ALTER COLUMN
  pgm.sql(`
    ALTER TABLE users ALTER COLUMN role TYPE varchar(50);
    UPDATE users SET role = 'developer' WHERE username = 'admin';
  `);

  // Indexes
  pgm.createIndex("subscriptions", "license_key", { ifNotExists: true });
  pgm.createIndex("subscriptions", "store_id", { ifNotExists: true });
  pgm.createIndex("analytics_snapshots", "store_id", { ifNotExists: true });
  pgm.createIndex("analytics_snapshots", "snapshot_date", { ifNotExists: true });
};

export const down = (pgm) => {
  pgm.dropTable("analytics_snapshots", { ifExists: true });
  pgm.dropTable("subscriptions", { ifExists: true });
  pgm.dropTable("stores", { ifExists: true });
  pgm.sql(`UPDATE users SET role = 'manager' WHERE username = 'admin'`);
};
