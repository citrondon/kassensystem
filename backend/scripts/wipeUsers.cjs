const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://kassensystem_db_user:CvVBpmBoz9fk7DZzxNAL6Sp1RVmWdM0I@dpg-d9h4fukm0tmc73bqdl5g-a.frankfurt-postgres.render.com:5432/kassensystem_db",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function run() {
  console.log("Connecting to Render DB...");
  const res = await pool.query("DELETE FROM users RETURNING id, username");
  console.log("Deleted users:", res.rows);
  
  const count = await pool.query("SELECT COUNT(*) FROM users");
  console.log("Remaining users:", count.rows[0].count);
  
  const status = await pool.query("SELECT COUNT(*) AS count FROM users");
  console.log("Setup needed:", Number(status.rows[0].count) === 0);
  
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
