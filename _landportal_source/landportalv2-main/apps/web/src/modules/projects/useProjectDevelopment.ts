import { fetchProjectDevelopment, insertSubdivisionLayout, insertYieldScenario, type CreateSubdivisionLayoutInput, type CreateYieldScenarioInput, type ProjectDevelopmentData, type SubdivisionLayout, type YieldScenario } from "@landportal/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export function getProjectDevelopment(projectId: string) {
  assertSupabaseConfigured();
  return fetchProjectDevelopment(supabase, projectId);
}

export function useProjectDevelopment(projectId: string) {
  return useQuery<ProjectDevelopmentData, Error>({
    queryKey: ["project-development", projectId],
    queryFn: () => getProjectDevelopment(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useCreateSubdivisionLayout(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<SubdivisionLayout, Error, CreateSubdivisionLayoutInput>({
    mutationFn: async (values) => {
      assertSupabaseConfigured();
      return insertSubdivisionLayout(supabase, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useCreateYieldScenario(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<YieldScenario, Error, CreateYieldScenarioInput>({
    mutationFn: async (values) => {
      assertSupabaseConfigured();
      return insertYieldScenario(supabase, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}
