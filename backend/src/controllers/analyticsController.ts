import { Request, Response } from "express";
import pool from "../utils/pool.js";

interface SyncItem {
  date: string; // YYYY-MM-DD
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  topProducts: { name: string; category: string; quantity: number; revenue: number }[];
}

/**
 * POST /api/analytics/sync
 * Requires: Bearer license token (store → central server)
 * Body: { snapshots: SyncItem[] }
 * Upserts daily analytics snapshots for this store.
 */
export const syncAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!req.license) {
    res.status(401).json({ success: false, error: "Keine Lizenz." });
    return;
  }

  const { snapshots } = req.body as { snapshots: SyncItem[] };

  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    res.status(400).json({ success: false, error: "snapshots (Array) erforderlich." });
    return;
  }

  const storeId = req.license.storeId;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const snap of snapshots) {
      await client.query(
        `INSERT INTO analytics_snapshots
           (store_id, snapshot_date, total_orders, total_revenue, total_discount, top_products)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (store_id, snapshot_date) DO UPDATE SET
           total_orders   = EXCLUDED.total_orders,
           total_revenue  = EXCLUDED.total_revenue,
           total_discount = EXCLUDED.total_discount,
           top_products   = EXCLUDED.top_products,
           synced_at      = CURRENT_TIMESTAMP`,
        [
          storeId,
          snap.date,
          snap.totalOrders,
          snap.totalRevenue.toFixed(2),
          snap.totalDiscount.toFixed(2),
          JSON.stringify(snap.topProducts),
        ]
      );
    }

    await client.query("COMMIT");

    res.json({ success: true, synced: snapshots.length });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Analytics sync error:", error);
    res.status(500).json({ success: false, error: "Sync fehlgeschlagen." });
  } finally {
    client.release();
  }
};

/**
 * GET /api/analytics/summary
 * Requires: developer auth
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Aggregated summary across ALL stores.
 */
export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
  const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
  const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  try {
    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT store_id)                    AS active_stores,
         SUM(total_orders)                           AS total_orders,
         SUM(total_revenue)                          AS total_revenue,
         SUM(total_discount)                         AS total_discount,
         MIN(snapshot_date)                          AS first_date,
         MAX(snapshot_date)                          AS last_date
       FROM analytics_snapshots
       WHERE snapshot_date BETWEEN $1 AND $2`,
      [from, to]
    );

    const row = result.rows[0];

    // Per-store breakdown
    const storesResult = await pool.query(
      `SELECT
         s.id, s.name, s.location,
         SUM(a.total_orders)  AS orders,
         SUM(a.total_revenue) AS revenue
       FROM analytics_snapshots a
       JOIN stores s ON s.id = a.store_id
       WHERE a.snapshot_date BETWEEN $1 AND $2
       GROUP BY s.id, s.name, s.location
       ORDER BY revenue DESC`,
      [from, to]
    );

    res.json({
      success: true,
      summary: {
        activeStores: Number(row.active_stores) || 0,
        totalOrders: Number(row.total_orders) || 0,
        totalRevenue: Number(row.total_revenue) || 0,
        totalDiscount: Number(row.total_discount) || 0,
        dateRange: { from, to },
      },
      stores: storesResult.rows,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    res.status(500).json({ success: false, error: "Abruf fehlgeschlagen." });
  }
};

/**
 * GET /api/analytics/bestsellers
 * Requires: developer auth
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
 * Bestselling products across ALL stores.
 */
export const getBestsellers = async (req: Request, res: Response): Promise<void> => {
  const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
  const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  try {
    const result = await pool.query(
      `SELECT
         elem->>'name'     AS product_name,
         elem->>'category' AS category,
         SUM((elem->>'quantity')::int)     AS total_quantity,
         SUM((elem->>'revenue')::numeric)  AS total_revenue
       FROM analytics_snapshots
       CROSS JOIN LATERAL jsonb_array_elements(top_products) AS elem
       WHERE snapshot_date BETWEEN $1 AND $2
         AND jsonb_array_length(top_products) > 0
       GROUP BY product_name, category
       ORDER BY total_quantity DESC
       LIMIT $3`,
      [from, to, limit]
    );

    res.json({ success: true, bestsellers: result.rows });
  } catch (error) {
    console.error("Bestsellers error:", error);
    res.status(500).json({ success: false, error: "Abruf fehlgeschlagen." });
  }
};

/**
 * GET /api/analytics/trends
 * Requires: developer auth
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Daily revenue trend across all stores.
 */
export const getTrends = async (req: Request, res: Response): Promise<void> => {
  const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
  const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  try {
    const result = await pool.query(
      `SELECT
         snapshot_date,
         SUM(total_orders)  AS orders,
         SUM(total_revenue) AS revenue
       FROM analytics_snapshots
       WHERE snapshot_date BETWEEN $1 AND $2
       GROUP BY snapshot_date
       ORDER BY snapshot_date ASC`,
      [from, to]
    );

    res.json({ success: true, trends: result.rows });
  } catch (error) {
    console.error("Trends error:", error);
    res.status(500).json({ success: false, error: "Abruf fehlgeschlagen." });
  }
};

/**
 * GET /api/analytics/stores/:storeId
 * Requires: developer auth
 * Detailed analytics for a single store.
 */
export const getStoreDetail = async (req: Request, res: Response): Promise<void> => {
  const storeId = Number(req.params.storeId);
  const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
  const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  try {
    const storeResult = await pool.query(
      `SELECT id, name, location, machine_id, license_key, created_at FROM stores WHERE id = $1`,
      [storeId]
    );

    if (storeResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Store nicht gefunden." });
      return;
    }

    const dataResult = await pool.query(
      `SELECT snapshot_date, total_orders, total_revenue, total_discount, top_products
       FROM analytics_snapshots
       WHERE store_id = $1 AND snapshot_date BETWEEN $2 AND $3
       ORDER BY snapshot_date ASC`,
      [storeId, from, to]
    );

    res.json({
      success: true,
      store: storeResult.rows[0],
      snapshots: dataResult.rows,
    });
  } catch (error) {
    console.error("Store detail error:", error);
    res.status(500).json({ success: false, error: "Abruf fehlgeschlagen." });
  }
};
