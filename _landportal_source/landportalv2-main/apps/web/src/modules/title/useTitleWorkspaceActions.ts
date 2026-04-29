import type {
  CreateProjectDocumentInput,
  CreateTitleCommitmentReferenceInput,
  LinkTitleDocumentInput,
  MarkTitleReferenceVisitedInput,
  ProjectDocumentRecord,
  TitleCommitmentRecord,
  TitleCommitmentReferenceRecord,
  TitleLinkedDocumentRecord,
  UpdateTitleCommitmentReferenceInput,
} from "@landportal/api-client";

import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  buildCommitmentDisplayTitle,
  buildCommitmentDocumentTitle,
} from "@/modules/title/titleCommitmentViewModel";

import { extractCommitmentData, normalizeReferenceKey } from "./titleCommitmentParser";

type JsonMetadataValue = string | number | boolean | null;

type AsyncMutation<TInput, TOutput = unknown> = {
  mutateAsync: (input: TInput) => Promise<TOutput>;
};

type UseTitleWorkspaceActionsArgs = {
  projectId: string;
  activeCommitment: TitleCommitmentRecord | null;
  activeCommitmentDocuments: Array<{
    id: string;
    document: ProjectDocumentRecord | null;
  }>;
  activeReferences: TitleCommitmentReferenceRecord[];
  linkedDocumentLinks: TitleLinkedDocumentRecord[];
  uploadedDocuments: ProjectDocumentRecord[];
  commitmentReferences: TitleCommitmentReferenceRecord[];
  projectDevelopment: {
    parcels: Array<{ id: string }>;
  };
  parcelSelection: {
    parcelSnapshotId?: string | null;
  } | null | undefined;
  previewDocumentId: string | null;
  setPreviewDocumentId: (value: string | null) => void;
  closePreviewModal: () => void;
  setCommitmentFile: (value: File | null) => void;
  setCommitmentTitle: (value: string | ((current: string) => string)) => void;
  setOrderNumber: (value: string | ((current: string) => string)) => void;
  setCommitmentNumber: (value: string | ((current: string) => string)) => void;
  setEffectiveDate: (value: string | ((current: string) => string)) => void;
  setIssueDateLabel: (value: string | ((current: string) => string)) => void;
  setPropertyAddress: (value: string | ((current: string) => string)) => void;
  setIssuingCompany: (value: string | ((current: string) => string)) => void;
  setCommitmentNotes: (value: string) => void;
  setFullPropertyDescription: (value: string | ((current: string) => string)) => void;
  setSelectedCommitmentId: (value: string) => void;
  setLinkedFiles: (value: File[]) => void;
  setLinkedSourceReference: (value: string) => void;
  setLinkedBriefDescription: (value: string) => void;
  setEditingReferenceId: (value: string | null) => void;
  setReferenceDocumentType: (value: string) => void;
  setReferenceText: (value: string) => void;
  setReferenceBriefDescription: (value: string) => void;
  setReferenceScheduleSection: (value: string) => void;
  commitmentFile: File | null;
  commitmentTitle: string;
  orderNumber: string;
  commitmentNumber: string;
  effectiveDate: string;
  issueDateLabel: string;
  propertyAddress: string;
  issuingCompany: string;
  fullPropertyDescription: string;
  commitmentNotes: string;
  linkedFiles: File[];
  linkedDocumentType: string;
  linkedRelationType: string;
  linkedSourceReference: string;
  linkedBriefDescription: string;
  referenceText: string;
  referenceDocumentType: string;
  referenceBriefDescription: string;
  referenceScheduleSection: string;
  editingReferenceId: string | null;
  createDocument: AsyncMutation<CreateProjectDocumentInput, ProjectDocumentRecord>;
  importCommitment: AsyncMutation<{
    file: File;
    activeCommitment: TitleCommitmentRecord | null;
    parcelSnapshotId: string | null;
    linkedDocumentLinks: TitleLinkedDocumentRecord[];
    uploadedDocuments: ProjectDocumentRecord[];
    commitmentReferences: TitleCommitmentReferenceRecord[];
    commitmentTitle: string;
    orderNumber: string;
    commitmentNumber: string;
    effectiveDate: string;
    issueDateLabel: string;
    propertyAddress: string;
    issuingCompany: string;
    fullPropertyDescription: string;
    commitmentNotes: string;
  }, {
    savedCommitment: TitleCommitmentRecord;
    parsedFields: {
      orderNumber: string | null;
      commitmentNumber: string | null;
      effectiveDateIso: string | null;
      dateOfIssue: string | null;
      propertyAddress: string | null;
      fullPropertyDescription: string | null;
    };
    syncStats: {
      total: number;
      linked: number;
      manualReview: number;
    };
  }>;
  deleteCommitment: AsyncMutation<string, { nextActiveCommitmentId: string | null }>;
  createReference: AsyncMutation<CreateTitleCommitmentReferenceInput>;
  setPrimaryCommitment: AsyncMutation<{ titleCommitmentId: string }>;
  updateReference: AsyncMutation<UpdateTitleCommitmentReferenceInput>;
  deleteReference: AsyncMutation<string>;
  linkDocument: AsyncMutation<LinkTitleDocumentInput>;
  markReferenceVisited: AsyncMutation<MarkTitleReferenceVisitedInput>;
  unlinkTitleDocument: AsyncMutation<string>;
  retryTitleReferenceFetch: AsyncMutation<{
    activeCommitment: TitleCommitmentRecord;
    reference: TitleCommitmentReferenceRecord;
    linkedDocumentLinks: TitleLinkedDocumentRecord[];
    uploadedDocuments: ProjectDocumentRecord[];
  }>;
};

