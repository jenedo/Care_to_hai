import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.SUPABASE_URL ?? `https://elvllbybvmyjmvytfdlu.supabase.co`;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.warn("[supabase] SUPABASE_SERVICE_ROLE_KEY not set — mobile OTP auth will fail");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
});

/**
 * Verify a Supabase JWT token from the mobile app.
 * Returns the Supabase user, or throws if invalid.
 */
export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error(error?.message ?? "Invalid or expired token");
  }
  return data.user;
}
