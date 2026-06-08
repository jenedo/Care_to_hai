# SahatGhar / AsaanCare

Telemedicine administration platform for Pakistan. صحت آپکے گھر

Full documentation: `Supabase-Gateway/docs/`

## Stack

- Admin frontend: Vite + React + TypeScript (port 5000)
- API server: Express + TypeScript (port 3000)
- Database: PostgreSQL (Replit managed)
- ORM: Drizzle ORM
- Package manager: pnpm (monorepo under `Supabase-Gateway/`)
- Doctor app: Expo / React Native (not served from Replit)
- Password hashing: bcryptjs (pure JS — do NOT use bcrypt)

## User preferences

- Do not start the patient app until explicitly approved.
- Do not migrate Vite → Next.js without explicit approval.
- Do not migrate Express → NestJS without explicit approval.
- Do not migrate Drizzle → Prisma without explicit approval.
- Do not replace bcryptjs with bcrypt — bcrypt fails native compilation on Replit/Linux.
- Keep the current working stack stable; do not rewrite what works.
- Do not call something "complete" unless end-to-end tested.
- Do not leave mock data in backend routes (subscriptions route is known exception — tracked in KNOWN_ISSUES.md).
- After each phase of work, briefly report what changed and continue to the next required phase.
- Priority order: admin site → API/DB → doctor app → patient app (last).
- If something is partial, say partial — do not oversell status.
- If there is a real blocker or important architectural choice, ask before proceeding.

## Dev Credentials (never use in production)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@sahatghar.pk | SahatGhar@2025! |
| Admin | admin@sahatghar.pk | SahatGhar@2025! |
| Finance | finance@sahatghar.pk | SahatGhar@2025! |
| Support | support@sahatghar.pk | SahatGhar@2025! |
| Verifier | verifier@sahatghar.pk | SahatGhar@2025! |
| Doctor | ayesha.noor@sahatghar.pk | Doctor@2025! |
