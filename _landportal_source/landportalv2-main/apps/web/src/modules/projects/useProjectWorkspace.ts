import { fetchProjectWorkspace, type ProjectWorkspace } from "@landportal/api-client";
import { useQuery } from "@tanstack/react-query";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export function getProjectWorkspace(projectId: string) {
  assertSupabaseConfigured();
  return fetchProjectWorkspace(supabase, projectId);
}

export function useProjectWorkspace(projectId: string) {
  return useQuery<ProjectWorkspace, Error>({
    queryKey: ["project-workspace", projectId],
    queryFn: () => getProjectWorkspace(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}
