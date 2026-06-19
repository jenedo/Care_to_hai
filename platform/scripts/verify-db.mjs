import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../artifacts/api-server/.env");

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv(envPath);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const ping = await pool.query("SELECT 1 AS ok, current_database() AS db");
  console.log("DB_CONNECT: OK", ping.rows[0]);

  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log("TABLES:", tables.rows.length);

  const doctorCols = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors'
    ORDER BY column_name
  `);
  console.log("DOCTORS_COLUMNS:", doctorCols.rows.map((r) => r.column_name).join(", "));

  const counts = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM doctors) AS doctors,
      (SELECT count(*)::int FROM patients) AS patients,
      (SELECT count(*)::int FROM admin_users) AS admins
  `);
  console.log("ROW_COUNTS:", counts.rows[0]);
} catch (err) {
  console.error("DB_CONNECT: FAIL", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
