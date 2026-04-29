import { supabase } from "@/lib/supabase";

export type SysadminRole = "admin" | "editor" | "reviewer";

export type SysadminUser = {
  id: string;
  email: string;
  fullName: string;
  role: SysadminRole;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  protected: boolean;
};

export type SysadminUserInput = {
  email: string;
  password?: string;
  fullName: string;
  role: SysadminRole;
  workspaceName?: string;
  workspaceSlug?: string;
  workspaceId?: string;
};

function readFunctionError(error: unknown) {
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : null;
  if (context instanceof Response) {
    return context.text().catch(() => "Unable to complete sysadmin request.");
  }
  if (error instanceof Error) return error.message;
  return "Unable to complete sysadmin request.";
}

async function throwFunctionError(error: unknown) {
  const message = await readFunctionError(error);
  throw new Error(message);
}

export async function listSysadminUsers() {
  const { data, error } = await supabase.functions.invoke<{ users: SysadminUser[] }>("sysadmin-users", {
    method: "GET",
  });

  if (error) await throwFunctionError(error);
  return data?.users ?? [];
}

export async function createSysadminUser(input: SysadminUserInput) {
  const { error } = await supabase.functions.invoke("sysadmin-users", {
    method: "POST",
    body: input,
  });

  if (error) await throwFunctionError(error);
}

export async function updateSysadminUser(userId: string, input: SysadminUserInput) {
  const { error } = await supabase.functions.invoke("sysadmin-users", {
    method: "PATCH",
    body: { ...input, userId },
  });

  if (error) await throwFunctionError(error);
}

export async function deleteSysadminUser(userId: string) {
  const { error } = await supabase.functions.invoke("sysadmin-users", {
    method: "DELETE",
    body: { userId },
  });

  if (error) await throwFunctionError(error);
}
