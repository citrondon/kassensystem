// Web fallback: localStorage-based mock for UI preview only.
// Native uses real expo-sqlite (see database.ts).

const STORE_KEY = "pos_offline_mock_db";

interface MockDB {
  settings: Record<string, string>;
  products: MockProduct[];
  orders: MockOrder[];
  order_items: MockOrderItem[];
  customers: MockCustomer[];
  debts: MockDebt[];
  seq: Record<string, number>;
}

interface MockProduct {
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
  created_at: string;
}
interface MockOrder {
  id: number;
  total_amount: number;
  discount_amount: number;
  amount_tendered: number;
  change_amount: number;
  payment_method: string;
  order_date: string;
}
interface MockOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}
interface MockCustomer {
  id: number;
  name: string;
  phone: string | null;
  created_at: string;
}
interface MockDebt {
  id: number;
  customer_id: number;
  amount: number;
  note: string | null;
  is_paid: number;
  created_at: string;
  settled_at: string | null;
}

function loadDB(): MockDB {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) return JSON.parse(raw);
  return {
    settings: {},
    products: [],
    orders: [],
    order_items: [],
    customers: [],
    debts: [],
    seq: { products: 0, orders: 0, order_items: 0, customers: 0, debts: 0 },
  };
}

function saveDB(db: MockDB) {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

function nextId(db: MockDB, table: string): number {
  db.seq[table] = (db.seq[table] || 0) + 1;
  return db.seq[table];
}

// ─── Settings ───

export async function getSetting(key: string): Promise<string | null> {
  const db = loadDB();
  return db.settings[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = loadDB();
  db.settings[key] = value;
  saveDB(db);
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
  const db = loadDB();
  return db.products.sort((a, b) => a.name.localeCompare(b.name));
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
  const db = loadDB();
  const id = nextId(db, "products");
  db.products.push({
    id,
    name,
    price,
    stock,
    category,
    low_stock_threshold,
    unit,
    cost_price,
    barcode,
    image_path,
    created_at: new Date().toISOString(),
  });
  saveDB(db);
  return id;
}

export async function updateProduct(
  id: number,
  fields: Partial<Omit<Product, "id" | "created_at">>
): Promise<void> {
  const db = loadDB();
  const prod = db.products.find((p) => p.id === id);
  if (prod) {
    Object.assign(prod, fields);
    saveDB(db);
  }
}

export async function deleteProduct(id: number): Promise<void> {
  const db = loadDB();
  db.products = db.products.filter((p) => p.id !== id);
  saveDB(db);
}

export async function getLowStockProducts(): Promise<Product[]> {
  const db = loadDB();
  return db.products
    .filter((p) => p.stock <= p.low_stock_threshold && p.stock >= 0)
    .sort((a, b) => a.stock - b.stock);
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const db = loadDB();
  return db.products.find((p) => p.barcode === barcode) ?? null;
}

export async function seedDemoProducts(): Promise<void> {
  const db = loadDB();
  if (db.products.length > 0) return;
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
    const id = nextId(db, "products");
    db.products.push({
      id,
      name,
      price,
      stock,
      category,
      low_stock_threshold: 5,
      unit: "Stück",
      cost_price: Math.round(price * 0.7),
      barcode: null,
      image_path: null,
      created_at: new Date().toISOString(),
    });
  }
  saveDB(db);
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
  const db = loadDB();
  const total =
    items.reduce((sum, i) => sum + i.price * i.quantity, 0) - discountAmount;
  const change = amountTendered - total;

  const orderId = nextId(db, "orders");
  db.orders.push({
    id: orderId,
    total_amount: total,
    discount_amount: discountAmount,
    amount_tendered: amountTendered,
    change_amount: change,
    payment_method: "cash",
    order_date: new Date().toISOString(),
  });

  for (const item of items) {
    const itemId = nextId(db, "order_items");
    db.order_items.push({
      id: itemId,
      order_id: orderId,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      line_total: item.price * item.quantity,
    });
    if (item.productId > 0) {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) prod.stock -= item.quantity;
    }
  }

  saveDB(db);
  return { orderId, changeAmount: change };
}

// ─── Daily Stats ───

export interface DailyStats {
  totalRevenue: number;
  orderCount: number;
  totalChange: number;
}

