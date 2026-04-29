import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("LANDPORTAL_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? "";
const PROTECTED_EMAIL = "optimacycorp@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

type Role = "admin" | "editor" | "reviewer";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  workspace_id: string;
  role: Role;
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
};

type UserPayload = {
  userId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: Role;
  workspaceId?: string;
  workspaceName?: string;
  workspaceSlug?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function text(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: corsHeaders,
  });
}

function requireEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and LANDPORTAL_SERVICE_ROLE_KEY must be configured.");
  }
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRole(value: unknown): Role {
  return value === "admin" || value === "editor" || value === "reviewer" ? value : "reviewer";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "workspace";
}

async function getCallerProfile(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id,email,full_name,workspace_id,role")
    .eq("id", userData.user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    return null;
  }

  return profile;
}

function assertAdmin(profile: ProfileRow | null) {
  if (!profile || profile.role !== "admin") {
    throw new Response("Only workspace admins can manage users.", { status: 403, headers: corsHeaders });
  }
}

function makeAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureWorkspace(adminClient: ReturnType<typeof makeAdminClient>, caller: ProfileRow, payload: UserPayload) {
  if (payload.workspaceId) {
    return payload.workspaceId;
  }

  const workspaceName = payload.workspaceName?.trim() || "Land Portal Workspace";
  const workspaceSlug = payload.workspaceSlug?.trim() || slugify(workspaceName);

  const { data: existing, error: findError } = await adminClient
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .maybeSingle<{ id: string }>();

  if (findError) throw findError;
  if (existing?.id) return existing.id;

  if (!payload.workspaceName && !payload.workspaceSlug) {
    return caller.workspace_id;
  }

  const { data: created, error: createError } = await adminClient
    .from("workspaces")
    .insert({ name: workspaceName, slug: workspaceSlug })
    .select("id")
    .single<{ id: string }>();

  if (createError) throw createError;
  return created.id;
}

async function listUsers(adminClient: ReturnType<typeof makeAdminClient>, caller: ProfileRow) {
  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id,email,full_name,workspace_id,role")
    .order("email", { ascending: true })
    .returns<ProfileRow[]>();

  if (error) throw error;

  const workspaceScoped = profiles.filter((profile) => profile.workspace_id === caller.workspace_id || caller.email === PROTECTED_EMAIL);
  const workspaceIds = [...new Set(workspaceScoped.map((profile) => profile.workspace_id))];
  const { data: workspaces, error: workspaceError } = workspaceIds.length
    ? await adminClient
        .from("workspaces")
        .select("id,name,slug")
        .in("id", workspaceIds)
        .returns<WorkspaceRow[]>()
    : { data: [], error: null };

  if (workspaceError) throw workspaceError;

  const workspaceById = new Map((workspaces ?? []).map((workspace) => [workspace.id, workspace]));

  return {
    users: workspaceScoped.map((profile) => {
      const workspace = workspaceById.get(profile.workspace_id);
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        workspaceId: profile.workspace_id,
        workspaceName: workspace?.name ?? "Workspace",
        workspaceSlug: workspace?.slug ?? "",
        protected: profile.email.toLowerCase() === PROTECTED_EMAIL,
      };
    }),
  };
}

async function createUser(adminClient: ReturnType<typeof makeAdminClient>, caller: ProfileRow, payload: UserPayload) {
  const email = normalizeEmail(payload.email);
  const password = payload.password ?? "";
  const fullName = payload.fullName?.trim() || email;
  const role = normalizeRole(payload.role);
  const workspaceId = await ensureWorkspace(adminClient, caller, payload);

  if (!email) return text("Email is required.", 400);
  if (password.length < 8) return text("Password must be at least 8 characters.", 400);

  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = listData.users.find((user) => user.email?.toLowerCase() === email);

  let user = existing;

  if (!user) {
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) throw createError;
    user = created.user;
  }

  if (!user) throw new Error("Unable to create or locate auth user.");

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: user.id,
      email,
      full_name: fullName,
      workspace_id: workspaceId,
      role,
    });
  if (profileError) throw profileError;

  const { error: memberError } = await adminClient
    .from("workspace_members")
    .upsert({
      workspace_id: workspaceId,
      user_id: user.id,
      role,
    });
  if (memberError) throw memberError;

  return json({ ok: true, userId: user.id });
}

async function updateUser(adminClient: ReturnType<typeof makeAdminClient>, caller: ProfileRow, userId: string, payload: UserPayload) {
  if (!userId) return text("User id is required.", 400);

  const { data: existingProfile, error: existingError } = await adminClient
    .from("profiles")
    .select("id,email,workspace_id")
    .eq("id", userId)
    .single<{ id: string; email: string; workspace_id: string }>();
  if (existingError) throw existingError;

  if (existingProfile.workspace_id !== caller.workspace_id && caller.email !== PROTECTED_EMAIL) {
    return text("Cannot edit users outside your workspace.", 403);
  }

  const email = normalizeEmail(payload.email) || existingProfile.email;
  const fullName = payload.fullName?.trim();
  const role = normalizeRole(payload.role);
  const workspaceId = payload.workspaceId || existingProfile.workspace_id;

  const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, string> } = {};
  if (email !== existingProfile.email) authUpdate.email = email;
  if (payload.password) authUpdate.password = payload.password;
  if (fullName) authUpdate.user_metadata = { full_name: fullName };

  if (Object.keys(authUpdate).length) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate);
    if (authError) throw authError;
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      email,
      ...(fullName ? { full_name: fullName } : {}),
      workspace_id: workspaceId,
      role,
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  const { error: memberError } = await adminClient
    .from("workspace_members")
    .upsert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    });
  if (memberError) throw memberError;

  return json({ ok: true, userId });
}

async function deleteUser(adminClient: ReturnType<typeof makeAdminClient>, caller: ProfileRow, userId: string) {
  if (!userId) return text("User id is required.", 400);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,email,workspace_id")
    .eq("id", userId)
    .single<{ id: string; email: string; workspace_id: string }>();
  if (profileError) throw profileError;

  if (profile.email.toLowerCase() === PROTECTED_EMAIL) {
    return text("optimacycorp@gmail.com is protected and cannot be deleted.", 403);
  }

  if (profile.workspace_id !== caller.workspace_id && caller.email !== PROTECTED_EMAIL) {
    return text("Cannot delete users outside your workspace.", 403);
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw error;

  return json({ ok: true, userId });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    requireEnv();

    const caller = await getCallerProfile(request);
    assertAdmin(caller);

    const adminClient = makeAdminClient();
    const url = new URL(request.url);
    const route = url.pathname.replace(/^.*\/functions\/v1\/sysadmin-users/i, "") || "/";

    if (request.method === "GET") {
      return json(await listUsers(adminClient, caller!));
    }

    const payload = await request.json().catch(() => ({})) as UserPayload;

    if (request.method === "POST") {
      return await createUser(adminClient, caller!, payload);
    }

    if (request.method === "PATCH") {
      const userId = url.searchParams.get("userId") || payload.userId || route.replace(/^\/+/, "");
      return await updateUser(adminClient, caller!, userId, payload);
    }

    if (request.method === "DELETE") {
      const userId = url.searchParams.get("userId") || payload.userId || route.replace(/^\/+/, "");
      return await deleteUser(adminClient, caller!, userId);
    }

    return text("Method not allowed", 405);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return json(
      { error: error instanceof Error ? error.message : "Unexpected sysadmin-users error" },
      500,
    );
  }
});
