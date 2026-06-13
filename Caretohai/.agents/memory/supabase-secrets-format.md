---
name: Supabase connection secrets format
description: Secrets were saved with assignment syntax; need extractUrl() to strip wrapper.
---

The `SUPABASE_DATABASE_URL` and `SUPABASE_POOLER_URL` secrets were pasted with
shell assignment syntax — e.g. `DATABASE_URL="postgresql://..."` instead of just the URL.

**Fix in `platform/lib/db/src/index.ts`:**
```ts
function extractUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^[A-Z_]+=["']?(.+?)["']?$/);
  return match ? match[1] : raw;
}
```

**Why:** pg cannot parse URLs that start with `NAME=...`; the `@` sign in the Supabase
password also caused problems when manually re-parsing — pass the raw extracted string
directly to `new Pool({ connectionString })` and pg handles `@` in passwords natively.

**How to apply:** Any time you create a new Pool or drizzle connection, wrap the env var
with `extractUrl()` first. The same helper is in `drizzle.config.ts`.
