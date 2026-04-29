import { createBrowserSupabaseClient } from "@landportal/auth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createBrowserSupabaseClient({
  url: supabaseUrl || "https://example.supabase.co",
  anonKey: supabaseAnonKey || "public-anon-key",
});

export function assertSupabaseConfigured() {
  if (!hasSupabaseEnv) {
    throw new Error("Supabase environment is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}
