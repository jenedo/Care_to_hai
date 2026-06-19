# AsaanCare — Environment Variables

Copy each app's `.env.example` to `.env` locally. **Never commit `.env` files.**

---

## API Server (`artifacts/api-server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `PORT` | Yes | API port (default `3000`) |
| `NODE_ENV` | Recommended | `development` or `production` |
| `CLERK_SECRET_KEY` | **Yes** | Clerk backend secret |
| `CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key |
| `CLERK_WEBHOOK_SECRET` | Prod | Svix signing secret for `POST /api/webhooks/clerk` |
| `APPWRITE_ENDPOINT` | Files | Appwrite API URL |
| `APPWRITE_PROJECT_ID` | Files | Appwrite project ID |
| `APPWRITE_API_KEY` | Files | Appwrite server API key |
| `APPWRITE_BUCKET_ID` | Files | Storage bucket for doctor docs + avatars |
| `LIVEKIT_URL` | Video | WebSocket URL (`wss://xxx.livekit.cloud`) |
| `LIVEKIT_API_KEY` | Video | LiveKit API key |
| `LIVEKIT_API_SECRET` | Video | LiveKit API secret |
| `JAZZCASH_WEBHOOK_SECRET` | Payments | HMAC secret when JazzCash is integrated |
| `EASYPAISA_WEBHOOK_SECRET` | Payments | HMAC secret when EasyPaisa is integrated |
| `ADMIN_WEB_URL` | Prod CORS | Admin dashboard origin |
| `LOG_LEVEL` | Optional | Pino log level |

> Auth is Clerk + PostgreSQL roles. `JWT_SECRET` is legacy and not used.

---

## Admin Dashboard (`artifacts/admin-dashboard/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Vite dev port (`5000`) |
| `BASE_PATH` | Yes | Always `/` |
| `CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key |

---

## Patient / Doctor Apps (`.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key |
| `EXPO_PUBLIC_API_URL` | **Yes** | API base **without** `/api` |
| `EXPO_PUBLIC_LIVEKIT_URL` | Video | LiveKit WebSocket URL (fallback if API omits url) |

---

## Local setup checklist

1. Copy all `.env.example` → `.env` and fill values.
2. `pnpm install` from `platform/`.
3. Seed DB: `pnpm --filter @asaancare/api-server seed`.
4. Create Clerk users matching seed emails.
5. Clerk Dashboard → Webhook → `POST /api/webhooks/clerk`.
6. Appwrite Storage bucket + LiveKit project keys.

---

## Removed / not used

| Variable | Status |
|---|---|
| `SUPABASE_*` | Removed |
| `AGORA_*` | Removed — LiveKit replaces Agora |
| `JWT_SECRET` | Legacy |
