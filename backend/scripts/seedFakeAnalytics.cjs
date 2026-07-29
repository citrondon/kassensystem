const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://kassensystem_db_user:CvVBpmBoz9fk7DZzxNAL6Sp1RVmWdM0I@dpg-d9h4fukm0tmc73bqdl5g-a.frankfurt-postgres.render.com:5432/kassensystem_db",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
});

async function run() {
  // Create fake stores
  await pool.query(
    `INSERT INTO stores (name, location, machine_id, license_key) VALUES
     ('Tante Emma', 'Douala, Cameroon', 'fake-m-001', null),
     ('Boutique Sahel', 'Yaounde, Cameroon', 'fake-m-002', null),
     ('Mini Marche', 'Bafoussam, Cameroon', 'fake-m-003', null)
     ON CONFLICT (machine_id) DO NOTHING`
  );

  const stores = await pool.query("SELECT id, name FROM stores ORDER BY id");
  console.log("Stores:", stores.rows.length);

  const products = [
    { name: "Riz 5kg", category: "Grundnahrungsmittel" },
    { name: "Huile 1L", category: "Grundnahrungsmittel" },
    { name: "Sucre 1kg", category: "Grundnahrungsmittel" },
    { name: "Savon", category: "Hygiene" },
    { name: "Cafe 200g", category: "Getraenke" },
    { name: "Eau 0.5L", category: "Getraenke" },
    { name: "Pain", category: "Backwaren" },
    { name: "Bonbons", category: "Suessigkeiten" },
  ];

  for (const store of stores.rows) {
    for (let d = 30; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86400000).toISOString().split("T")[0];
      const seed = (store.id * 100 + d) % 7;
      const orders = 5 + seed * 3 + Math.floor(Math.random() * 5);
      const revenue = orders * (3000 + seed * 500 + Math.floor(Math.random() * 2000));
      const discount = Math.floor(revenue * 0.02);

      const numProducts = 3 + (seed % 3);
      const topProducts = [];
      for (let p = 0; p < numProducts; p++) {
        const prod = products[(store.id + d + p) % products.length];
        const qty = 2 + ((store.id + d + p) % 8);
        topProducts.push({
          name: prod.name,
          category: prod.category,
          quantity: qty,
          revenue: qty * (500 + p * 300),
        });
      }

      await pool.query(
        `INSERT INTO analytics_snapshots (store_id, snapshot_date, total_orders, total_revenue, total_discount, top_products)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (store_id, snapshot_date) DO UPDATE SET
           total_orders = EXCLUDED.total_orders,
           total_revenue = EXCLUDED.total_revenue,
           total_discount = EXCLUDED.total_discount,
           top_products = EXCLUDED.top_products`,
        [store.id, date, orders, revenue.toFixed(2), discount.toFixed(2), JSON.stringify(topProducts)]
      );
    }
  }

  const count = await pool.query("SELECT COUNT(*) FROM analytics_snapshots");
  console.log("Analytics snapshots:", count.rows[0].count);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
