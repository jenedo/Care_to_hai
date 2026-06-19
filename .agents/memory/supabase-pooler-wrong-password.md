---
name: Supabase POOLER_URL has wrong password
description: SUPABASE_POOLER_URL was pasted with a different (truncated) password vs SUPABASE_DATABASE_URL.
---

`SUPABASE_POOLER_URL` contains password `SamFa00-0@2` (truncated/wrong).
`SUPABASE_DATABASE_URL` contains password `SamFa009-0@2` (correct, works).

Both point to the pooler host (`aws-1-ap-south-1.pooler.supabase.com`).
The direct DB URL was mistakenly pasted as `SUPABASE_DATABASE_URL` instead.

**Why:** User pasted the wrong value for `SUPABASE_POOLER_URL`.

**How to apply:** Always use `SUPABASE_DATABASE_URL` first in the fallback chain
in `platform/lib/db/src/index.ts`. Do not rely on `SUPABASE_POOLER_URL` until it's
corrected. If ever fixing the pooler URL, verify with a test query before changing priority.
