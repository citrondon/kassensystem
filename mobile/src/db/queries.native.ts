import { getDb } from "./database";

// ─── Settings ───

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

// ─── Products ───

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  low_stock_threshold: number;
  unit: string;
  cost_price: number;
  barcode: string | null;
  image_path: string | null;
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.getAllAsync<Product>("SELECT * FROM products ORDER BY name");
}

export async function addProduct(
  name: string,
  price: number,
  stock: number = 0,
  category: string | null = null,
  unit: string = "Stück",
  cost_price: number = 0,
  low_stock_threshold: number = 5,
  barcode: string | null = null,
  image_path: string | null = null
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO products (name, price, stock, category, unit, cost_price, low_stock_threshold, barcode, image_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, price, stock, category, unit, cost_price, low_stock_threshold, barcode, image_path]
  );
  return result.lastInsertRowId as number;
}

export async function updateProduct(
  id: number,
  fields: {
    name?: string;
    price?: number;
    stock?: number;
    category?: string | null;
    unit?: string;
    cost_price?: number;
    low_stock_threshold?: number;
    barcode?: string | null;
    image_path?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(val);
  }
  if (sets.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, values);
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM products WHERE id = ?", [id]);
}

export async function getLowStockProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.getAllAsync<Product>(
    `SELECT * FROM products WHERE stock <= low_stock_threshold AND stock >= 0 ORDER BY stock ASC`
  );
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Product>(
    "SELECT * FROM products WHERE barcode = ? LIMIT 1",
    [barcode]
  );
  return row ?? null;
}

export async function seedDemoProducts(): Promise<void> {
  const db = await getDb();
  const count = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM products"
  );
  if (count && count.c > 0) return;

  const demos: [string, number, number, string][] = [
    ["Eau Sachet", 25, 100, "Boissons"],
    ["Pain", 125, 50, "Alimentation"],
    ["Riz 1kg", 500, 30, "Alimentation"],
    ["Pâte Tomate", 150, 40, "Alimentation"],
    ["Savon", 200, 25, "Hygiène"],
    ["Call Card MTN 100", 100, 20, "Recharge"],
    ["Call Card Moov 200", 200, 20, "Recharge"],
    ["Bonbon", 10, 200, "Divers"],
    ["Biscuit", 50, 60, "Divers"],
    ["Coca 33cl", 300, 30, "Boissons"],
  ];
  for (const [name, price, stock, category] of demos) {
    await db.runAsync(
      `INSERT INTO products (name, price, stock, category, unit, cost_price)
       VALUES (?, ?, ?, ?, 'Stück', ?)`,
      [name, price, stock, category, Math.round(price * 0.7)]
    );
  }
}

// ─── Orders ───

export interface OrderResult {
  orderId: number;
  changeAmount: number;
}

export interface CheckoutItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export async function checkout(
  items: CheckoutItem[],
  amountTendered: number,
  discountAmount: number = 0
): Promise<OrderResult> {
  const db = await getDb();

  const total = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  ) - discountAmount;
  const change = amountTendered - total;

  const orderResult = await db.runAsync(
    `INSERT INTO orders (total_amount, discount_amount, amount_tendered, change_amount, payment_method)
     VALUES (?, ?, ?, ?, 'cash')`,
    [total, discountAmount, amountTendered, change]
  );
  const orderId = orderResult.lastInsertRowId as number;

  for (const item of items) {
    await db.runAsync(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, item.productId, item.name, item.quantity, item.price, item.price * item.quantity]
    );
    if (item.productId > 0) {
      await db.runAsync(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }
  }

  return { orderId, changeAmount: change };
}

// ─── Daily Stats ───

export interface DailyStats {
  totalRevenue: number;
  orderCount: number;
  totalChange: number;
}

export async function getDailyStats(date?: string): Promise<DailyStats> {
  const db = await getDb();
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const row = await db.getFirstAsync<{
    total_revenue: number | null;
    order_count: number;
    total_change: number | null;
  }>(
    `SELECT
       COALESCE(SUM(total_amount), 0) as total_revenue,
       COUNT(*) as order_count,
       COALESCE(SUM(change_amount), 0) as total_change
     FROM orders
     WHERE date(order_date) = date(?)`,
    [targetDate]
  );
  return {
    totalRevenue: row?.total_revenue ?? 0,
    orderCount: row?.order_count ?? 0,
    totalChange: row?.total_change ?? 0,
  };
}

