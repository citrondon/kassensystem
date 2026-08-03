const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error("Usage: node scripts/resetPassword.cjs <username> <password>");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

async function main() {
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, role",
    [hash, username]
  );
  if (res.rowCount === 0) {
    console.log("USER_NOT_FOUND");
  } else {
    console.log("UPDATED", JSON.stringify(res.rows[0]));
  }
  await pool.end();
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
