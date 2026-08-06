import * as SQLite from "expo-sqlite";

// Local, offline-first SQLite store for the mobile POS.
// Column names mirror the Postgres backend where they overlap, but all money is
// stored as INTEGER CFA (no decimals) per src/utils/format.ts.
//
// DIVERGENCE FROM BACKEND:
//  - `debts.note` exists only on mobile (backend `debts` has no note column).
//  - `orders` currently has no writer yet (no sales screen). getDailyStats
//    reads it correctly and returns zeros until an addOrder-capable screen
//    exists. addOrder is exported so that screen works immediately.

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  balance: number; // sum of unpaid debt amounts, integer CFA
}

export interface Debt {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  amount: number; // integer CFA
  note?: string;
  paid: boolean;
  created_at: string; // ISO
}

export interface DailyStats {
  totalRevenue: number; // integer CFA
  orderCount: number;
  totalChange: number; // integer CFA
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Schema versioning. Existing installs start at user_version 0 (never set),
// so bump #1 runs exactly once on every current device, then is skipped.
// Each entry migrates FROM its index TO index+1. Never edit a shipped entry;
// only append. All money stays INTEGER CFA; order_items.unit_price is the
// price snapshot at sale time, mirroring the Postgres backend.
const MIGRATIONS: Array<(db: SQLite.SQLiteDatabase) => Promise<void>> = [
  // 0 -> 1: bring mobile schema to backend parity (catalog + order lines,
  //         orders.payment_method + orders.customer_id).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        name                TEXT NOT NULL,
        barcode             TEXT,
        price               INTEGER NOT NULL,
        stock               INTEGER NOT NULL DEFAULT 0,
        category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        cost_price          INTEGER,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

      CREATE TABLE IF NOT EXISTS order_items (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity   INTEGER NOT NULL,
        unit_price INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
    // orders: additive columns. Nullable customer_id + constant-default
    // payment_method are both valid single-statement ALTERs in SQLite.
    await db.execAsync(
      "ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'"
    );
    await db.execAsync(
      "ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES customers(id)"
    );
  },
];

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  let version = row?.user_version ?? 0;
  for (let i = version; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[i](db);
    });
    version = i + 1;
    // PRAGMA can't be parameterized; version is an integer we control.
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("kassensystem.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS customers (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT NOT NULL,
          phone      TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS debts (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          order_id    INTEGER,
          amount      INTEGER NOT NULL,
          note        TEXT,
          paid        INTEGER NOT NULL DEFAULT 0,
          paid_date   TEXT,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS orders (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          total_amount  INTEGER NOT NULL,
          change_amount INTEGER NOT NULL DEFAULT 0,
          order_date    TEXT NOT NULL DEFAULT (datetime('now')),
          status        TEXT NOT NULL DEFAULT 'completed'
        );

        CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
        CREATE INDEX IF NOT EXISTS idx_debts_paid ON debts(paid);
        CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
      `);
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

export async function getCustomers(): Promise<Customer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    phone: string | null;
    balance: number | null;
  }>(`
    SELECT c.id, c.name, c.phone,
           COALESCE(SUM(CASE WHEN d.paid = 0 THEN d.amount ELSE 0 END), 0) AS balance
    FROM customers c
    LEFT JOIN debts d ON d.customer_id = c.id
    GROUP BY c.id, c.name, c.phone
    ORDER BY c.name COLLATE NOCASE ASC
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    balance: r.balance ?? 0,
  }));
}

export async function addCustomer(name: string, phone?: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO customers (name, phone) VALUES (?, ?)",
    [name, phone ?? null]
  );
  return result.lastInsertRowId;
}

export async function getDebts(openOnly = true): Promise<Debt[]> {
  const db = await getDb();
  const where = openOnly ? "WHERE d.paid = 0" : "";
  const rows = await db.getAllAsync<{
    id: number;
    customer_id: number;
    customer_name: string;
    customer_phone: string | null;
    amount: number;
    note: string | null;
    paid: number;
    created_at: string;
  }>(`
    SELECT d.id, d.customer_id, c.name AS customer_name, c.phone AS customer_phone,
           d.amount, d.note, d.paid, d.created_at
    FROM debts d
    JOIN customers c ON c.id = d.customer_id
    ${where}
    ORDER BY d.created_at DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone ?? undefined,
    amount: r.amount,
    note: r.note ?? undefined,
    paid: r.paid === 1,
    created_at: r.created_at,
  }));
}

export async function addDebt(
  customerId: number,
  amount: number,
  note?: string
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO debts (customer_id, amount, note) VALUES (?, ?, ?)",
    [customerId, Math.round(amount), note ?? null]
  );
  return result.lastInsertRowId;
}

export async function settleDebt(debtId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE debts SET paid = 1, paid_date = datetime('now') WHERE id = ?",
    [debtId]
  );
}

// TODO: no sales screen writes orders yet. This helper exists so one can.
export async function addOrder(
  totalAmount: number,
  changeAmount = 0
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO orders (total_amount, change_amount) VALUES (?, ?)",
    [Math.round(totalAmount), Math.round(changeAmount)]
  );
  return result.lastInsertRowId;
}

export async function getDailyStats(): Promise<DailyStats> {
  const db = await getDb();
  // Local day boundary: datetime('now','localtime') vs stored order_date.
  const row = await db.getFirstAsync<{
    total_revenue: number | null;
    order_count: number | null;
    total_change: number | null;
  }>(`
    SELECT COALESCE(SUM(total_amount), 0)  AS total_revenue,
           COUNT(*)                         AS order_count,
           COALESCE(SUM(change_amount), 0)  AS total_change
    FROM orders
    WHERE status = 'completed'
      AND date(order_date) = date('now', 'localtime')
  `);
  return {
    totalRevenue: row?.total_revenue ?? 0,
    orderCount: row?.order_count ?? 0,
    totalChange: row?.total_change ?? 0,
  };
}
