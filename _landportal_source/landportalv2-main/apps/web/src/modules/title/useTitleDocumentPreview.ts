import { useMemo, useState } from "react";

import type { ProjectDocumentRecord } from "@landportal/api-client";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export function useTitleDocumentPreview(uploadedDocuments: ProjectDocumentRecord[]) {
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const previewDocument = useMemo(
    () => uploadedDocuments.find((document) => document.id === previewDocumentId) ?? null,
    [previewDocumentId, uploadedDocuments],
  );

  function closePreviewModal() {
    setPreviewModalOpen(false);
    setPreviewLoading(false);
    setPreviewError("");
    setPreviewUrl("");
  }

  function openPreviewModal() {
    if (!previewDocumentId) return;
    setPreviewModalOpen(true);
  }

  async function openStoredDocument(documentId: string) {
    const targetDocument = uploadedDocuments.find((entry) => entry.id === documentId) ?? null;
    if (!targetDocument?.storagePath && !targetDocument?.externalReference) {
      setPreviewError("This document does not have a stored file path yet.");
      setPreviewDocumentId(documentId);
      setPreviewUrl("");
      setPreviewModalOpen(true);
      return;
    }

    setPreviewDocumentId(documentId);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewModalOpen(true);

    if (!targetDocument.storagePath && targetDocument.externalReference) {
      setPreviewUrl(targetDocument.externalReference);
      setPreviewLoading(false);
      return;
    }

    const storagePath = targetDocument.storagePath;
    if (!storagePath) {
      setPreviewUrl("");
      setPreviewError("This document does not have a stored file path yet.");
      setPreviewLoading(false);
      return;
    }

    assertSupabaseConfigured();

    const { data, error: signedUrlError } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedUrlError || !data?.signedUrl) {
      setPreviewUrl("");
      setPreviewError(signedUrlError?.message ?? "Unable to create a preview link for this document.");
      setPreviewLoading(false);
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewLoading(false);
  }

  return {
    previewDocument,
    previewDocumentId,
    previewUrl,
    previewError,
    previewLoading,
    previewModalOpen,
    setPreviewDocumentId,
    openStoredDocument,
    openPreviewModal,
    closePreviewModal,
  };
}
