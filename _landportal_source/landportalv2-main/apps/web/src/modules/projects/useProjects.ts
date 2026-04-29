import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@landportal/api-client";

import type { CreateProjectValues } from "./projectSchemas";
import { createProject, getProjects } from "./projectSupabase";

export function useProjects() {
  return useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: getProjects,
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, CreateProjectValues>({
    mutationFn: async (values: CreateProjectValues) => createProject(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