// ─── Order History ───

export interface Order {
  id: number;
  total_amount: number;
  discount_amount: number;
  amount_tendered: number;
  change_amount: number;
  payment_method: string;
  order_date: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export async function getOrders(limit: number = 50, offset: number = 0): Promise<Order[]> {
  const db = await getDb();
  return db.getAllAsync<Order>(
    `SELECT * FROM orders ORDER BY order_date DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const db = await getDb();
  return db.getAllAsync<OrderItem>(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );
}

export async function getDailyProfit(date?: string): Promise<{
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}> {
  const db = await getDb();
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const row = await db.getFirstAsync<{
    revenue: number | null;
    cost: number | null;
    order_count: number;
  }>(
    `SELECT
       COALESCE(SUM(o.total_amount), 0) as revenue,
       COALESCE(SUM(oi.line_total - COALESCE(p.cost_price, 0) * oi.quantity), 0) as cost,
       COUNT(DISTINCT o.id) as order_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE date(o.order_date) = date(?)`,
    [targetDate]
  );
  const revenue = row?.revenue ?? 0;
  const cost = row?.cost ?? 0;
  return {
    revenue,
    cost,
    profit: revenue - cost,
    orderCount: row?.order_count ?? 0,
  };
}

export async function getMonthlyStats(month?: string): Promise<{
  revenue: number;
  profit: number;
  orderCount: number;
}> {
  const db = await getDb();
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);
  const row = await db.getFirstAsync<{
    revenue: number | null;
    cost: number | null;
    order_count: number;
  }>(
    `SELECT
       COALESCE(SUM(o.total_amount), 0) as revenue,
       COALESCE(SUM(oi.line_total - COALESCE(p.cost_price, 0) * oi.quantity), 0) as cost,
       COUNT(DISTINCT o.id) as order_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE strftime('%Y-%m', o.order_date) = ?`,
    [targetMonth]
  );
  const revenue = row?.revenue ?? 0;
  const cost = row?.cost ?? 0;
  return {
    revenue,
    profit: revenue - cost,
    orderCount: row?.order_count ?? 0,
  };
}

// ─── Customers & Debts ───

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
}

export async function getCustomers(): Promise<Customer[]> {
  const db = await getDb();
  return db.getAllAsync<Customer>(
    `SELECT c.id, c.name, c.phone,
       COALESCE(SUM(CASE WHEN d.is_paid = 0 THEN d.amount ELSE 0 END), 0) as balance
     FROM customers c
     LEFT JOIN debts d ON d.customer_id = c.id
     GROUP BY c.id, c.name, c.phone
     ORDER BY c.name`
  );
}

export async function addCustomer(name: string, phone?: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO customers (name, phone) VALUES (?, ?)",
    [name, phone ?? null]
  );
  return result.lastInsertRowId as number;
}

export interface Debt {
  id: number;
  customer_id: number;
  customer_name: string;
  amount: number;
  note: string | null;
  is_paid: number;
  created_at: string;
  settled_at: string | null;
}

export async function getDebts(unpaidOnly: boolean = true): Promise<Debt[]> {
  const db = await getDb();
  const where = unpaidOnly ? "WHERE d.is_paid = 0" : "";
  return db.getAllAsync<Debt>(
    `SELECT d.id, d.customer_id, c.name as customer_name,
       d.amount, d.note, d.is_paid, d.created_at, d.settled_at
     FROM debts d
     JOIN customers c ON c.id = d.customer_id
     ${where}
     ORDER BY d.created_at DESC`
  );
}

export async function addDebt(
  customerId: number,
  amount: number,
  note?: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO debts (customer_id, amount, note) VALUES (?, ?, ?)",
    [customerId, amount, note ?? null]
  );
}

export async function settleDebt(debtId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE debts SET is_paid = 1, settled_at = datetime('now') WHERE id = ?",
    [debtId]
  );
}
