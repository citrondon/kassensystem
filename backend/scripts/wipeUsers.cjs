// wipeUsers.cjs — lokaler "Test-Account-Reset".
// Löscht Manager + Kassierer aus der lokalen Dev-DB (Developer bleiben
// unberührt), damit der Setup/Register-Flow neu geöffnet wird.
// Ersetzt den entfernten Factory-Reset-Endpunkt für lokale Tests.
// Verbindung kommt aus backend/.env (DATABASE_URL oder DB_*-Variablen).
const dotenv = require("dotenv");
const path = require("path");
const { Pool } = require("pg");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Sicherheitsgurt: ohne --force nur gegen localhost laufen
const hostHint = process.env.DB_HOST || process.env.DATABASE_URL || "";
const isLocal = /localhost|127\.0\.0\.1/.test(hostHint);
if (!isLocal && !process.argv.includes("--force")) {
  console.error(
    "ABBRUCH: Ziel-DB ist nicht localhost. Wenn du das wirklich willst: --force anhängen."
  );
  process.exit(1);
}

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query(
      `DELETE FROM users WHERE role = ANY($1::text[]) RETURNING username, role`,
      [["manager", "cashier"]]
    );
    console.log(`Gelöscht: ${res.rows.length} Account(s)`);
    res.rows.forEach((r) => console.log(`  - ${r.username} (${r.role})`));

    const devs = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'developer'`
    );
    console.log(`Developer-Accounts bleiben: ${devs.rows[0].count}`);
    console.log("Setup-Flow ist wieder offen (needsSetup = true).");
  } finally {
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
