# AsaanCare — Architectural Decisions Log

> This file records *why* major technical decisions were made. Future developers must read this before proposing alternatives. Each entry includes the decision, the reason, and the consequence of reversing it.

---

## DEC-001 · bcryptjs instead of bcrypt

**Decision:** Use `bcryptjs` (pure JS) everywhere. Never install `bcrypt`.

**Why:** `bcrypt@6` requires native compilation via `node-gyp`. Replit/Linux and most containerized environments don't have the required `libssl-dev` and build toolchain pre-installed. The build fails silently or loudly depending on the environment.

**bcryptjs** is a pure JavaScript port with identical API (`bcrypt.hash`, `bcrypt.compare`, `bcrypt.genSalt`). No native code. No build step.

**Consequence of reversal:** Every environment (Replit, CI, Docker) will need `libssl-dev` + `build-essential` in the OS layer. Not worth it for zero functional difference.

---

## DEC-002 · Drizzle ORM instead of Prisma

**Decision:** Use Drizzle ORM with raw PostgreSQL SQL style.

**Why:** Drizzle generates zero-overhead SQL at build time. Prisma has a heavyweight binary (`prisma generate`, query engine), migration files that are easy to get out of sync, and does not support the `drizzle-kit push` shortcut for rapid schema iteration during development.

Drizzle's schema is just TypeScript — readable, portable, and directly used for type inference. No separate codegen step needed for types.

**Consequence of reversal:** Prisma migration would require converting all schema files, all query calls, and adding the Prisma binary to every deployment environment.

---

## DEC-003 · Express instead of NestJS

**Decision:** Use Express + TypeScript. Do not migrate to NestJS.

**Why:** NestJS adds ~40MB of framework overhead, requires decorators, and has a steep learning curve for Pakistani remote developers (the likely hiring pool). Express is simpler, easier to debug, and faster to iterate on.

The API is well-structured without a framework — one route file per domain, shared middlewares, and a consistent error pattern via `AppError` classes.

**Consequence of reversal:** Full rewrite of all routes, middlewares, and error handling. No functional benefit for an app at this scale.

---

## DEC-004 · Vite + React instead of Next.js (Admin)

**Decision:** Admin frontend is a Vite SPA, not Next.js.

**Why:** The admin panel is authenticated behind a login wall. There is no SEO requirement. SSR adds deployment complexity (you need a Node.js server, not just a CDN). Vite + React is simpler to deploy as a static build behind the Express API.

**Consequence of reversal:** Full rebuild of the admin frontend. No benefit since the admin is not public-facing.

---

## DEC-005 · Custom JWT Auth instead of Clerk/Supabase Auth

**Decision:** Auth is implemented with custom JWT signed by `JWT_SECRET`, bcryptjs hashing.

**Why (at time of decision):** Fastest path to a working system with full control over token shape, cookie configuration, and multi-role auth (admin cookie + doctor bearer + patient bearer are all different schemes).

**Known limitation:** This approach requires building session management, token rotation, MFA, and account recovery from scratch.

**Recommended future migration:** Migrate to **Clerk** (team already has a Pro subscription). Clerk handles MFA, session device tracking, email verification, and webhook-based user sync. The migration path: keep the existing `doctors` and `patients` tables but add `clerk_user_id` column; replace `POST /auth/login` with Clerk frontend components; validate Clerk session tokens in the API middleware instead of custom JWT.

---

## DEC-006 · Route Mounting Order is Fixed

**Decision:** Mobile-facing routes MUST be mounted BEFORE admin routers in `routes/index.ts`.

**Why:** Express `router.use(middleware)` without a path prefix runs the middleware for ALL requests passing through, not just routes defined in that router. Admin routers use `router.use(requireAuth)` which rejects requests with doctor/patient tokens. If a doctor route were mounted after an admin router, the admin auth middleware would intercept and reject the doctor request.

**Rule:** Any new route file that uses admin auth (`requireAuth`) must be mounted AFTER all mobile-facing routes. Any route file that needs to be accessible without admin auth must be mounted in the first block.

See `ARCHITECTURE.md` for the exact mount order.

---

## DEC-007 · pnpm Workspaces (Monorepo)

**Decision:** Single pnpm workspace under `platform/` with a shared version catalog.

**Why:** The admin, patient app, and doctor app share the `@asaancare/db` schema package and optionally `@asaancare/api-zod` types. A monorepo avoids copy-pasting types and ensures all packages reference the same database schema.

**Consequence of breaking into separate repos:** Need to publish shared packages to npm (or a private registry), add versioning, and keep versions in sync across repos. Not worth it at this scale.

---

## DEC-008 · Monorepo Root Directory `platform/`

**Decision:** All application code lives under the `platform/` directory at the repository root.

**Why:** Keeps the repo root clean (README, CI, Replit config) while grouping the pnpm workspace — API, admin dashboard, mobile apps, and shared libraries — under one professional, descriptive folder name.

**Package scope:** Internal packages use the `@asaancare/*` npm scope (e.g. `@asaancare/api-server`, `@asaancare/admin-dashboard`, `@asaancare/db`).

---

## DEC-009 · Subscription Plans in PostgreSQL

**Decision:** Plans stored in `subscription_plans` table with a `features` JSONB column.

**Why:** Plans have structured features (chat session counts, video session counts, max members) that vary per plan. JSONB allows flexible schema for plan features without adding 10 separate boolean/integer columns to the table. The `features` object is read directly by both the API and mobile apps.

**Plan structure:**
```json
{
  "tier": "STANDARD",
  "badge": "Most Popular",
  "payPerUse": false,
  "maxMembers": 1,
  "chatSessions": 2,
  "audioSessions": 1,
  "videoSessions": 1,
  "features": ["2 chat + 1 audio + 1 video/month", "Full medical records vault", "..."]
}
```

---

## DEC-010 · Free Trial: One Session Per Week (not per lifetime)

**Decision:** Free trial = 1 free consultation per patient per calendar week (Monday–Sunday), tracked in `free_trial_records` table.

**Why:** Per-lifetime free trials incentivize account farming (new account per consultation). Weekly resets keep the platform usable for genuine free-tier patients while limiting abuse. The week boundary is computed as `Monday 00:00 UTC` to make it consistent across timezones.

**Enforcement location:** `POST /api/consultations` in `consultations.ts` — checks `free_trial_records` for current patient + current weekStart before creating a session.
