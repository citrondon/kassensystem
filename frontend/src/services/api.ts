import {
  Product,
  Category,
  CheckoutItem,
  CheckoutResponse,
  OrderListItem,
  OrderDetail,
  ProductFormData,
  PaymentMethod,
  LicenseInfo,
  LicenseKeyRow,
  AnalyticsSummary,
  StoreSummary,
  Bestseller,
  TrendPoint,
} from "../types";
import { getStoredToken } from "../contexts/AuthContext";
import { getStoredLicenseToken } from "../contexts/LicenseContext";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function licenseHeaders(): Record<string, string> {
  const token = getStoredLicenseToken();
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
      costPrice: data.costPrice,
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
      costPrice: data.costPrice,
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

// ── License API ──

export async function activateLicense(
  licenseKey: string,
  storeName: string,
  machineId: string
): Promise<{ success: boolean; token: string; license: LicenseInfo; error?: string }> {
  const res = await fetch(`${API_BASE}/license/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey, storeName, machineId }),
  });
  return res.json();
}

export async function verifyLicense(
  licenseKey: string,
  machineId: string
): Promise<{ success: boolean; token: string; license: LicenseInfo; error?: string; expired?: boolean }> {
  const res = await fetch(`${API_BASE}/license/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey, machineId }),
  });
  return res.json();
}

// ── License Management API (developer-only) ──

export async function listLicenseKeys(): Promise<{ success: boolean; keys: LicenseKeyRow[] }> {
  const res = await fetch(`${API_BASE}/license/keys`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Lizenzschlüssel");
  return res.json();
}

export async function createLicenseKey(
  plan: string,
  durationDays: number
): Promise<{ success: boolean; licenseKey: string; plan: string; expiresAt: string }> {
  const res = await fetch(`${API_BASE}/license/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan, durationDays }),
  });
  return res.json();
}

export async function updateLicenseKey(
  key: string,
  action: "extend" | "cancel" | "reactivate",
  durationDays?: number
): Promise<{ success: boolean; license: LicenseKeyRow }> {
  const res = await fetch(`${API_BASE}/license/keys/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action, durationDays }),
  });
  return res.json();
}

// ── Analytics API ──

export async function getAnalyticsSummary(
  from?: string,
  to?: string
): Promise<{ success: boolean; summary: AnalyticsSummary; stores: StoreSummary[] }> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/analytics/summary${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Analytics");
  return res.json();
}

export async function getBestsellers(
  from?: string,
  to?: string,
  limit?: number
): Promise<{ success: boolean; bestsellers: Bestseller[] }> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/analytics/bestsellers${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Bestseller");
  return res.json();
}

export async function getTrends(
  from?: string,
  to?: string
): Promise<{ success: boolean; trends: TrendPoint[] }> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/analytics/trends${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Fehler beim Abrufen der Trends");
  return res.json();
}

export async function localSync(
  from?: string,
  to?: string
): Promise<{ success: boolean; synced: number; days?: string[]; message?: string }> {
  const res = await fetch(`${API_BASE}/analytics/local-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...licenseHeaders() },
    body: JSON.stringify({ from, to }),
  });
  return res.json();
}
