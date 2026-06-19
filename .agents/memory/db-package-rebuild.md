---
name: DB package rebuild requirement
description: After modifying platform/lib/db/src/schema/index.ts, the dist must be rebuilt or TS types are stale
---

## Rule
After ANY change to `platform/lib/db/src/schema/` (adding a table, modifying index.ts exports):

1. Run `pnpm --filter @asaancare/db run build` to regenerate dist types
2. The api-server uses `tsx` at dev runtime so it works without the dist, but `tsc --noEmit` will show false errors until rebuilt

## Why:
`platform/artifacts/api-server/src/lib/db.ts` imports from the compiled dist (`@asaancare/db`). If the dist is stale, TypeScript shows "has no exported member" errors for every table — these are spurious until the package is rebuilt.

## How to apply:
Any time a new schema table is created or the schema index.ts is touched, immediately run the build command before running tsc checks.