export async function getDailyStats(date?: string): Promise<DailyStats> {
  const db = loadDB();
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const todays = db.orders.filter(
    (o) => o.order_date.slice(0, 10) === targetDate
  );
  return {
    totalRevenue: todays.reduce((s, o) => s + o.total_amount, 0),
    orderCount: todays.length,
    totalChange: todays.reduce((s, o) => s + o.change_amount, 0),
  };
}

export async function checkoutOnCredit(
  items: CheckoutItem[],
  customerId: number,
  discountAmount: number = 0
): Promise<OrderResult> {
  const db = loadDB();
  const total =
    items.reduce((sum, i) => sum + i.price * i.quantity, 0) - discountAmount;

  const orderId = nextId(db, "orders");
  db.orders.push({
    id: orderId,
    total_amount: total,
    discount_amount: discountAmount,
    amount_tendered: 0,
    change_amount: 0,
    payment_method: "credit",
    order_date: new Date().toISOString(),
  });

  for (const item of items) {
    const itemId = nextId(db, "order_items");
    db.order_items.push({
      id: itemId,
      order_id: orderId,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      line_total: item.price * item.quantity,
    });
    if (item.productId > 0) {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) prod.stock -= item.quantity;
    }
  }

  const debtId = nextId(db, "debts");
  db.debts.push({
    id: debtId,
    customer_id: customerId,
    amount: total,
    note: `Verkauf #${orderId}`,
    is_paid: 0,
    created_at: new Date().toISOString(),
    settled_at: null,
  });

  saveDB(db);
  return { orderId, changeAmount: 0 };
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
  const db = loadDB();
  return db.orders
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .slice(offset, offset + limit);
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const db = loadDB();
  return db.order_items.filter((i) => i.order_id === orderId);
}

export async function getDailyProfit(date?: string): Promise<{
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}> {
  const db = loadDB();
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const todays = db.orders.filter((o) => o.order_date.slice(0, 10) === targetDate);
  const revenue = todays.reduce((s, o) => s + o.total_amount, 0);
  let cost = 0;
  for (const o of todays) {
    const items = db.order_items.filter((i) => i.order_id === o.id);
    for (const item of items) {
      const prod = db.products.find((p) => p.id === item.product_id);
      cost += (item.line_total - (prod?.cost_price ?? 0) * item.quantity);
    }
  }
  return { revenue, cost, profit: revenue - cost, orderCount: todays.length };
}

export async function getMonthlyStats(month?: string): Promise<{
  revenue: number;
  profit: number;
  orderCount: number;
}> {
  const db = loadDB();
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);
  const monthsOrders = db.orders.filter((o) => o.order_date.slice(0, 7) === targetMonth);
  const revenue = monthsOrders.reduce((s, o) => s + o.total_amount, 0);
  let cost = 0;
  for (const o of monthsOrders) {
    const items = db.order_items.filter((i) => i.order_id === o.id);
    for (const item of items) {
      const prod = db.products.find((p) => p.id === item.product_id);
      cost += (item.line_total - (prod?.cost_price ?? 0) * item.quantity);
    }
  }
  return { revenue, profit: revenue - cost, orderCount: monthsOrders.length };
}

// ─── Customers & Debts ───

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
}

export async function getCustomers(): Promise<Customer[]> {
  const db = loadDB();
  return db.customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: db.debts
        .filter((d) => d.customer_id === c.id && d.is_paid === 0)
        .reduce((s, d) => s + d.amount, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCustomer(
  name: string,
  phone?: string
): Promise<number> {
  const db = loadDB();
  const id = nextId(db, "customers");
  db.customers.push({
    id,
    name,
    phone: phone ?? null,
    created_at: new Date().toISOString(),
  });
  saveDB(db);
  return id;
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
  const db = loadDB();
  return db.debts
    .filter((d) => (unpaidOnly ? d.is_paid === 0 : true))
    .map((d) => ({
      ...d,
      customer_name:
        db.customers.find((c) => c.id === d.customer_id)?.name ?? "?",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addDebt(
  customerId: number,
  amount: number,
  note?: string
): Promise<void> {
  const db = loadDB();
  const id = nextId(db, "debts");
  db.debts.push({
    id,
    customer_id: customerId,
    amount,
    note: note ?? null,
    is_paid: 0,
    created_at: new Date().toISOString(),
    settled_at: null,
  });
  saveDB(db);
}

export async function settleDebt(debtId: number): Promise<void> {
  const db = loadDB();
  const debt = db.debts.find((d) => d.id === debtId);
  if (debt) {
    debt.is_paid = 1;
    debt.settled_at = new Date().toISOString();
    saveDB(db);
  }
}
