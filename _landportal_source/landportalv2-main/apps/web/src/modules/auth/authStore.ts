import { create } from "zustand";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { fetchWorkspaceProfile, type AuthUser } from "@landportal/auth";

import { assertSupabaseConfigured, hasSupabaseEnv, supabase } from "@/lib/supabase";

type AuthState = {
  user: AuthUser | null;
  session: Session | null;
  isInitialized: boolean;
  isAuthenticating: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

let authSubscriptionBound = false;

async function loadProfile(userId: string) {
  assertSupabaseConfigured();
  return fetchWorkspaceProfile(supabase, userId);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isAuthenticating: false,
  initialize: async () => {
    if (get().isAuthenticating || get().isInitialized) {
      return;
    }

    set({ isAuthenticating: true });

    try {
      assertSupabaseConfigured();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!authSubscriptionBound) {
        supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
          if (!nextSession) {
            set({ user: null, session: null, isInitialized: true, isAuthenticating: false });
            return;
          }

          void loadProfile(nextSession.user.id)
            .then((user) => {
              set({ user, session: nextSession, isInitialized: true, isAuthenticating: false });
            })
            .catch(() => {
              set({ user: null, session: nextSession, isInitialized: true, isAuthenticating: false });
            });
        });
        authSubscriptionBound = true;
      }

      if (!session) {
        set({ user: null, session: null, isInitialized: true, isAuthenticating: false });
        return;
      }

      const user = await loadProfile(session.user.id);
      set({ user, session, isInitialized: true, isAuthenticating: false });
    } catch {
      set({ user: null, session: null, isInitialized: true, isAuthenticating: false });
    }
  },
  login: async (email, password) => {
    assertSupabaseConfigured();
    set({ isAuthenticating: true });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      set({ isAuthenticating: false });
      throw new Error(error?.message ?? "Unable to sign in");
    }

    const user = await loadProfile(data.user.id);
    set({ user, session: data.session, isInitialized: true, isAuthenticating: false });
  },
  logout: async () => {
    if (hasSupabaseEnv) {
      await supabase.auth.signOut();
    }

    set({ user: null, session: null, isInitialized: true, isAuthenticating: false });
  },
}));