export function useTitleWorkspaceActions(args: UseTitleWorkspaceActionsArgs) {
  async function uploadProjectFile(file: File, options: {
    title: string;
    documentType: string;
    documentRole: string;
    parentDocumentId?: string | null;
    sourceCommitmentId?: string | null;
    sourcePageNumber?: number | null;
    sourceReferenceText?: string;
    externalReference?: string;
    metadata?: Record<string, JsonMetadataValue>;
  }) {
    assertSupabaseConfigured();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const storagePath = `${args.projectId}/${Date.now()}-${safeName}`;
    const uploadResult = await supabase.storage.from("project-documents").upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadResult.error) throw uploadResult.error;

    return args.createDocument.mutateAsync({
      projectId: args.projectId,
      title: options.title,
      documentType: options.documentType,
      documentRole: options.documentRole,
      status: "ready",
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      externalReference: options.externalReference,
      parentDocumentId: options.parentDocumentId ?? null,
      sourceCommitmentId: options.sourceCommitmentId ?? null,
      sourcePageNumber: options.sourcePageNumber ?? null,
      sourceReferenceText: options.sourceReferenceText ?? "",
      metadata: {
        ...(options.metadata ?? {}),
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  async function handleCommitmentUpload() {
    if (!args.commitmentFile) {
      window.alert("Choose the title commitment PDF before saving it.");
      return;
    }

    const confirmUpload = window.confirm(args.activeCommitment
      ? "Replace the current title commitment PDF and refresh its extracted chain records?"
      : "Create the title commitment record and upload the primary document now?");
    if (!confirmUpload) return;

    const defaultParcelSnapshotId = args.parcelSelection?.parcelSnapshotId ?? args.projectDevelopment.parcels[0]?.id ?? null;
    const result = await args.importCommitment.mutateAsync({
      file: args.commitmentFile,
      activeCommitment: args.activeCommitment,
      parcelSnapshotId: defaultParcelSnapshotId,
      linkedDocumentLinks: args.linkedDocumentLinks,
      uploadedDocuments: args.uploadedDocuments,
      commitmentReferences: args.commitmentReferences,
      commitmentTitle: args.commitmentTitle,
      orderNumber: args.orderNumber,
      commitmentNumber: args.commitmentNumber,
      effectiveDate: args.effectiveDate,
      issueDateLabel: args.issueDateLabel,
      propertyAddress: args.propertyAddress,
      issuingCompany: args.issuingCompany,
      fullPropertyDescription: args.fullPropertyDescription,
      commitmentNotes: args.commitmentNotes,
    });

    args.setCommitmentFile(null);
    args.setCommitmentTitle(buildCommitmentDisplayTitle(result.savedCommitment));
    args.setOrderNumber(result.parsedFields.orderNumber || args.orderNumber);
    args.setCommitmentNumber(result.parsedFields.commitmentNumber || args.commitmentNumber);
    args.setEffectiveDate(result.parsedFields.effectiveDateIso || args.effectiveDate);
    args.setIssueDateLabel(result.parsedFields.dateOfIssue || args.issueDateLabel);
    args.setPropertyAddress(result.parsedFields.propertyAddress || args.propertyAddress);
    args.setFullPropertyDescription(result.parsedFields.fullPropertyDescription || args.fullPropertyDescription);
    args.setSelectedCommitmentId(result.savedCommitment.id);
    window.alert(`Title commitment saved. ${result.syncStats.total} chain-of-title reference${result.syncStats.total === 1 ? "" : "s"} were recorded, with ${result.syncStats.linked} linked and ${result.syncStats.manualReview} needing manual review.`);
  }

  async function handleCommitmentFileChange(file: File | null) {
    args.setCommitmentFile(file);
    if (!file) return;

    const extracted = await extractCommitmentData(file);
    if (extracted.parsedFields.orderNumber) args.setOrderNumber((current) => current || extracted.parsedFields.orderNumber || "");
    if (extracted.parsedFields.commitmentNumber) args.setCommitmentNumber((current) => current || extracted.parsedFields.commitmentNumber || "");
    if (extracted.parsedFields.effectiveDateIso) args.setEffectiveDate((current) => current || extracted.parsedFields.effectiveDateIso || "");
    if (extracted.parsedFields.dateOfIssue) args.setIssueDateLabel((current) => current || extracted.parsedFields.dateOfIssue || "");
    if (extracted.parsedFields.propertyAddress) args.setPropertyAddress((current) => current || extracted.parsedFields.propertyAddress || "");
    if (extracted.parsedFields.fullPropertyDescription) args.setFullPropertyDescription((current) => current || extracted.parsedFields.fullPropertyDescription || "");
    if (!args.commitmentTitle || args.commitmentTitle === "Title Commitment") {
      args.setCommitmentTitle(buildCommitmentDocumentTitle({
        fallbackTitle: "Title Commitment",
        orderNumber: extracted.parsedFields.orderNumber || "",
        scheduleAccountNo: extracted.parsedFields.commitmentNumber || "",
        issueDateText: extracted.parsedFields.effectiveDateText || extracted.parsedFields.dateOfIssue || "",
      }));
    }
  }

  async function handleLinkedDocumentsUpload() {
    if (!args.activeCommitment) {
      window.alert("Create the primary title commitment first.");
      return;
    }

    if (!args.linkedFiles.length) {
      window.alert("Choose one or more linked documents first.");
      return;
    }

    const confirmUpload = window.confirm(`Upload ${args.linkedFiles.length} linked document${args.linkedFiles.length === 1 ? "" : "s"} to this title commitment?`);
    if (!confirmUpload) return;

    for (const file of args.linkedFiles) {
      const createdDocument = await uploadProjectFile(file, {
        title: file.name.replace(/\.[^.]+$/, ""),
        documentType: args.linkedDocumentType,
        documentRole: "title_linked_record",
        parentDocumentId: args.activeCommitment.primaryDocumentId,
        sourceCommitmentId: args.activeCommitment.id,
        sourceReferenceText: args.linkedSourceReference,
        externalReference: args.linkedSourceReference,
        metadata: {
          briefDescription: args.linkedBriefDescription,
          relationType: args.linkedRelationType,
        },
      });

      await args.linkDocument.mutateAsync({
        titleCommitmentId: args.activeCommitment.id,
        projectDocumentId: createdDocument.id,
        relationType: args.linkedRelationType,
        sourceReference: args.linkedSourceReference,
        sourceReferenceText: args.linkedSourceReference,
        externalReference: args.linkedSourceReference,
        metadata: {
          briefDescription: args.linkedBriefDescription,
          documentType: args.linkedDocumentType,
        },
      });

      const matchedReference = args.activeReferences.find((reference) => (
        args.linkedSourceReference
          ? reference.referenceKey === normalizeReferenceKey(args.linkedSourceReference)
          : reference.expectedDocumentType === args.linkedDocumentType
            && file.name.toLowerCase().includes(reference.referenceText.toLowerCase().slice(0, 12))
      ));

      if (matchedReference) {
        await args.markReferenceVisited.mutateAsync({
          referenceId: matchedReference.id,
          visitedProjectDocumentId: createdDocument.id,
          visitStatus: "visited",
          fetchStatus: "stored",
          fetchError: "",
          metadata: {
            matchedBy: "source_reference",
          },
        });
      }
    }

    args.setLinkedFiles([]);
    args.setLinkedSourceReference("");
    args.setLinkedBriefDescription("");
    window.alert("Linked title records uploaded and attached to the commitment.");
  }

  async function handleCreateReference() {
    if (!args.activeCommitment) {
      window.alert("Create the primary title commitment first.");
      return;
    }

    if (!args.referenceText.trim()) {
      window.alert("Enter the linked document reference from the title commitment first.");
      return;
    }

    if (args.editingReferenceId) {
      await args.updateReference.mutateAsync({
        referenceId: args.editingReferenceId,
        expectedDocumentType: args.referenceDocumentType,
        referenceText: args.referenceText.trim(),
        referenceKey: normalizeReferenceKey(args.referenceText),
        briefDescription: args.referenceBriefDescription,
        scheduleSection: args.referenceScheduleSection,
        metadata: {
          source: "manual_title_review",
        },
      });
    } else {
      await args.createReference.mutateAsync({
        titleCommitmentId: args.activeCommitment.id,
        expectedDocumentType: args.referenceDocumentType,
        referenceText: args.referenceText.trim(),
        referenceKey: normalizeReferenceKey(args.referenceText),
        briefDescription: args.referenceBriefDescription,
        scheduleSection: args.referenceScheduleSection,
        sourceSection: args.referenceScheduleSection || "manual_review",
        fetchStatus: "manual_review",
        fetchError: "Added manually. No linked source URL has been fetched yet.",
        visitStatus: "pending",
        metadata: {
          source: "manual_title_review",
        },
      });
    }

    args.setEditingReferenceId(null);
    args.setReferenceText("");
    args.setReferenceBriefDescription("");
    args.setReferenceScheduleSection("");
  }

  function handleEditReference(referenceId: string) {
    const reference = args.activeReferences.find((entry) => entry.id === referenceId);
    if (!reference) return;
    args.setEditingReferenceId(reference.id);
    args.setReferenceDocumentType(reference.expectedDocumentType);
    args.setReferenceText(reference.referenceText);
    args.setReferenceBriefDescription(reference.briefDescription);
    args.setReferenceScheduleSection(reference.scheduleSection);
  }

  async function handleDeleteReference(referenceId: string) {
    const confirmDelete = window.confirm("Delete this expected title reference from the ledger?");
    if (!confirmDelete) return;
    await args.deleteReference.mutateAsync(referenceId);
    if (args.editingReferenceId === referenceId) {
      args.setEditingReferenceId(null);
      args.setReferenceText("");
      args.setReferenceBriefDescription("");
      args.setReferenceScheduleSection("");
    }
  }

  async function handleSetPrimaryCommitment(titleCommitmentId: string) {
    if (args.activeCommitment?.id === titleCommitmentId && args.activeCommitment.isPrimary) return;
    const confirmPrimary = window.confirm("Make this the primary title commitment for the parcel?");
    if (!confirmPrimary) return;
    await args.setPrimaryCommitment.mutateAsync({ titleCommitmentId });
    args.setSelectedCommitmentId(titleCommitmentId);
  }

  async function handleDeleteCommitment(titleCommitmentId: string) {
    const confirmDelete = window.confirm("Delete this title commitment record from the stack? Linked references will be removed from the commitment ledger.");
    if (!confirmDelete) return;
    try {
      const result = await args.deleteCommitment.mutateAsync(titleCommitmentId);
      args.setSelectedCommitmentId(result.nextActiveCommitmentId ?? "");
      if (args.previewDocumentId && args.activeCommitmentDocuments.some((entry) => entry.document?.id === args.previewDocumentId)) {
        args.setPreviewDocumentId(null);
        args.closePreviewModal();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete this title commitment.";
      window.alert(message);
    }
  }

  async function handleRetryReferenceFetch(referenceId: string) {
    if (!args.activeCommitment) return;
    const reference = args.activeReferences.find((entry) => entry.id === referenceId) ?? null;
    if (!reference) return;

    try {
      await args.retryTitleReferenceFetch.mutateAsync({
        activeCommitment: args.activeCommitment,
        reference,
        linkedDocumentLinks: args.linkedDocumentLinks,
        uploadedDocuments: args.uploadedDocuments,
      });
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : "Unable to retry the linked document fetch.";
      window.alert(message);
    }
  }

  async function handleUnlinkLinkedDocument(linkId: string) {
    const confirmUnlink = window.confirm("Unlink this document from the active title commitment?");
    if (!confirmUnlink) return;
    const linkedDocument = args.activeCommitmentDocuments.find((entry) => entry.id === linkId) ?? null;
    const matchedReference = linkedDocument?.document
      ? args.activeReferences.find((reference) => reference.visitedProjectDocumentId === linkedDocument.document?.id) ?? null
      : null;

    await args.unlinkTitleDocument.mutateAsync(linkId);

    if (matchedReference) {
      await args.updateReference.mutateAsync({
        referenceId: matchedReference.id,
        visitedProjectDocumentId: null,
        visitStatus: "pending",
        fetchStatus: matchedReference.linkUrl ? "manual_review" : "pending",
        fetchError: "Document was unlinked from the commitment stack.",
      });
    }
  }

  function handleOpenOriginalSource(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyOriginalSource(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.alert("Unable to copy the original source URL.");
    }
  }

  return {
    handleCommitmentUpload,
    handleCommitmentFileChange,
    handleLinkedDocumentsUpload,
    handleCreateReference,
    handleEditReference,
    handleDeleteReference,
    handleSetPrimaryCommitment,
    handleDeleteCommitment,
    handleRetryReferenceFetch,
    handleUnlinkLinkedDocument,
    handleOpenOriginalSource,
    handleCopyOriginalSource,
  };
}
