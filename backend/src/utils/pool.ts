import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Render provides DATABASE_URL; local dev uses individual DB_* vars.
// SSL ist bei DATABASE_URL standardmäßig an (Render), per DB_SSL=false abschaltbar
// (z.B. Compose-interne Postgres ohne SSL im Docker-Produktiv-Stack).
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
    });

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
