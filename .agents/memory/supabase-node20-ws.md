---
name: ws package required for Supabase on Node 20
description: @supabase/realtime-js throws on Node <22 without a ws transport.
---

`@supabase/realtime-js` checks for native WebSocket at module load time.
On Node.js 20 (no native WebSocket), it throws:
  `Error: Node.js 20 detected without native WebSocket support.`

**Fix in `platform/artifacts/api-server/src/lib/supabase.ts`:**
```ts
import ws from "ws";
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
});
```

**Why:** The `ws` npm package provides the WebSocket implementation. Must be
installed as a direct dependency: `pnpm --filter @asaancare/api-server add ws`.

**How to apply:** Any backend (Node.js <22) Supabase client must pass `ws` as
`realtime.transport`. This does not affect mobile apps (they run in React Native/browser).
