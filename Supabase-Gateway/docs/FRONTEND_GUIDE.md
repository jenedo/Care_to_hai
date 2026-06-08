# FRONTEND_GUIDE.md — Admin Dashboard

## Stack

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 7
- **Styling:** Tailwind CSS v4 + Radix UI components
- **Routing:** wouter
- **Data fetching:** TanStack Query v5 (via generated hooks)
- **API client:** `@workspace/api-client-react` (generated from OpenAPI)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Charts:** (Recharts via dashboard)

---

## Running

```bash
cd Supabase-Gateway
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sahatghar-admin run dev
```

Vite proxies all `/api/*` requests to `http://localhost:3000`. The API server must be running.

---

## File Structure

```
artifacts/sahatghar-admin/src/
├── App.tsx              Router + protected route logic
├── main.tsx             React root, QueryClientProvider
├── contexts/
│   └── AuthContext.tsx  Auth state, login/logout functions
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Doctors.tsx / DoctorDetail.tsx
│   ├── Patients.tsx / PatientDetail.tsx
│   ├── Appointments.tsx
│   ├── Payments.tsx
│   ├── Refunds.tsx
│   ├── Payouts.tsx
│   ├── Subscriptions.tsx
│   ├── Support.tsx
│   ├── Reviews.tsx
│   ├── Clinics.tsx
│   ├── Notifications.tsx
│   ├── AdminUsers.tsx
│   ├── AuditLogs.tsx
│   └── Settings.tsx
├── components/
│   ├── AdminLayout.tsx  Sidebar + Topbar wrapper
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── ui/              Shared UI primitives (buttons, cards, tables, etc.)
└── lib/
    └── utils.ts         cn() utility, misc helpers
```

---

## Routing (wouter)

Defined in `App.tsx`. Pattern:

```tsx
<Switch>
  <Route path="/login" component={Login} />
  <ProtectedRoute path="/dashboard" component={Dashboard} />
  <ProtectedRoute path="/doctors/:id" component={DoctorDetail} />
  <ProtectedRoute path="/doctors" component={Doctors} />
  ...
</Switch>
```

`ProtectedRoute` checks `AuthContext` — redirects to `/login` if no user.

---

## Auth Context

**File:** `src/contexts/AuthContext.tsx`

```ts
interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}
```

- On mount: calls `GET /api/auth/me` with `credentials: "include"`
- Login: calls `POST /api/auth/login`
- Logout: calls `POST /api/auth/logout`
- All fetch calls use `credentials: "include"` to send cookies

---

## API Integration

Uses **generated TanStack Query hooks** from `@workspace/api-client-react`.

Example (Dashboard):
```tsx
const { data: stats } = useGetDashboardStats();
const { data: queue } = useGetVerificationQueue();
const { mutate: updateStatus } = useUpdateDoctorStatus();
```

Query keys are also generated — use them for cache invalidation:
```tsx
queryClient.invalidateQueries({ queryKey: getGetDoctorsQueryKey() });
```

If the OpenAPI spec changes, regenerate:
```bash
pnpm --filter @workspace/api-spec run generate
```

---

## Vite Config

**File:** `artifacts/sahatghar-admin/vite.config.ts`

Key settings:
- `host: "0.0.0.0"` — required for Replit preview
- `allowedHosts: true` — required for Replit proxy
- `proxy: { "/api": "http://localhost:3000" }` — forwards API calls to Express
- `PORT` and `BASE_PATH` env vars are required or Vite throws

---

## Adding a New Page

1. Create `src/pages/NewPage.tsx`
2. Add route in `App.tsx`:
   ```tsx
   <ProtectedRoute path="/new-page" component={NewPage} />
   ```
3. Add nav link in `Sidebar.tsx`
4. Use generated hooks from `@workspace/api-client-react` for data

---

## Alias Paths

Configured in `vite.config.ts` and `tsconfig.json`:

| Alias | Resolves to |
|---|---|
| `@` | `src/` |
| `@assets` | `../../attached_assets/` |

Usage:
```ts
import { Button } from "@/components/ui/button";
```
