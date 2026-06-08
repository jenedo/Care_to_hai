---
name: bcryptjs migration
description: Why bcrypt was replaced with bcryptjs and what was changed
---

# bcryptjs Migration

## Rule
Always use `bcryptjs`, never `bcrypt`, in this project.

**Why:** `bcrypt@6` requires native compilation via node-gyp. Replit Linux does not provide the required build toolchain in a usable form. The `pnpm approve-builds` interactive prompt also cannot be automated non-interactively in the Replit shell. `bcryptjs` is a pure JavaScript implementation with an identical API and same function signatures.

**How to apply:** If you ever see `import bcrypt from "bcrypt"` or `"bcrypt"` in package.json dependencies, replace with `bcryptjs`. The API is 100% compatible — `bcrypt.hash()`, `bcrypt.compare()` work identically.

## What was changed
- `artifacts/api-server/package.json`: `bcrypt@^6.0.0` → `bcryptjs@^3.0.2`, `@types/bcrypt` → `@types/bcryptjs`
- `artifacts/api-server/src/routes/auth.ts`: import changed
- `artifacts/api-server/src/routes/adminUsers.ts`: import changed
- `artifacts/api-server/src/seed.ts`: import changed
- `pnpm-workspace.yaml`: `bcrypt` removed from `onlyBuiltDependencies` (bcryptjs needs no build scripts)
