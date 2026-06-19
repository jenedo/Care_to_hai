import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

function extractUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^[A-Z_]+=["']?(.+?)["']?\$/);
  return match ? match[1] : raw;
}

const connectionString =
  extractUrl(process.env.NEON_DATABASE_URL) ??
  extractUrl(process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error("No database URL found. Set NEON_DATABASE_URL or DATABASE_URL in lib/db/.env");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: "require",
  },
});
