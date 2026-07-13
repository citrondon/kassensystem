import Dexie, { Table } from "dexie";
import { Product } from "../types";

export interface CachedProduct extends Product {
  cachedAt: number;
}

export interface PendingOrder {
  id?: number;
  items: { productId: number; quantity: number }[];
  paymentMethod: string;
  amountTendered: number;
  discountAmount: number;
  createdAt: number;
}

class PosDB extends Dexie {
  products!: Table<CachedProduct, number>;
  pendingOrders!: Table<PendingOrder, number>;

  constructor() {
    super("kassensystem");
    this.version(1).stores({
      products: "id, name, barcode, category_id",
      pendingOrders: "++id, createdAt",
    });
  }
}

export const db = new PosDB();
