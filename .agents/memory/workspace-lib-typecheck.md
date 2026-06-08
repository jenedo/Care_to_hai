---
name: Workspace lib typecheck setup
description: lib packages must be built before dependent packages can typecheck.
---

## The problem
`lib/db`, `lib/api-zod`, `lib/api-client-react` use TypeScript project references (`"composite": true`).
Running typecheck on `api-server` or `sahatghar-admin` fails with:
  "Output file 'lib/db/dist/index.d.ts' has not been built from source file"

## The fix
Run from Supabase-Gateway/:
```bash
npx tsc --build lib/db lib/api-zod lib/api-client-react
```

Each lib's `package.json` also now has `"build": "tsc -p tsconfig.json"`.

## Workspace-level typecheck order
The root `package.json` has `"typecheck:libs": "tsc --build"` which builds all referenced libs.
Then `pnpm -r --filter "./artifacts/**" run typecheck` type-checks the apps.

**Why:** esbuild resolves `.ts` exports at bundle time so the app runs fine, but `tsc --noEmit` for type-checking needs pre-built `.d.ts` files from referenced packages.
