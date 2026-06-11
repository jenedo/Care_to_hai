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

async function main() {
  const result = await pool.query(`
    SELECT
      id,
      full_name,
      specialty,
      city,
      consultation_fee,
      verification_status,
      is_available_online
    FROM doctors
    WHERE verification_status = 'VERIFIED'
    ORDER BY specialty, full_name
    LIMIT 100
  `);

  console.table(result.rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
