---
name: Doctor app architecture
description: Key patterns for the doctor Expo app — routing, Agora guards, API base, auth
---

## Stack
- Expo SDK 54, React Native 0.81.5, expo-router (file-based)
- Tabs: Home / Appointments / Schedule / Earnings / Profile (5 tabs in `(tabs)/_layout.tsx`)
- Stack screens registered in root `app/_layout.tsx`: appointment/[id], consult/[id], video-call/[id], audio-call/[id], prescription/new, patient/[id], notifications

## API base
`const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? ""`
`EXPO_PUBLIC_AGORA_APP_ID` env var set for Agora.

## Agora (react-native-agora)
- Web guard required: `Platform.OS !== 'web'` + dynamic `require()` inside useEffect
- Token from `POST /api/agora/token` with `{ channelName, uid, role }`
- Agora App ID: env var `EXPO_PUBLIC_AGORA_APP_ID`

## Auth pattern (doctor app)
- `useAuth()` → `{ doctor, token }` from AuthContext
- Pass `Authorization: Bearer ${token}` header on all protected requests
- On server: `(req as any).doctorAuth.doctorId`

## Consultation types
- CHAT → 2-min timer (120s free), freeze on expiry, real-time poll every 3s
- VIDEO / AUDIO → launch video-call/[id] or audio-call/[id] via router.push

## Why:
Established over multiple sessions building the full doctor feature set.

## How to apply:
Follow these patterns when adding any new doctor-app screen or backend route.
