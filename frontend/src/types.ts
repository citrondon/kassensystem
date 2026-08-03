export interface Category {
  id: number;
  name: string;
  color?: string;
  emoji?: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  price: string;
  cost_price: string;
  stock: number;
  category_id: number | null;
  category_name: string | null;
  image_url: string | null;
  low_stock_threshold: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export type PaymentMethod = "cash" | "card" | "other";

export interface CheckoutResponse {
  success: boolean;
  orderId?: number;
  message: string;
  error?: string;
  changeAmount?: number;
}

export interface OrderListItem {
  id: number;
  order_date: string;
  total_amount: string;
  item_count: number;
  payment_method: string;
  discount_amount: string;
  change_amount: string;
  cashier_name?: string | null;
}

export interface OrderDetailItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface OrderDetail {
  id: number;
  order_date: string;
  total_amount: string;
  discount_amount: string;
  payment_method: string;
  amount_tendered: string;
  change_amount: string;
  status: string;
  cashier_name?: string | null;
  items: OrderDetailItem[];
}

export interface ProductFormData {
  name: string;
  barcode?: string;
  price: number;
  costPrice: number;
  stock: number;
  categoryId?: number | null;
  lowStockThreshold: number;
}

export interface User {
  id: number;
  username: string;
  role: "manager" | "cashier" | "developer";
}

// ── License types ──

export type LicensePlan = "trial" | "basic" | "pro";
export type LicenseStatus = "active" | "expired" | "cancelled" | "suspended";

export interface LicenseInfo {
  plan: LicensePlan;
  status: LicenseStatus;
  expiresAt: string;
  tokenExpiresAt?: string;
  storeId: number;
}

export interface LicenseKeyRow {
  id: number;
  license_key: string;
  plan: LicensePlan;
  status: LicenseStatus;
  expires_at: string;
  started_at: string;
  created_at: string;
  store_id: number | null;
  store_name: string | null;
  store_location: string | null;
  machine_id: string | null;
}

// ── Analytics types ──

export interface AnalyticsSummary {
  activeStores: number;
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  dateRange: { from: string; to: string };
}

export interface StoreSummary {
  id: number;
  name: string;
  location: string | null;
  orders: number;
  revenue: number;
}

export interface Bestseller {
  product_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

export interface TrendPoint {
  snapshot_date: string;
  orders: number;
  revenue: number;
}
