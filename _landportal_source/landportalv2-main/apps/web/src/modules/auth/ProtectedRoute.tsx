import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "@/components/feedback/LoadingState";
import { hasSupabaseEnv } from "@/lib/supabase";

import { useAuthStore } from "./authStore";

export function ProtectedRoute() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);

  useEffect(() => {
    if (!hasSupabaseEnv || isInitialized || isAuthenticating) {
      return;
    }

    void initialize();
  }, [initialize, isAuthenticating, isInitialized]);

  if (!hasSupabaseEnv) {
    return <LoadingState message="Authentication is not configured. Add the Supabase URL and anon key to continue." />;
  }

  if (!isInitialized || isAuthenticating) {
    return <LoadingState message="Checking your session..." />;
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth/login" />;
  }

  return <Outlet />;
}
