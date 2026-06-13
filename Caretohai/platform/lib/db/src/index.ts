import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * Secrets may have been saved with assignment syntax like:
 *   DATABASE_URL="postgresql://..."
 * Strip the wrapper and return just the raw URL value.
 * Do NOT re-encode or manipulate the URL — pg handles @ in passwords natively.
 */
function extractUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^[A-Z_]+=["']?(.+?)["']?$/);
  return match ? match[1] : raw;
}

// SUPABASE_DATABASE_URL is the direct/working URL; POOLER_URL may have wrong credentials
const connectionString =
  extractUrl(process.env.SUPABASE_DATABASE_URL) ??
  extractUrl(process.env.SUPABASE_POOLER_URL) ??
  extractUrl(process.env.NEON_DATABASE_URL) ??
  extractUrl(process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set SUPABASE_POOLER_URL or DATABASE_URL.",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export * from "./schema";
