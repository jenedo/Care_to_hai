# ENVIRONMENT_VARIABLES.md

## Required Variables

### API Server

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | YES | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `PORT` | YES | API server port | `3000` |
| `JWT_SECRET` | Recommended | JWT signing secret. Falls back to hardcoded dev value if not set — **always set in production** | `some-long-random-secret` |

### Admin Frontend (Vite)

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | YES | Vite dev server port | `5000` |
| `BASE_PATH` | YES | Vite base path | `/` |

> **Never use `VITE_*` prefix for secrets.** Any `VITE_*` variable is bundled into the browser JavaScript and visible to all users.

---

## Where Variables Are Set

### Replit
All secrets are stored in Replit's secret store (not in `.env` files). The Replit secret store auto-injects them as environment variables at runtime.

Current confirmed secrets in Replit:
- `DATABASE_URL` — set and working (Replit managed PostgreSQL)
- `PGPORT` — `5432`

### Local Development
Create a `.env` file in `Supabase-Gateway/` (never commit it):

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/sahatghar
JWT_SECRET=your-local-dev-secret-change-in-production
```

Then load it before running:
```bash
export $(cat .env | xargs)
```

Or use a tool like `dotenv-cli`.

---

## JWT_SECRET Behavior

Defined in `artifacts/api-server/src/lib/jwt.ts`:

```ts
const JWT_SECRET = process.env.JWT_SECRET ?? "sahatghar-dev-secret-2025-change-in-production";
```

- In development: falls back to the hardcoded string if `JWT_SECRET` is not set
- **In production: `JWT_SECRET` MUST be set** — the fallback string is public knowledge and insecure
- Token expiry: 7 days

---

## Database URL Format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=disable
```

For Replit managed PostgreSQL, the `DATABASE_URL` is auto-provisioned by the Replit Database integration and available as an environment variable automatically.

---

## Variables NOT Needed

| Variable | Reason |
|---|---|
| `SUPABASE_URL` | Not using Supabase — using direct PostgreSQL |
| `SUPABASE_ANON_KEY` | Same — not using Supabase |
| `REDIS_URL` | No Redis in this project |
| `SMTP_*` | No email sending implemented yet |
| `STRIPE_*` | No payment gateway integrated yet (subscriptions are mock) |
