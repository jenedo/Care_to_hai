# AsaanCare Codespace Status (auto-reference — read this first)

> Last updated: 2026-06-17. Agents: read this file before re-scanning the repo.

## Project root

`Caretohai/Caretohai/platform/` — **NOT** `pakhealth/`. Stack: Drizzle, pnpm, Clerk, Express, Expo.

## Dev ports

| Service | Port | Start command (from `Caretohai/Caretohai`) |
|---|---|---|
| API | 3000 | `cd platform/artifacts/api-server && pnpm run build && node --env-file=.env --enable-source-maps ./dist/index.mjs` |
| Admin | 5000 | `npm run dev:admin` |
| Doctor Expo | 8081 | `npm run dev:doctor` |
| Patient Expo | 8082 | `npm run dev:patient` |

## Blockers (check first)

1. **DATABASE_URL invalid** — If API returns 500 on `/api/doctors` with `password authentication failed for user 'neondb_owner'`, copy a fresh connection string from [Neon dashboard](https://console.neon.tech) into `artifacts/api-server/.env`, then restart API.
2. **Port 3000 busy** — See below.

## Windows: port 3000 busy (EADDRINUSE)

```powershell
netstat -ano | findstr ":3000" | findstr LISTENING
taskkill /PID <PID> /F
```

Then rebuild + start API (see above). Or: `npm run restart:api` from `Caretohai/Caretohai`.

## Env files (already exist)

- `artifacts/api-server/.env` — DATABASE_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY
- `artifacts/admin-dashboard/.env` — PORT=5000, CLERK_PUBLISHABLE_KEY
- `artifacts/patient-app/.env` / `doctor-app/.env` — EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_API_URL

Phone testing: set `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3000` (not localhost).

## Test logins

| Role | Email | Password |
|---|---|---|
| Admin | superadmin@asaancare.pk | AsaanCare@2025! |
| Doctor | ayesha.noor@asaancare.pk | Doctor@2025! |
| Patient | ayesha.khan@gmail.com | Patient@2025! |

Clerk users: `node --env-file=artifacts/api-server/.env scripts/seed-clerk-users.mjs`

## Fixed issues (2026-06-17)

1. **GET /api/doctors 401** — `subscriptionUsage` had global `router.use(requirePatientAuth)` blocking all routes. Fixed: moved `doctorDiscovery` before patient routers; per-route auth only.
2. **Admin "Additional verification required"** — Custom Login didn't handle Clerk MFA/email steps. Fixed: use Clerk `<SignIn />` component.
3. **Patient appointments 403** — Use `GET /api/patient/appointments` (patient auth), not admin `/api/appointments`.

## API routes (patient app)

- Doctors list: `GET /api/doctors` (public, verified only)
- Appointments: `GET /api/patient/appointments`
- Profile: `GET /api/patient/profile`

## PowerShell paste bug

PSReadLine `ArgumentOutOfRangeException` on Ctrl+V is a terminal bug — use Cursor terminal, type commands manually, or use `cmd`.
