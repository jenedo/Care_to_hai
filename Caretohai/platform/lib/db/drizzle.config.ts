import { defineConfig } from "drizzle-kit";

function extractUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^[A-Z_]+=["']?(.+?)["']?$/);
  return match ? match[1] : raw;
}

const connectionString =
  extractUrl(process.env.SUPABASE_DATABASE_URL) ??
  extractUrl(process.env.NEON_DATABASE_URL) ??
  extractUrl(process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error("No database URL found. Set SUPABASE_DATABASE_URL or DATABASE_URL.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: "require",
  },
});
