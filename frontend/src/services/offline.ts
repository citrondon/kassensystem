import { db } from "./db";
import { getProducts, checkout } from "./api";
import { Product } from "../types";

/**
 * Sync products from API → IndexedDB cache.
 * Called on app load and when online.
 */
export async function syncProductsToCache(): Promise<Product[]> {
  const products = await getProducts();
  await db.products.clear();
  await db.products.bulkPut(
    products.map((p) => ({ ...p, cachedAt: Date.now() }))
  );
  return products;
}

/**
 * Load products from cache (offline).
 */
export async function getProductsFromCache(): Promise<Product[]> {
  const cached = await db.products.toArray();
  return cached.map(({ cachedAt, ...p }) => p);
}

/**
 * Save a checkout as pending order in IndexedDB (offline mode).
 */
export async function savePendingOrder(
  items: { productId: number; quantity: number }[],
  paymentMethod: string,
  amountTendered: number,
  discountAmount: number
): Promise<number> {
  return db.pendingOrders.add({
    items,
    paymentMethod,
    amountTendered,
    discountAmount,
    createdAt: Date.now(),
  });
}

/**
 * Sync all pending orders to the backend.
 * Returns number of successfully synced orders.
 */
export async function syncPendingOrders(): Promise<number> {
  const pending = await db.pendingOrders.orderBy("createdAt").toArray();
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const order of pending) {
    try {
      const result = await checkout(
        order.items,
        order.paymentMethod as any,
        order.amountTendered,
        order.discountAmount
      );
      if (result.success) {
        await db.pendingOrders.delete(order.id!);
        synced++;
      } else {
        // Server rejected — stop sync, keep remaining
        break;
      }
    } catch {
      // Network still down — stop
      break;
    }
  }
  return synced;
}

/**
 * Check if there are pending orders in the cache.
 */
export async function getPendingOrderCount(): Promise<number> {
  return db.pendingOrders.count();
}

/**
 * Check if browser is online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
