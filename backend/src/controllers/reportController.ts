import { Request, Response } from "express";
import pool from "../utils/pool.js";

export interface DailyReportRow {
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

/**
 * Get daily Z-report: totals and breakdown by payment method for a given date.
 * @param req.query.date - Date in YYYY-MM-DD format (defaults to today)
 * @returns 200 with `DailyReportRow` or 500
 */
export const getDailyReport = async (req: Request, res: Response): Promise<void> => {
  const dateParam = (req.query.date as string | undefined)?.trim();
  const date = dateParam || new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(
      `SELECT
         $1::text AS date,
         COUNT(*)::int AS total_orders,
         COALESCE(SUM(o.total_amount + o.discount_amount), 0::numeric)::text AS gross_amount,
         COALESCE(SUM(o.discount_amount), 0::numeric)::text AS discount_amount,
         COALESCE(SUM(o.total_amount), 0::numeric)::text AS net_amount,
         COUNT(*) FILTER (WHERE o.payment_method = 'cash')::int AS cash_orders,
         COUNT(*) FILTER (WHERE o.payment_method = 'card')::int AS card_orders,
         COUNT(*) FILTER (WHERE o.payment_method = 'other')::int AS other_orders,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_method = 'cash'), 0::numeric)::text AS cash_amount,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_method = 'card'), 0::numeric)::text AS card_amount,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_method = 'other'), 0::numeric)::text AS other_amount
       FROM orders o
       WHERE DATE(o.order_date) = $1::date
       AND o.status = 'completed'`,
      [date]
    );

    const row = result.rows[0] ?? {};
    const fmt = (v: unknown) => Number(v ?? 0).toFixed(2);
    res.json({
      date,
      total_orders: Number(row.total_orders ?? 0),
      gross_amount: fmt(row.gross_amount),
      discount_amount: fmt(row.discount_amount),
      net_amount: fmt(row.net_amount),
      cash_orders: Number(row.cash_orders ?? 0),
      card_orders: Number(row.card_orders ?? 0),
      other_orders: Number(row.other_orders ?? 0),
      cash_amount: fmt(row.cash_amount),
      card_amount: fmt(row.card_amount),
      other_amount: fmt(row.other_amount),
    });
  } catch (error) {
    console.error("Error fetching daily report:", error);
    res.status(500).json({ success: false, error: "Fehler beim Abrufen des Tagesberichts." });
  }
};

export interface TopProductRow {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: string;
}

/**
 * Get top-selling products for a given date.
 * @param req.query.date - Date in YYYY-MM-DD format (defaults to today)
 * @param req.query.limit - Max results (default: 10, max: 50)
 * @returns 200 with `TopProductRow[]` or 500
 */
export const getTopProducts = async (req: Request, res: Response): Promise<void> => {
  const dateParam = (req.query.date as string | undefined)?.trim();
  const date = dateParam || new Date().toISOString().split("T")[0];
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  try {
    const result = await pool.query<TopProductRow>(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         SUM(oi.quantity) AS quantity_sold,
         SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE DATE(o.order_date) = $1
       AND o.status = 'completed'
       GROUP BY p.id, p.name
       ORDER BY quantity_sold DESC
       LIMIT $2`,
      [date, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ success: false, error: "Fehler beim Abrufen der Top-Produkte." });
  }
};
