const dotenv = require("dotenv");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
    });

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "pos123";

async function seed() {
  const adminHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const cashierHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Upsert admin as developer, kasse as cashier
  await pool.query(
    `INSERT INTO users (username, password_hash, role) VALUES
      ($1, $2, 'developer'),
      ($3, $4, 'cashier')
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role`,
    ["admin", adminHash, "kasse", cashierHash]
  );

  console.log("Demo users seeded: admin (developer), kasse (cashier)");
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
