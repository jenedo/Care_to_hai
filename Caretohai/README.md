# AsaanCare — آسان کیئر

**Telemedicine platform for Pakistan.** صحت آپکے گھر

---

## Quick Start (Replit)

Workflows are pre-configured. Click **Run** — both the API and admin panel start automatically.

| Service | Port |
|---|---|
| Admin Panel | 5000 (preview pane) |
| API Server | 3000 |

**Dev login:** `superadmin@asaancare.pk` / `AsaanCare@2025!`

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm run install        # delegates to: cd platform && pnpm install

# 2. Set environment variables
export DATABASE_URL="postgresql://user:password@host/dbname"
export JWT_SECRET="your-64-char-random-string"

# 3. Create DB tables (first time only)
npm run db:push

# 4. Seed demo data (first time only)
npm run seed

# 5. Start API server (terminal 1)
npm run dev:api

# 6. Start admin panel (terminal 2)
npm run dev:admin
```

> Uses pnpm internally. All `npm run` scripts delegate to pnpm inside `platform/`.

---

## Available Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start API + Admin together |
| `npm run dev:api` | API server only (port 3000) |
| `npm run dev:admin` | Admin panel only (port 5000) |
| `npm run dev:doctor` | Doctor Expo app |
| `npm run dev:patient` | Patient Expo app |
| `npm run build` | Production build (API + Admin) |
| `npm run seed` | Seed demo data into database |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run typecheck` | TypeScript check all packages |

---

## Project Structure

```
/                            <- workspace root (you are here)
├── package.json             <- convenience scripts
├── README.md                <- this file
├── replit.md                <- project overview + preferences
└── platform/                <- pnpm monorepo (all application code)
    ├── artifacts/
    │   ├── api-server/      <- Express REST API (port 3000)
    │   ├── admin-dashboard/ <- React Admin Panel (port 5000)
    │   ├── patient-app/     <- Patient Expo App (AsaanCare)
    │   └── doctor-app/      <- Doctor Expo App (AsaanCare Doctor)
    ├── lib/
    │   ├── db/              <- Drizzle schema + PostgreSQL connection
    │   └── ...              <- shared type packages
    └── docs/                <- full developer documentation
```

---

## Documentation

All docs live in `platform/docs/`:

| File | Contents |
|---|---|
| `ARCHITECTURE.md` | System diagram, folder tree, auth flow |
| `API_ROUTES.md` | Complete API reference with request/response examples |
| `AUTH_GUIDE.md` | JWT, cookies, mobile Bearer tokens |
| `DATABASE_GUIDE.md` | Schema, Drizzle usage, migrations |
| `DECISIONS.md` | Why each technology was chosen |
| `DEPLOYMENT.md` | Production guide (Digital Ocean + Neon) |
| `LOCAL_SETUP.md` | Local development setup |
| `CHANGELOG.md` | What changed and when |
| `KNOWN_ISSUES.md` | Current bugs and workarounds |

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Express + TypeScript |
| ORM | Drizzle + PostgreSQL |
| Admin Frontend | Vite + React + Tailwind + Radix UI |
| Mobile | Expo / React Native |
| Auth | JWT (httpOnly cookie for admin, Bearer for mobile) |
| Package manager | pnpm workspaces (monorepo) |

---

## Production

See `platform/docs/DEPLOYMENT.md` for the full guide.

**Recommended:** Digital Ocean App Platform (API) + Neon PostgreSQL + Appwrite (file storage) + Expo EAS (mobile builds).
