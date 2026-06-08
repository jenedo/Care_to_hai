# DOCTOR_APP_GUIDE.md

## Stack

- **Framework:** Expo / React Native
- **Routing:** expo-router (file-based)
- **Auth:** JWT stored in AsyncStorage
- **Data fetching:** TanStack Query v5 (via `@workspace/api-client-react`)
- **Language:** TypeScript

---

## Status

The doctor app exists and compiles. It is **not served from Replit** (React Native runs on a device/emulator or via Expo Go). The admin frontend and API server are the priority.

Do not start implementing new doctor app features until:
1. All API routes use real PostgreSQL (done for most, subscriptions pending)
2. RBAC is confirmed complete
3. Doctor verification workflow is fully tested
4. Full admin system is stable

---

## File Structure

```
artifacts/doctor-app/
├── app/
│   ├── _layout.tsx          Root: fonts, QueryClient, AuthProvider, AuthGuard
│   ├── login.tsx            Login screen
│   └── (tabs)/
│       ├── _layout.tsx      Tab bar definition
│       ├── index.tsx        Home: stats + consultation requests
│       ├── appointments.tsx Appointment list with status filters
│       ├── availability.tsx Schedule management
│       └── profile.tsx      Doctor profile
│   └── appointment/
│       └── [id].tsx         Appointment detail screen
├── contexts/
│   └── AuthContext.tsx      JWT AsyncStorage auth
├── app.json                 Expo config
└── metro.config.js          Metro bundler config
```

---

## Auth Flow

**File:** `contexts/AuthContext.tsx`

```ts
// Token key in AsyncStorage
const TOKEN_KEY = "sahatghar_doctor_token";

// On app launch
AsyncStorage.getItem(TOKEN_KEY) → call GET /api/auth/doctor/me
→ if valid: set doctor state
→ if invalid/missing: show login screen

// Login
POST /api/auth/doctor/login
→ store token in AsyncStorage
→ set doctor state

// Logout
AsyncStorage.removeItem(TOKEN_KEY)
→ clear doctor state
```

All API calls include: `Authorization: Bearer <token>`

---

## API Base URL

Set in `app/_layout.tsx` via `setBaseUrl` from `@workspace/api-client-react`. In development, this points to the Replit API server URL (not localhost, since the device/emulator needs the public URL).

---

## Running the Doctor App

The doctor app is an Expo app — it cannot be previewed in the Replit browser pane.

To run locally:
```bash
cd Supabase-Gateway/artifacts/doctor-app
pnpm install
npx expo start
```

Then:
- Scan QR code with Expo Go app on your phone
- Or press `a` for Android emulator, `i` for iOS simulator

---

## Screens

### Home (`(tabs)/index.tsx`)
- Shows stats: Pending, Today's appointments, Earned
- Lists consultation requests (pending appointments)
- Uses: `useListAppointments()`, `useGetAppointmentStats()`

### Appointments (`(tabs)/appointments.tsx`)
- Full list with status filter tabs: All, Pending, Confirmed, Completed, Cancelled
- Uses: `useListAppointments({ status })`

### Availability (`(tabs)/availability.tsx`)
- Doctor sets their weekly availability schedule
- Time slots per day, consultation type (online/clinic)

### Profile (`(tabs)/profile.tsx`)
- Doctor profile info, edit settings

### Appointment Detail (`appointment/[id].tsx`)
- Full appointment info
- Accept/reject/complete actions
- Uses: `useGetAppointment(id)`, `useUpdateAppointment()`

---

## Connecting to Real Backend

The doctor app already uses `@workspace/api-client-react` generated hooks. These call the same API server as the admin frontend. The key difference is authentication method (Bearer token vs cookie).

Ensure the API server's doctor routes return appropriate data and that the doctor can only see their own appointments/patients.

---

## Known Gaps (to be completed)

- Doctor verification status display in app (show if pending/rejected)
- Payout request from doctor app
- Real availability slot management saving to DB
- Push notifications (not implemented)
