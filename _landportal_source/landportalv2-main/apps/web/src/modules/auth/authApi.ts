import { formatAuthErrorMessage } from "@landportal/auth";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export function resetPasswordRequest(email: string) {
  assertSupabaseConfigured();

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  });
}

export async function updatePassword(password: string) {
  assertSupabaseConfigured();

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(formatAuthErrorMessage(error, "Unable to update your password"));
  }
}
