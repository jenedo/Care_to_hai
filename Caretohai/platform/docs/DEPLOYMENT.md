# AsaanCare — Deployment Guide

> This guide covers production deployment. For local dev setup, see `LOCAL_SETUP.md`.

---

## Recommended Production Stack

| Layer | Service | Why |
|---|---|---|
| Database | **Neon** (serverless PostgreSQL) | Free tier generous, auto-scales, no server management, works from anywhere. Use DO Managed PostgreSQL ($15/mo) if you need dedicated resources. |
| API Server | **Digital Ocean App Platform** | Push from git, auto-deploy, $5-12/mo. Node.js buildpack. Uses your $200 DO credit. |
| Admin Frontend | **Digital Ocean App Platform** (static site) | Same platform, deploy the built Vite SPA. Free for static. |
| File Storage | **Appwrite** (Team subscription) | For doctor CNIC/degree document uploads. You already have the subscription. |
| Mobile Apps | **Expo EAS Build** | Build and submit iOS/Android binaries. |
| Auth (future) | **Clerk** (Pro subscription) | You already have it. Replace custom JWT when ready. |
| Email | **Resend** or **SendGrid** | For OTP, password reset, appointment confirmations. |
| SMS (Pakistan) | **Jazz / Telenor API** or **Twilio** | For SMS OTP (Pakistani numbers). |

---

## Environment Variables Required

Set these in your hosting provider's environment/secrets panel. Never commit them.

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/asaancare
JWT_SECRET=<64-character random string — see below>
NODE_ENV=production
PORT=3000

# Optional (for future integrations)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your project id>
APPWRITE_API_KEY=<your api key>
CLERK_SECRET_KEY=<from Clerk dashboard>
RESEND_API_KEY=<from Resend dashboard>
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Option A — Digital Ocean App Platform (Recommended)

**Prerequisites:** DO account with $200 credit, GitHub repo connected.

### Step 1: Create Neon Database

1. Sign up at [neon.tech](https://neon.tech) (free)
2. Create project → region: `aws-ap-south-1` (Mumbai, closest to Pakistan)
3. Copy the connection string: `postgresql://user:password@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require`

### Step 2: Deploy API Server

1. Go to Digital Ocean → App Platform → Create App
2. Connect your GitHub repo
3. Source directory: `platform/artifacts/api-server`
4. Build command: `cd ../../.. && pnpm install && pnpm --filter @asaancare/api-server run build`
5. Run command: `node dist/index.js`
6. Port: `3000`
7. Add environment variables (DATABASE_URL, JWT_SECRET, NODE_ENV=production, PORT=3000)
8. Deploy

### Step 3: Run Migrations + Seed

After first deploy:
```bash
# SSH into the container or use DO console
cd platform
DATABASE_URL=<your neon url> pnpm --filter @asaancare/db run push
DATABASE_URL=<your neon url> pnpm --filter @asaancare/api-server run seed
```

### Step 4: Deploy Admin Frontend

1. App Platform → Add Component → Static Site
2. Source: `platform/artifacts/admin-dashboard`
3. Build command: `cd ../../.. && pnpm install && pnpm --filter @asaancare/admin-dashboard run build`
4. Output directory: `dist`
5. Set environment variable: `VITE_API_URL=https://your-api-app.ondigitalocean.app`

> Update `vite.config.ts` proxy target to use `VITE_API_URL` in production instead of `localhost:3000`.

---

## Option B — Single Droplet (Full Control)

For maximum control and lower cost:

```bash
# 1. Create DO Droplet: Ubuntu 22.04, 2GB RAM, $12/month

# 2. SSH in and set up
apt update && apt install -y nodejs npm nginx
npm install -g pnpm pm2

# 3. Clone repo and install
git clone https://github.com/yourorg/asaancare.git
cd asaancare/platform
pnpm install --frozen-lockfile

# 4. Build API
pnpm --filter @asaancare/api-server run build

# 5. Build admin
pnpm --filter @asaancare/admin-dashboard run build

# 6. Start API with PM2
PORT=3000 DATABASE_URL=... JWT_SECRET=... pm2 start artifacts/api-server/dist/index.js --name asaancare-api
pm2 save && pm2 startup

# 7. Serve admin with Nginx
# Copy artifacts/admin-dashboard/dist to /var/www/asaancare-admin
# Configure nginx to serve it + proxy /api to localhost:3000
```

**Nginx config example:**
```nginx
server {
    server_name admin.asaancare.pk;
    root /var/www/asaancare-admin;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Mobile App Deployment (Expo EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure builds (first time)
cd platform/artifacts/patient-app
eas build:configure

# Build for both platforms
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**Before building mobile apps:**
1. Update API base URL in `contexts/AuthContext.tsx` and all `fetch()` calls from `localhost:3000` to your production API URL.
2. Set up `app.json` with production bundle identifiers (`pk.asaancare.patient` and `pk.asaancare.doctor`).

---

## CORS Configuration (Production)

Update `artifacts/api-server/src/app.ts` CORS origin for production:

```typescript
cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://admin.asaancare.pk"]
    : ["http://localhost:5000", "http://localhost:19006"],
  credentials: true,
})
```

---

## SSL / TLS

- **Digital Ocean App Platform:** SSL is automatic (Let's Encrypt).
- **Droplet:** Use `certbot` with nginx: `certbot --nginx -d admin.asaancare.pk -d api.asaancare.pk`
- **Mobile apps:** Expo apps already use HTTPS for all API calls.

---

## Production Checklist

Before going live:

- [ ] `JWT_SECRET` is set to a random 64-char string (not the dev default)
- [ ] `DATABASE_URL` points to production database
- [ ] `NODE_ENV=production` is set
- [ ] CORS origin is restricted to your actual domain
- [ ] Admin credentials changed from dev defaults
- [ ] SSL certificate active on all public endpoints
- [ ] Database backups configured (Neon: automatic; DO: enable weekly backups)
- [ ] File upload storage configured (Appwrite) for doctor documents
- [ ] Seed script has been run on production DB
- [ ] Rate limiting added to auth endpoints (`express-rate-limit`)
- [ ] Error tracking configured (Sentry recommended)

---

## Why Not Supabase?

Supabase is an excellent platform, but this project does not use it:

- The project uses PostgreSQL with Drizzle ORM (Replit managed in dev, Neon/Digital Ocean in prod)
- Auth is custom JWT — no third-party auth provider dependency
- Migrating to Supabase would require replacing Drizzle with Supabase client, rewriting auth, and restructuring storage — no functional benefit given current architecture

---

## Why Not Azure?

Azure is excellent enterprise infrastructure but:
- Overkill for current scale (100–10,000 concurrent users)
- Higher cost than DO/Neon for same resources
- More complex configuration (AKS, App Service, Azure DB for PostgreSQL all require significant DevOps knowledge)
- Use Azure when you need: HIPAA compliance hosting, enterprise SLAs, or when a client contract requires Azure

**Recommendation:** Start with Digital Ocean ($200 credit covers 12+ months). Migrate to Azure when monthly revenue exceeds Rs. 5,00,000 and you need enterprise compliance.
