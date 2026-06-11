import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL must be set.");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  const statusResult = await pool.query(`
    SELECT verification_status, count(*)::int AS count
    FROM doctors
    GROUP BY verification_status
    ORDER BY verification_status
  `);

  console.log("\nDoctor status counts:");
  console.table(statusResult.rows);

  const doctorsResult = await pool.query(`
    SELECT
      id,
      full_name,
      specialty,
      city,
      consultation_fee,
      verification_status
    FROM doctors
    ORDER BY created_at DESC
    LIMIT 50
  `);

  console.log("\nLatest doctors:");
  console.table(doctorsResult.rows);
} finally {
  await pool.end();
}
