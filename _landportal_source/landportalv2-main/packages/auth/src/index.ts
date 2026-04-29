import { createClient } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  role: "admin" | "editor" | "reviewer";
};

type BrowserSupabaseOptions = {
  url: string;
  anonKey: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  workspace_id: string;
  role: "admin" | "editor" | "reviewer";
};

type WorkspaceRow = {
  id: string;
  name: string;
};

export function createBrowserSupabaseClient({ anonKey, url }: BrowserSupabaseOptions) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function formatAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message.includes("VITE_SUPABASE_URL") || error.message.includes("VITE_SUPABASE_ANON_KEY")) {
      return "Authentication is not configured yet. Add the Supabase URL and anon key before signing in.";
    }

    if (error.message.toLowerCase().includes("network") || error.message.toLowerCase().includes("fetch")) {
      return "The authentication service could not be reached. Check your network connection and Supabase project status.";
    }

    return error.message;
  }

  return fallback;
}

export async function fetchWorkspaceProfile(supabase: ReturnType<typeof createBrowserSupabaseClient>, userId: string): Promise<AuthUser> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,workspace_id,role")
    .eq("id", userId)
    .single<ProfileRow>();

  if (profileError || !profile) {
    throw new Error("Your login exists, but no workspace profile was found. Run the Supabase seed step for this user.");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id,name")
    .eq("id", profile.workspace_id)
    .single<WorkspaceRow>();

  if (workspaceError || !workspace) {
    throw new Error("Your workspace record is missing or inaccessible. Check the workspace seed and RLS setup.");
  }

  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    workspaceId: profile.workspace_id,
    workspaceName: workspace.name,
    role: profile.role,
  };
}
