import { insertProject, fetchProjects } from "@landportal/api-client";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/modules/auth/authStore";

import type { CreateProjectValues } from "./projectSchemas";

export async function getProjects() {
  assertSupabaseConfigured();
  return fetchProjects(supabase);
}

export async function createProject(values: CreateProjectValues) {
  assertSupabaseConfigured();

  const currentUser = useAuthStore.getState().user;
  if (!currentUser) {
    throw new Error("You must be signed in to create projects");
  }

  return insertProject(supabase, {
    workspaceId: currentUser.workspaceId,
    ownerId: currentUser.id,
    name: values.name,
    description: values.description,
    location: values.location,
  });
}
