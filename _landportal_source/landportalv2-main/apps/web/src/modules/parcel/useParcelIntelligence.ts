import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createParcelSnapshot,
  fetchParcelIntelligence,
  runParcelAnalysis,
} from "@landportal/api-client";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export function useParcelIntelligence(parcelSnapshotId?: string) {
  return useQuery({
    queryKey: ["parcel-intelligence", parcelSnapshotId],
    queryFn: () => {
      if (!parcelSnapshotId) throw new Error("parcelSnapshotId is required");
      assertSupabaseConfigured();
      return fetchParcelIntelligence(supabase, parcelSnapshotId);
    },
    enabled: Boolean(parcelSnapshotId),
  });
}

export function useCreateParcelSnapshot(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Parameters<typeof createParcelSnapshot>[1]) => {
      assertSupabaseConfigured();
      return createParcelSnapshot(supabase, values);
    },
    onSuccess: async () => {
      if (!projectId) return;
      await queryClient.invalidateQueries({
        queryKey: ["project-development", projectId],
      });
    },
  });
}

export function useRunParcelAnalysis(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Parameters<typeof runParcelAnalysis>[1]) => {
      assertSupabaseConfigured();
      return runParcelAnalysis(supabase, values);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["parcel-intelligence", variables.parcelSnapshotId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["project-development", projectId],
      });
    },
  });
}
