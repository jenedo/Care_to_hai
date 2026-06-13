import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://elvllbybvmyjmvytfdlu.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseAnonKey) {
  console.warn("[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY not set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
