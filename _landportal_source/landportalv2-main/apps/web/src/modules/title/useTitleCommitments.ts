import {
  createTitleCommitmentReference,
  createProjectDocument,
  createTitleCommitment,
  deleteTitleCommitment,
  deleteTitleCommitmentReference,
  fetchTitleWorkspace,
  linkDocumentToTitleCommitment,
  markTitleCommitmentReferenceVisited,
  setPrimaryTitleCommitment,
  unlinkTitleDocumentFromCommitment,
  updateTitleCommitment,
  updateTitleCommitmentReference,
  updateTitleCommitmentPrimaryDocument,
  type CreateTitleCommitmentReferenceInput,
  type CreateProjectDocumentInput,
  type CreateTitleCommitmentInput,
  type UpdateTitleCommitmentInput,
  type UpdateTitleCommitmentReferenceInput,
  type LinkTitleDocumentInput,
  type MarkTitleReferenceVisitedInput,
  type TitleWorkspaceData,
} from "@landportal/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  importTitleCommitment,
  retryTitleReferenceFetch,
  type ImportTitleCommitmentInput,
  type RetryTitleReferenceFetchInput,
} from "@/modules/title/titleCommitmentImportService";

export function useTitleWorkspace(projectId: string) {
  return useQuery<TitleWorkspaceData, Error>({
    queryKey: ["title-workspace", projectId],
    queryFn: () => {
      assertSupabaseConfigured();
      return fetchTitleWorkspace(supabase, projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useCreateProjectDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateProjectDocumentInput) => {
      assertSupabaseConfigured();
      return createProjectDocument(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
    },
  });
}

export function useCreateTitleCommitment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateTitleCommitmentInput) => {
      assertSupabaseConfigured();
      return createTitleCommitment(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useUpdateTitleCommitment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateTitleCommitmentInput) => {
      assertSupabaseConfigured();
      return updateTitleCommitment(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useSetPrimaryTitleCommitment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: { titleCommitmentId: string }) => {
      assertSupabaseConfigured();
      return setPrimaryTitleCommitment(supabase, { projectId, titleCommitmentId: values.titleCommitmentId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useLinkTitleDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LinkTitleDocumentInput) => {
      assertSupabaseConfigured();
      return linkDocumentToTitleCommitment(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useUpdateTitleCommitmentPrimaryDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: { titleCommitmentId: string; primaryDocumentId: string }) => {
      assertSupabaseConfigured();
      return updateTitleCommitmentPrimaryDocument(supabase, values.titleCommitmentId, values.primaryDocumentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useCreateTitleCommitmentReference(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateTitleCommitmentReferenceInput) => {
      assertSupabaseConfigured();
      return createTitleCommitmentReference(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useUpdateTitleCommitmentReference(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateTitleCommitmentReferenceInput) => {
      assertSupabaseConfigured();
      return updateTitleCommitmentReference(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useMarkTitleCommitmentReferenceVisited(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MarkTitleReferenceVisitedInput) => {
      assertSupabaseConfigured();
      return markTitleCommitmentReferenceVisited(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useDeleteTitleCommitmentReference(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceId: string) => {
      assertSupabaseConfigured();
      return deleteTitleCommitmentReference(supabase, referenceId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useUnlinkTitleDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => {
      assertSupabaseConfigured();
      return unlinkTitleDocumentFromCommitment(supabase, linkId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useDeleteTitleCommitment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (titleCommitmentId: string) => {
      assertSupabaseConfigured();
      return deleteTitleCommitment(supabase, projectId, titleCommitmentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useDeleteTitleCommitmentCascade(projectId: string) {
  return useDeleteTitleCommitment(projectId);
}

export function useImportTitleCommitment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Omit<ImportTitleCommitmentInput, "supabase" | "projectId">) => {
      assertSupabaseConfigured();
      return importTitleCommitment({
        ...values,
        supabase,
        projectId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useRetryTitleReferenceFetch(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Omit<RetryTitleReferenceFetchInput, "supabase" | "projectId">) => {
      assertSupabaseConfigured();
      return retryTitleReferenceFetch({
        ...values,
        supabase,
        projectId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["title-workspace", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-development", projectId] });
    },
  });
}

export function useTitleCommitmentImportStatus(projectId: string, titleCommitmentId?: string | null) {
  return useQuery({
    queryKey: ["title-import-status", projectId, titleCommitmentId],
    queryFn: async () => {
      assertSupabaseConfigured();
      const workspace = await fetchTitleWorkspace(supabase, projectId);
      const importJob = titleCommitmentId
        ? workspace.importJobs.find((entry) => entry.titleCommitmentId === titleCommitmentId) ?? null
        : null;

      return {
        importJob,
        linkedReferences: titleCommitmentId
          ? workspace.references.filter((entry) => entry.titleCommitmentId === titleCommitmentId)
          : [],
      };
    },
    enabled: Boolean(projectId && titleCommitmentId),
    staleTime: 10_000,
  });
}
