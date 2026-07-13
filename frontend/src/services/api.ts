import {
  Product,
  Category,
  CheckoutItem,
  CheckoutResponse,
  OrderListItem,
  OrderDetail,
  ProductFormData,
  PaymentMethod,
} from "../types";
import { getStoredToken } from "../contexts/AuthContext";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getProducts(
  searchTerm?: string,
  categoryId?: number | null
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (searchTerm) params.set("searchTerm", searchTerm);
  if (categoryId) params.set("categoryId", String(categoryId));

  const qs = params.toString();
  const url = qs ? `${API_BASE}/products?${qs}` : `${API_BASE}/products`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fehler beim Abrufen der Produkte");
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error("Fehler beim Abrufen der Kategorien");
  return res.json();
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: data.name,
      barcode: data.barcode || null,
      price: data.price,
      stock: data.stock,
      categoryId: data.categoryId,
      lowStockThreshold: data.lowStockThreshold,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Fehler beim Erstellen des Produkts");
  }
  return res.json();
}

export async function updateProduct(
  id: number,
  data: ProductFormData,
  imageUrl?: string | null
): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: data.name,
      barcode: data.barcode || null,
      price: data.price,
      stock: data.stock,
      categoryId: data.categoryId,
      lowStockThreshold: data.lowStockThreshold,
      imageUrl: imageUrl ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Fehler beim Aktualisieren des Produkts");
  }
  return res.json();
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Fehler beim Loeschen des Produkts");
  }
}

export async function uploadProductImage(id: number, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${API_BASE}/products/${id}/image`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Fehler beim Hochladen des Bilds");
  }
  return res.json();
}

export async function checkout(
  items: CheckoutItem[],
  paymentMethod?: PaymentMethod,
  amountTendered?: number,
  discountAmount?: number
): Promise<CheckoutResponse> {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      items,
      paymentMethod,
      amountTendered,
      discountAmount,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      error: err.error || "Checkout fehlgeschlagen.",
      message: err.error || "Checkout fehlgeschlagen.",
    };
  }
  return res.json();
}

export async function getOrders(): Promise<OrderListItem[]> {
  const res = await fetch(`${API_BASE}/orders`);
  if (!res.ok) throw new Error("Fehler beim Abrufen der Bestellungen");
  return res.json();
}

export async function getOrderById(id: number): Promise<OrderDetail> {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  if (!res.ok) throw new Error("Fehler beim Abrufen der Bestellung");
  return res.json();
}

export interface DailyReport {
  date: string;
  total_orders: number;
  gross_amount: string;
  discount_amount: string;
  net_amount: string;
  cash_orders: number;
  card_orders: number;
  other_orders: number;
  cash_amount: string;
  card_amount: string;
  other_amount: string;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: string;
}

export async function getDailyReport(date?: string): Promise<DailyReport> {
  const url = date
    ? `${API_BASE}/reports/daily?date=${date}`
    : `${API_BASE}/reports/daily`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Fehler beim Abrufen des Tagesberichts.");
  return res.json();
}

export async function getTopProducts(date?: string, limit?: number): Promise<TopProduct[]> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const url = qs ? `${API_BASE}/reports/top-products?${qs}` : `${API_BASE}/reports/top-products`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Top-Produkte.");
  return res.json();
}

export interface SalesOverTimeRow {
  date: string;
  total_orders: number;
  net_amount: string;
}

export interface PeakHoursRow {
  hour: number;
  total_orders: number;
  net_amount: string;
}

export async function getSalesOverTime(days?: number): Promise<SalesOverTimeRow[]> {
  const url = days
    ? `${API_BASE}/reports/sales-over-time?days=${days}`
    : `${API_BASE}/reports/sales-over-time`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Umsatzkurve.");
  return res.json();
}

export async function getPeakHours(date?: string): Promise<PeakHoursRow[]> {
  const url = date
    ? `${API_BASE}/reports/peak-hours?date=${date}`
    : `${API_BASE}/reports/peak-hours`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Stoßzeiten.");
  return res.json();
}
