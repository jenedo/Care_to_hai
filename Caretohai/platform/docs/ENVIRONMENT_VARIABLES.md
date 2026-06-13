# AsaanCare — Environment Variables

---

## API Server

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `JWT_SECRET` | **Yes (prod)** | JWT signing secret — falls back to a hardcoded dev string if unset. **Always set in production.** |
| `PORT` | Yes | API server port. Set to `3000` in Replit workflows. |
| `NODE_ENV` | Recommended | `development` or `production`. Affects CORS, error detail, etc. |

## Admin Frontend (Vite)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Vite dev server port. Set to `5000` in Replit workflows. |
| `BASE_PATH` | Yes | Vite base path. Always `/` in this project. |

> **Never prefix secrets with `VITE_`.** Any `VITE_*` variable is embedded into the compiled JavaScript and visible to every browser user.

---

## Setting Variables

### On Replit

Secrets are stored in the Replit Secrets panel (the lock icon in the sidebar). Never put them in `.env` files on Replit — Secrets auto-inject as environment variables at runtime.

Current confirmed secrets on Replit:
- `DATABASE_URL` — auto-provisioned by Replit PostgreSQL integration
- `JWT_SECRET` — set this if not already (generate with command below)

### For Local Development

Create `platform/.env` (never commit this file):

```env
DATABASE_URL=postgresql://asaancare_user:yourpassword@localhost:5432/asaancare
JWT_SECRET=paste-your-64-char-random-string-here
NODE_ENV=development
```

Load before running:
```bash
# Bash / zsh
export $(grep -v '^#' platform/.env | xargs)

# Or use dotenv-cli
npm install -g dotenv-cli
dotenv -e platform/.env -- npm run dev:api
```

### For Production (Digital Ocean App Platform)

Set in the App Platform environment variables panel. Do not use `.env` files on the server.

---

## Generating a Secure JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output (128 hex characters) and set it as the `JWT_SECRET` secret.

---

## DATABASE_URL Format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE[?sslmode=require]
```

| Environment | Example |
|---|---|
| Replit (auto) | Set automatically by the Replit PostgreSQL integration |
| Local PostgreSQL | `postgresql://asaancare_user:pass@localhost:5432/asaancare` |
| Neon (prod) | `postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require` |
| Digital Ocean Managed | `postgresql://doadmin:pass@db-xxx.ondigitalocean.com:25060/defaultdb?sslmode=require` |

---

## Variables NOT Used

| Variable | Why not needed |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Not using Supabase — direct PostgreSQL with Drizzle |
| `REDIS_URL` | No Redis or caching layer (yet) |
| `SMTP_*` | Email notifications not yet implemented |
| `STRIPE_*` / `JAZZCASH_*` / `EASYPAISA_*` | Payment gateway not yet integrated |
| `APPWRITE_*` | Planned for doctor document file uploads — not yet implemented |
| `CLERK_*` | Planned for future auth migration — not yet implemented |
