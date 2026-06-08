---
name: SahatGhar DB bootstrap
description: How to initialize the database on a fresh Replit environment
---

# Database Bootstrap

## Rule
On a fresh environment or new Replit container, the PostgreSQL database exists but has no tables. Both steps must be run in order.

**Why:** Drizzle does not auto-migrate on server start. Tables must be explicitly created via `drizzle-kit push`, then populated with `seed`.

## Steps

```bash
cd Supabase-Gateway

# Step 1: Create all tables from Drizzle schema
pnpm --filter @workspace/db run push

# Step 2: Populate with demo data
pnpm --filter @workspace/api-server run seed
```

## What seed creates
- 5 admin users (Super Admin, Admin, Finance, Support, Verifier) — password: SahatGhar@2025!
- 5 clinics
- 20 doctors (including ayesha.noor@sahatghar.pk — Doctor@2025!)
- 50 patients
- 100 appointments + payments
- Refunds, payouts, support tickets, reviews, notifications

## Warning
The seed script does NOT guard against duplicate runs — running it twice inserts duplicates. This is tracked in KNOWN_ISSUES.md.
