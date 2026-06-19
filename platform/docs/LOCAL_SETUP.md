# AsaanCare — Local Development Setup

> This guide covers running the project on your own machine. For Replit setup, workflows are pre-configured — just click Run. For production deployment, see `DEPLOYMENT.md`.

---

## Requirements

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| pnpm | 10.x | `npm install -g pnpm` |
| PostgreSQL | 14+ | [postgresql.org](https://postgresql.org) or use Neon (cloud, free) |
| Git | Any | [git-scm.com](https://git-scm.com) |

> **macOS users:** `brew install node pnpm postgresql`
> **Ubuntu/Debian:** `apt install nodejs npm postgresql && npm i -g pnpm`

---

## Step 1 — Clone / Get the Code

```bash
git clone https://github.com/yourorg/asaancare.git
cd asaancare
```

Or if working in Replit: open a shell tab — you are already in `/home/runner/workspace`.

---

## Step 2 — Install Dependencies

From the workspace root (where `package.json` is):

```bash
npm run install
# This runs: cd platform && pnpm install
```

Or directly:
```bash
cd platform && pnpm install
```

> **Do not use `npm install` inside `platform/`** — this project is a pnpm workspace and will break with npm.

---

## Step 3 — Set Up PostgreSQL

### Option A: Local PostgreSQL

```bash
# Create database
psql -U postgres -c "CREATE DATABASE asaancare;"
psql -U postgres -c "CREATE USER asaancare_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE asaancare TO asaancare_user;"
```

Your `DATABASE_URL`:
```
postgresql://asaancare_user:yourpassword@localhost:5432/asaancare
```

### Option B: Neon (Recommended — Free, No Setup)

1. Go to [neon.tech](https://neon.tech) → sign up free
2. Create a project → choose region closest to you
3. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

---

## Step 4 — Set Environment Variables

Create a `.env` file inside `platform/`:

```bash
# platform/.env
DATABASE_URL=postgresql://asaancare_user:yourpassword@localhost:5432/asaancare
JWT_SECRET=replace-with-64-random-chars-run-the-command-below
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Load the env file before running commands:**
```bash
# Option A: export manually
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."

# Option B: use dotenv-cli
npm install -g dotenv-cli
dotenv -e platform/.env -- npm run dev:api
```

> The `.env` file is gitignored. Never commit it.

---

## Step 5 — Push Database Schema

This creates all tables in your database:

```bash
npm run db:push
# This runs: cd platform && pnpm --filter @asaancare/db run push
```

Run this once on a fresh database, and any time you add new tables to the Drizzle schema.

> If you see `relation "xxx" does not exist` errors when starting the API, the schema hasn't been pushed yet.

---

## Step 6 — Seed Demo Data

```bash
npm run seed
# This runs: cd platform && pnpm --filter @asaancare/api-server run seed
```

Creates:
- 5 admin users (Super Admin, Admin, Finance, Support, Verifier)
- 1 doctor login (`ayesha.noor@asaancare.pk`)
- 20 sample doctors, 50 patients, 100 appointments, payments, refunds, payouts, support tickets, reviews, notifications
- 4 subscription plans (Basic free, Care Rs.599, Family Rs.999, Premium Rs.1499)

> **Warning:** Running seed multiple times creates duplicates. Run it once on a fresh DB.

---

## Step 7 — Start the Services

Open **two terminal tabs**:

**Terminal 1 — API Server (port 3000):**
```bash
npm run dev:api
# Output: API server running on port 3000
```

**Terminal 2 — Admin Panel (port 5000):**
```bash
npm run dev:admin
# Output: Local: http://localhost:5000/
```

Or start both together:
```bash
npm run dev
```

**Login:** Open `http://localhost:5000` → use `superadmin@asaancare.pk / AsaanCare@2025!`

---

## Mobile Apps (Doctor / Patient)

The Expo apps run on a physical device or emulator — they don't work in a browser.

**Setup:**
```bash
# Install Expo CLI
npm install -g expo-cli

# Doctor app
npm run dev:doctor
# Open Expo Go on your phone → scan the QR code

# Patient app
npm run dev:patient
```

**IMPORTANT:** Before running mobile apps locally, update the API base URL in the Expo app's `AuthContext.tsx`:

```ts
// Change this:
const API_BASE = "https://yourrepl.replit.dev";

// To this (for local):
const API_BASE = "http://YOUR_LOCAL_IP:3000";
// Find your local IP: ipconfig (Windows) or ifconfig (Mac/Linux)
// Your phone and computer must be on the same WiFi network
```

---

## Available Scripts (from workspace root)

```bash
npm run dev           # Start API + Admin panel together
npm run dev:api       # API server only (port 3000)
npm run dev:admin     # Admin panel only (port 5000)
npm run dev:doctor    # Doctor Expo app
npm run dev:patient   # Patient Expo app
npm run build         # Production build (API + Admin)
npm run seed          # Seed demo data
npm run db:push       # Push Drizzle schema to DB
npm run typecheck     # TypeScript check (API + Admin)
```

Or from inside `platform/` with pnpm directly:
```bash
pnpm --filter @asaancare/api-server run dev
pnpm --filter @asaancare/admin-dashboard run dev
pnpm --filter @asaancare/db run push
pnpm --filter @asaancare/api-server run seed
```

---

## Adding New Dependencies

Always add packages from inside `platform/`:

```bash
cd platform

# Add to API server
pnpm --filter @asaancare/api-server add express-rate-limit

# Add to admin frontend
pnpm --filter @asaancare/admin-dashboard add recharts

# Add dev dependency
pnpm --filter @asaancare/api-server add -D @types/something

# Add to shared DB package
pnpm --filter @asaancare/db add drizzle-zod
```

---

## Build for Production

```bash
# Build both API and admin
npm run build

# API build output: platform/artifacts/api-server/dist/index.js
# Admin build output: platform/artifacts/admin-dashboard/dist/

# Run production API
PORT=3000 DATABASE_URL=... JWT_SECRET=... node platform/artifacts/api-server/dist/index.js
```

---

## TypeScript Build Order

Shared libraries must be built before dependent packages typecheck:

```bash
cd platform

# Build shared libs first
pnpm --filter @asaancare/db run build
pnpm --filter @asaancare/api-zod run build
pnpm --filter @asaancare/api-client-react run build

# Then typecheck
npm run typecheck
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `relation "xxx" does not exist` | Run `npm run db:push` to create tables |
| `Invalid email or password` after seed | Seed ran OK but DB_URL pointed to wrong DB. Re-seed with correct DB. |
| `bcrypt build failed` | Never install `bcrypt` — use `bcryptjs` (already installed) |
| Mobile app can't reach API | Use your machine's local IP (not `localhost`) in the Expo app's API_BASE URL |
| `pnpm: not found` | Run `npm install -g pnpm` first |
| Port 3000 already in use | `lsof -ti:3000 \| xargs kill` |
| Port 5000 already in use | `lsof -ti:5000 \| xargs kill` |
