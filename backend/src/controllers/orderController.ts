import { Request, Response } from "express";
import pool from "../utils/pool.js";

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export type PaymentMethod = "cash" | "card" | "other";

export interface CheckoutPayload {
  items: CheckoutItem[];
  paymentMethod?: PaymentMethod;
  amountTendered?: number;
  discountAmount?: number;
}

export interface CheckoutResult {
  success: boolean;
  orderId: number;
  message: string;
  changeAmount?: number;
}

export const processCheckout = async (payload: CheckoutPayload, userId?: number | null): Promise<CheckoutResult> => {
  const { items } = payload;
  const paymentMethod: PaymentMethod = payload.paymentMethod ?? "cash";
  const discountAmount = Math.max(0, payload.discountAmount ?? 0);
  const amountTendered = Math.max(0, payload.amountTendered ?? 0);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    let grossAmount = 0;

    const orderItems: {
      productId: number;
      quantity: number;
      unitPrice: string;
    }[] = [];

    for (const item of items) {
      const { productId, quantity } = item;

      const result = await client.query(
        `SELECT stock, price, name FROM products WHERE id = $1 FOR UPDATE`,
        [productId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Produkt mit ID ${productId} nicht gefunden.`);
      }

      const product = result.rows[0];

      if (product.stock < quantity) {
        throw new Error(
          `Nicht genuegend Lagerbestand fuer Produkt '${product.name}'. Verfuegbar: ${product.stock}, Angefordert: ${quantity}.`
        );
      }

      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [quantity, productId]
      );

      grossAmount += Number(product.price) * quantity;
      orderItems.push({ productId, quantity, unitPrice: product.price });
    }

    if (discountAmount > grossAmount) {
      throw new Error("Rabattbetrag darf den Bruttobetrag nicht uebersteigen.");
    }

    const totalAmount = grossAmount - discountAmount;

    const finalAmountTendered = paymentMethod === "cash" ? amountTendered : totalAmount;

    if (paymentMethod === "cash" && finalAmountTendered < totalAmount) {
      throw new Error(
        `Barzahlung unzureichend. Benoetigt: ${totalAmount.toFixed(2)} €, erhalten: ${finalAmountTendered.toFixed(2)} €.`
      );
    }

    const changeAmount = paymentMethod === "cash" ? Math.max(0, finalAmountTendered - totalAmount) : 0;

    const orderResult = await client.query(
      `INSERT INTO orders (total_amount, discount_amount, payment_method, amount_tendered, change_amount, cashier_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        totalAmount.toFixed(2),
        discountAmount.toFixed(2),
        paymentMethod,
        finalAmountTendered.toFixed(2),
        changeAmount.toFixed(2),
        userId ?? null,
      ]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.productId, item.quantity, item.unitPrice]
      );
    }

    await client.query("COMMIT");

    return {
      success: true,
      orderId,
      message: `Checkout erfolgreich. Bestellung #${orderId} wurde erstellt und der Bestand aktualisiert.`,
      changeAmount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction failed:", error);
    throw error;
  } finally {
    client.release();
  }
};

export interface OrderListRow {
  id: number;
  order_date: string;
  total_amount: string;
  item_count: number;
  payment_method: string;
  discount_amount: string;
  change_amount: string;
  cashier_name: string | null;
}

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  try {
    const result = await pool.query<OrderListRow>(
      `SELECT o.id, o.order_date, o.total_amount, o.payment_method,
              o.discount_amount, o.change_amount,
              cashier.username AS cashier_name,
              COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN users cashier ON cashier.id = o.cashier_id
       GROUP BY o.id, cashier.username
       ORDER BY o.order_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, error: "Fehler beim Abrufen der Bestellungen." });
  }
};

export interface OrderDetailRow {
  id: number;
  order_date: string;
  total_amount: string;
  discount_amount: string;
  payment_method: string;
  amount_tendered: string;
  change_amount: string;
  status: string;
  cashier_name: string | null;
  items: {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
}

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  try {
    const orderResult = await pool.query(
      `SELECT o.id, o.order_date, o.total_amount, o.discount_amount, o.payment_method,
              o.amount_tendered, o.change_amount, o.status,
              cashier.username AS cashier_name
       FROM orders o
       LEFT JOIN users cashier ON cashier.id = o.cashier_id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Bestellung nicht gefunden." });
      return;
    }

    const itemsResult = await pool.query(
      `SELECT oi.id, p.id AS product_id, p.name AS product_name, oi.quantity, oi.unit_price,
              (oi.quantity * oi.unit_price) AS line_total
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [id]
    );

    const order: OrderDetailRow = {
      ...orderResult.rows[0],
      items: itemsResult.rows,
    };

    res.json(order);
  } catch (error) {
    console.error("Error fetching order detail:", error);
    res.status(500).json({ success: false, error: "Fehler beim Abrufen der Bestellung." });
  }
};
