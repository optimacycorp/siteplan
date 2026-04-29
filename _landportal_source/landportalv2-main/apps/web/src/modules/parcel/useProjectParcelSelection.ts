import {
  deleteParcelSnapshot,
  deleteProjectParcelSelectionBySnapshot,
  fetchProjectParcelSelections,
  fetchProjectParcelSelection,
  upsertProjectParcelSelection,
  type UpsertProjectParcelSelectionInput,
} from "@landportal/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export function useProjectParcelSelection(projectId: string) {
  return useQuery({
    queryKey: ["project-parcel-selection", projectId],
    queryFn: () => {
      assertSupabaseConfigured();
      return fetchProjectParcelSelection(supabase, projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useProjectParcelSelections(projectId: string) {
  return useQuery({
    queryKey: ["project-parcel-selections", projectId],
    queryFn: () => {
      assertSupabaseConfigured();
      return fetchProjectParcelSelections(supabase, projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useUpsertProjectParcelSelection(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpsertProjectParcelSelectionInput) => {
      assertSupabaseConfigured();
      return upsertProjectParcelSelection(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-parcel-selection", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-parcel-selections", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useDeleteProjectParcelSnapshot(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: { parcelSnapshotId: string }) => {
      assertSupabaseConfigured();
      await deleteProjectParcelSelectionBySnapshot(supabase, {
        projectId,
        parcelSnapshotId: values.parcelSnapshotId,
      });
      await deleteParcelSnapshot(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-parcel-selection", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-parcel-selections", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}
