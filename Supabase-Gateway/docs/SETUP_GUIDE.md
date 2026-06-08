# SETUP_GUIDE.md

## Requirements

| Requirement | Version |
|---|---|
| Node.js | 20.x |
| pnpm | 10.x |
| PostgreSQL | Any (Replit managed in dev) |
| OS | Linux x64 (Replit) or macOS/Linux local |

> **Do not use npm or yarn.** This is a pnpm workspace. Using npm or yarn will break workspace symlinks.

---

## Replit Setup (Primary Environment)

All workflows are pre-configured. Simply:

1. Open the Replit project
2. Click **Run** — this starts both the API server and admin frontend in parallel
3. The preview pane shows the admin login at port 5000

Workflows:
- `Start application` → `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sahatghar-admin run dev`
- `API Server` → `PORT=3000 pnpm --filter @workspace/api-server run dev`

---

## Local Setup

```bash
# 1. Clone / open project
cd Supabase-Gateway

# 2. Install all workspace dependencies
pnpm install

# 3. Set environment variable
export DATABASE_URL="postgresql://user:password@host/dbname"

# 4. Run DB migrations (first time only)
pnpm --filter @workspace/db run migrate

# 5. Seed database (first time only)
pnpm --filter @workspace/api-server run seed

# 6. Start API server (terminal 1)
PORT=3000 pnpm --filter @workspace/api-server run dev

# 7. Start admin frontend (terminal 2)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sahatghar-admin run dev
```

---

## Installing Dependencies

Always run from `Supabase-Gateway/` directory:

```bash
cd Supabase-Gateway

# Add a dependency to a specific package
pnpm --filter @workspace/api-server add some-package

# Add a dev dependency
pnpm --filter @workspace/api-server add -D some-package

# Add to catalog (shared versions in pnpm-workspace.yaml)
# Edit pnpm-workspace.yaml catalog section manually, then:
pnpm install
```

---

## Building for Production

```bash
cd Supabase-Gateway

# Install (frozen lockfile in CI)
pnpm install --frozen-lockfile

# Build admin frontend
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sahatghar-admin run build

# Build API server
PORT=3000 pnpm --filter @workspace/api-server run build
```

---

## Running the Seed Script

The seed script creates all demo data: admins, doctors, patients, appointments, payments, refunds, payouts, support tickets, reviews, notifications.

```bash
cd Supabase-Gateway
pnpm --filter @workspace/api-server run seed
```

> **Warning:** Running the seed multiple times may create duplicate records. The seed script does not check for existing data before inserting.

---

## Typecheck

```bash
cd Supabase-Gateway

# Typecheck API server
pnpm --filter @workspace/api-server run typecheck

# Typecheck admin frontend
pnpm --filter @workspace/sahatghar-admin run typecheck
```

> Shared libraries (`@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`) must be built (`tsc --build`) before dependent packages can typecheck. See `KNOWN_ISSUES.md`.

---

## bcrypt Warning

**Do not install `bcrypt`.** It requires native compilation (node-gyp) which fails on Replit/Linux without build tools.

The project uses **`bcryptjs`** which is pure JavaScript and identical API. This is intentional and must not be changed.
