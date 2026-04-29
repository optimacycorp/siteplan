import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createProjectDocument,
  createTitleCommitment,
  createTitleCommitmentReference,
  linkDocumentToTitleCommitment,
  markTitleCommitmentReferenceVisited,
  updateTitleCommitment,
  updateTitleCommitmentPrimaryDocument,
  updateTitleCommitmentReference,
  type ProjectDocumentRecord,
  type TitleCommitmentRecord,
  type TitleCommitmentReferenceRecord,
  type TitleLinkedDocumentRecord,
} from "@landportal/api-client";

import {
  extractCommitmentData,
  normalizeReferenceKey,
  type ParsedCommitmentFields,
  type ParsedLinkedReference,
} from "./titleCommitmentParser";

type JsonScalar = string | number | boolean | null;

export type ImportTitleCommitmentInput = {
  supabase: SupabaseClient;
  projectId: string;
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
};

export type ImportTitleCommitmentResult = {
  savedCommitment: TitleCommitmentRecord;
  parsedFields: ParsedCommitmentFields;
  linkedReferences: ParsedLinkedReference[];
  syncStats: {
    total: number;
    fetched: number;
    linked: number;
    manualReview: number;
  };
};

export type RetryTitleReferenceFetchInput = {
  supabase: SupabaseClient;
  projectId: string;
  activeCommitment: TitleCommitmentRecord;
  reference: TitleCommitmentReferenceRecord;
  linkedDocumentLinks: TitleLinkedDocumentRecord[];
  uploadedDocuments: ProjectDocumentRecord[];
};

export async function importTitleCommitment(input: ImportTitleCommitmentInput): Promise<ImportTitleCommitmentResult> {
  const extracted = await extractCommitmentData(input.file);
  const parsedFields = extracted.parsedFields;
  const resolvedOrderNumber = input.orderNumber || parsedFields.orderNumber || "";
  const resolvedCommitmentNumber = input.commitmentNumber || parsedFields.commitmentNumber || "";
  const resolvedEffectiveDate = input.effectiveDate || parsedFields.effectiveDateIso || null;
  const resolvedIssueDateLabel = input.issueDateLabel || parsedFields.dateOfIssue || "";
  const resolvedPropertyAddress = input.propertyAddress || parsedFields.propertyAddress || "";
  const resolvedPropertyDescription = input.fullPropertyDescription || parsedFields.fullPropertyDescription || "";
  const resolvedTitle = buildCommitmentDocumentTitle({
    fallbackTitle: input.commitmentTitle || "Title Commitment",
    orderNumber: resolvedOrderNumber,
    scheduleAccountNo: resolvedCommitmentNumber,
    issueDateText: parsedFields.effectiveDateText || resolvedIssueDateLabel,
  });

  const primaryDocument = await uploadProjectFileRecord(input.supabase, {
    projectId: input.projectId,
    file: input.file,
    title: resolvedTitle,
    documentType: "title_commitment",
    documentRole: "primary_title_commitment",
    sourceCommitmentId: input.activeCommitment?.id ?? null,
    metadata: {
      exampleReference: "Rampart title package",
      orderNumber: resolvedOrderNumber,
      scheduleAccountNo: resolvedCommitmentNumber,
      issueDateText: resolvedIssueDateLabel,
      effectiveDateText: parsedFields.effectiveDateText,
      propertyAddress: resolvedPropertyAddress,
      fullPropertyDescription: resolvedPropertyDescription,
      extractedChainCount: extracted.linkedReferences.length,
    },
  });

  const savedCommitment = input.activeCommitment
    ? await updateTitleCommitment(input.supabase, {
      titleCommitmentId: input.activeCommitment.id,
      parcelSnapshotId: input.parcelSnapshotId,
      primaryDocumentId: primaryDocument.id,
      title: resolvedTitle,
      orderNumber: resolvedOrderNumber,
      commitmentNumber: resolvedCommitmentNumber,
      dateOfIssue: parsedFields.dateOfIssue,
      effectiveDate: resolvedEffectiveDate,
      effectiveTimestamp: resolvedEffectiveDate,
      propertyAddress: resolvedPropertyAddress,
      issuingCompany: input.issuingCompany,
      fullPropertyDescription: resolvedPropertyDescription,
      status: "ready",
      importStatus: extracted.linkedReferences.length ? "ready_with_warnings" : "parsed",
      importError: "",
      childLinkCount: extracted.linkedReferences.length,
      notes: input.commitmentNotes,
      metadata: {
        ...(input.activeCommitment.metadata ?? {}),
        sourceExamplePdf: "55083413_documents.pdf",
        orderNumber: resolvedOrderNumber,
        scheduleAccountNo: resolvedCommitmentNumber,
        issueDateText: resolvedIssueDateLabel,
        effectiveDateText: parsedFields.effectiveDateText,
        propertyAddress: resolvedPropertyAddress,
        fullPropertyDescription: resolvedPropertyDescription,
        extractedChainCount: extracted.linkedReferences.length,
      },
    })
    : await createTitleCommitment(input.supabase, {
      projectId: input.projectId,
      parcelSnapshotId: input.parcelSnapshotId,
      primaryDocumentId: primaryDocument.id,
      isPrimary: true,
      title: resolvedTitle,
      orderNumber: resolvedOrderNumber,
      commitmentNumber: resolvedCommitmentNumber,
      dateOfIssue: parsedFields.dateOfIssue,
      effectiveDate: resolvedEffectiveDate,
      effectiveTimestamp: resolvedEffectiveDate,
      propertyAddress: resolvedPropertyAddress,
      issuingCompany: input.issuingCompany,
      fullPropertyDescription: resolvedPropertyDescription,
      status: "ready",
      importStatus: extracted.linkedReferences.length ? "ready_with_warnings" : "parsed",
      importError: "",
      childLinkCount: extracted.linkedReferences.length,
      notes: input.commitmentNotes,
      metadata: {
        sourceExamplePdf: "55083413_documents.pdf",
        orderNumber: resolvedOrderNumber,
        scheduleAccountNo: resolvedCommitmentNumber,
        issueDateText: resolvedIssueDateLabel,
        effectiveDateText: parsedFields.effectiveDateText,
        propertyAddress: resolvedPropertyAddress,
        fullPropertyDescription: resolvedPropertyDescription,
        extractedChainCount: extracted.linkedReferences.length,
      },
    });

  await updateTitleCommitmentPrimaryDocument(input.supabase, savedCommitment.id, primaryDocument.id);

  const syncStats = await syncParsedLinkedReferences({
    supabase: input.supabase,
    projectId: input.projectId,
    titleCommitmentId: savedCommitment.id,
    primaryDocumentId: primaryDocument.id,
    linkedReferences: extracted.linkedReferences,
    linkedDocumentLinks: input.linkedDocumentLinks,
    uploadedDocuments: input.uploadedDocuments,
    commitmentReferences: input.commitmentReferences,
  });

  await updateTitleCommitment(input.supabase, {
    titleCommitmentId: savedCommitment.id,
    importStatus: syncStats.manualReview ? "ready_with_warnings" : "ready",
    importError: "",
    childLinkCount: syncStats.total,
    childFetchSuccessCount: syncStats.linked,
    childFetchFailureCount: syncStats.manualReview,
  });

  return {
    savedCommitment,
    parsedFields,
    linkedReferences: extracted.linkedReferences,
    syncStats,
  };
}

export async function retryTitleReferenceFetch(input: RetryTitleReferenceFetchInput) {
  const originalUrl = input.reference.linkUrl;
  if (!originalUrl) {
    return updateTitleCommitmentReference(input.supabase, {
      referenceId: input.reference.id,
      fetchStatus: "manual_review",
      fetchError: "No original source URL is stored for this reference.",
    });
  }

  const existingLinkedDocument = input.linkedDocumentLinks
    .filter((entry) => entry.titleCommitmentId === input.activeCommitment.id)
    .map((entry) => ({
      link: entry,
      document: input.uploadedDocuments.find((document) => document.id === entry.projectDocumentId) ?? null,
    }))
    .find(({ link, document }) =>
      document?.externalReference === originalUrl
      || link.externalReference === originalUrl
      || normalizeReferenceKey(link.sourceReference || link.sourceReferenceText) === input.reference.referenceKey,
    );

  if (existingLinkedDocument?.document?.id) {
    return markTitleCommitmentReferenceVisited(input.supabase, {
      referenceId: input.reference.id,
      visitedProjectDocumentId: existingLinkedDocument.document.id,
      visitStatus: "visited",
      fetchStatus: "stored",
      fetchError: "",
      metadata: {
        matchedBy: "retry_existing_document",
      },
    });
  }

  const fetchedFile = await fetchRemoteLinkedDocument(originalUrl, input.reference.referenceText);
  if (!fetchedFile) {
    return updateTitleCommitmentReference(input.supabase, {
      referenceId: input.reference.id,
      fetchStatus: "failed",
      fetchError: "Remote fetch failed or returned an unsupported file type.",
    });
  }

  const storedDocument = await uploadProjectFileRecord(input.supabase, {
    projectId: input.projectId,
    file: fetchedFile,
    title: input.reference.referenceText,
    documentType: input.reference.expectedDocumentType || "deed",
    documentRole: "title_linked_record",
    parentDocumentId: input.activeCommitment.primaryDocumentId,
    sourceCommitmentId: input.activeCommitment.id,
    sourcePageNumber: input.reference.sourcePage,
    sourceReferenceText: input.reference.referenceText,
    externalReference: originalUrl,
    metadata: {
      briefDescription: input.reference.briefDescription,
      extractionSource: "title_reference_retry",
    },
  });

  await linkDocumentToTitleCommitment(input.supabase, {
    titleCommitmentId: input.activeCommitment.id,
    projectDocumentId: storedDocument.id,
    relationType: "chain_of_title",
    sourceReference: input.reference.referenceText,
    sourcePageNumber: input.reference.sourcePage,
    sourceReferenceText: input.reference.referenceText,
    externalReference: originalUrl,
    metadata: {
      extractionSource: "title_reference_retry",
      externalReference: originalUrl,
    },
  });

  return markTitleCommitmentReferenceVisited(input.supabase, {
    referenceId: input.reference.id,
    visitedProjectDocumentId: storedDocument.id,
    visitStatus: "visited",
    fetchStatus: "stored",
    fetchError: "",
    metadata: {
      matchedBy: "retry_fetch",
      externalReference: originalUrl,
    },
  });
}

async function syncParsedLinkedReferences(input: {
  supabase: SupabaseClient;
  projectId: string;
  titleCommitmentId: string;
  primaryDocumentId: string | null;
  linkedReferences: ParsedLinkedReference[];
  linkedDocumentLinks: TitleLinkedDocumentRecord[];
  uploadedDocuments: ProjectDocumentRecord[];
  commitmentReferences: TitleCommitmentReferenceRecord[];
}) {
  let fetchedCount = 0;
  let linkedCount = 0;
  let manualReviewCount = 0;
  const existingLinks = input.linkedDocumentLinks.filter((entry) => entry.titleCommitmentId === input.titleCommitmentId);
  const processedReferenceKeys = new Set<string>();
  const referenceMap = new Map(
    input.commitmentReferences
      .filter((entry) => entry.titleCommitmentId === input.titleCommitmentId)
      .map((entry) => [entry.referenceKey, entry] as const),
  );

  for (const item of input.linkedReferences) {
    if (!item.referenceKey || processedReferenceKeys.has(item.referenceKey)) continue;
    processedReferenceKeys.add(item.referenceKey);

    let reference = referenceMap.get(item.referenceKey);
    if (!reference) {
      reference = await createTitleCommitmentReference(input.supabase, {
        titleCommitmentId: input.titleCommitmentId,
        expectedDocumentType: "deed",
        referenceText: item.referenceText,
        referenceKey: item.referenceKey,
        briefDescription: "Auto-extracted from uploaded title commitment.",
        scheduleSection: item.sourceSection,
        sourcePage: item.sourcePage,
        sourceSection: item.sourceSection,
        linkUrl: item.originalUrl ?? "",
        visitStatus: item.originalUrl ? "linked" : "pending",
        fetchStatus: item.fetchStatus,
        fetchError: item.originalUrl ? "" : "No remote URL could be matched to this chain-of-title reference.",
        matchConfidence: item.matchConfidence,
        metadata: {
          source: "auto_extracted_from_pdf",
          url: item.originalUrl ?? "",
        },
      });
      referenceMap.set(item.referenceKey, reference);
    }

    const itemUrl = item.originalUrl;
    if (!itemUrl) {
      manualReviewCount += 1;
      await updateTitleCommitmentReference(input.supabase, {
        referenceId: reference.id,
        visitStatus: "pending",
        fetchStatus: "manual_review",
        fetchError: "No remote URL could be matched to this chain-of-title reference.",
        matchConfidence: item.matchConfidence,
      });
      continue;
    }

    const existingLinkedDocument = existingLinks
      .map((entry) => ({
        link: entry,
        document: input.uploadedDocuments.find((document) => document.id === entry.projectDocumentId) ?? null,
      }))
      .find(({ link, document }) =>
        normalizeReferenceKey(link.sourceReference || link.sourceReferenceText) === item.referenceKey
        || normalizeReferenceKey(document?.title ?? "") === item.referenceKey
        || document?.externalReference === itemUrl,
      );

    const linkedRecord = existingLinkedDocument?.document
      ? existingLinkedDocument.document
      : await (async () => {
        const fetchedFile = await fetchRemoteLinkedDocument(itemUrl, item.referenceText);
        if (fetchedFile) {
          fetchedCount += 1;
          return uploadProjectFileRecord(input.supabase, {
            projectId: input.projectId,
            file: fetchedFile,
            title: item.referenceText,
            documentType: "deed",
            documentRole: "title_linked_record",
            parentDocumentId: input.primaryDocumentId,
            sourceCommitmentId: input.titleCommitmentId,
            sourcePageNumber: item.sourcePage,
            sourceReferenceText: item.referenceText,
            externalReference: itemUrl,
            metadata: {
              briefDescription: "Auto-fetched from title commitment link.",
              extractionSource: "title_commitment_pdf",
            },
          });
        }

        return createExternalProjectDocumentRecord(input.supabase, {
          projectId: input.projectId,
          title: item.referenceText,
          documentType: "deed",
          documentRole: "title_linked_record",
          parentDocumentId: input.primaryDocumentId,
          sourceCommitmentId: input.titleCommitmentId,
          sourcePageNumber: item.sourcePage,
          sourceReferenceText: item.referenceText,
          externalReference: itemUrl,
          metadata: {
            briefDescription: "Linked from title commitment. Remote fetch not available.",
            extractionSource: "title_commitment_pdf",
          },
        });
      })();

    if (!existingLinkedDocument) {
      await linkDocumentToTitleCommitment(input.supabase, {
        titleCommitmentId: input.titleCommitmentId,
        projectDocumentId: linkedRecord.id,
        relationType: "chain_of_title",
        sourceReference: item.referenceText,
        sourcePageNumber: item.sourcePage,
        sourceReferenceText: item.referenceText,
        externalReference: itemUrl,
        metadata: {
          extractionSource: "title_commitment_pdf",
          externalReference: itemUrl,
        },
      });
    }

    await markTitleCommitmentReferenceVisited(input.supabase, {
      referenceId: reference.id,
      visitedProjectDocumentId: linkedRecord.id,
      visitStatus: "visited",
      fetchStatus: linkedRecord.storagePath ? "stored" : "linked",
      fetchError: "",
      metadata: {
        matchedBy: "auto_extracted_link",
        externalReference: itemUrl,
      },
    });

    linkedCount += 1;
  }

  return {
    total: processedReferenceKeys.size,
    fetched: fetchedCount,
    linked: linkedCount,
    manualReview: manualReviewCount,
  };
}

async function uploadProjectFileRecord(
  supabase: SupabaseClient,
  options: {
    projectId: string;
    file: File;
    title: string;
    documentType: string;
    documentRole: string;
    parentDocumentId?: string | null;
    sourceCommitmentId?: string | null;
    sourcePageNumber?: number | null;
    sourceReferenceText?: string;
    externalReference?: string;
    metadata?: Record<string, JsonScalar>;
  },
) {
  const safeName = options.file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${options.projectId}/${Date.now()}-${safeName}`;
  const uploadResult = await supabase.storage.from("project-documents").upload(storagePath, options.file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadResult.error) throw uploadResult.error;

  return createProjectDocument(supabase, {
    projectId: options.projectId,
    title: options.title,
    documentType: options.documentType,
    documentRole: options.documentRole,
    status: "ready",
    storagePath,
    fileName: options.file.name,
    mimeType: options.file.type,
    fileSizeBytes: options.file.size,
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

async function createExternalProjectDocumentRecord(
  supabase: SupabaseClient,
  options: {
    projectId: string;
    title: string;
    documentType: string;
    documentRole: string;
    parentDocumentId?: string | null;
    sourceCommitmentId?: string | null;
    sourcePageNumber?: number | null;
    sourceReferenceText?: string;
    externalReference?: string;
    metadata?: Record<string, JsonScalar>;
  },
) {
  return createProjectDocument(supabase, {
    projectId: options.projectId,
    title: options.title,
    documentType: options.documentType,
    documentRole: options.documentRole,
    status: "linked",
    storagePath: null,
    fileName: "",
    mimeType: "",
    fileSizeBytes: 0,
    externalReference: options.externalReference,
    parentDocumentId: options.parentDocumentId ?? null,
    sourceCommitmentId: options.sourceCommitmentId ?? null,
    sourcePageNumber: options.sourcePageNumber ?? null,
    sourceReferenceText: options.sourceReferenceText ?? "",
    metadata: {
      ...(options.metadata ?? {}),
      linkedAt: new Date().toISOString(),
    },
  });
}

async function fetchRemoteLinkedDocument(url: string, fallbackTitle: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const mimeType = blob.type || "";
    if (!mimeType.includes("pdf") && !mimeType.startsWith("image/")) return null;
    const filename = url.split("/").pop()?.split("?")[0] || `${fallbackTitle.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase()}.${mimeType.includes("pdf") ? "pdf" : "bin"}`;
    return new File([blob], filename, { type: mimeType || "application/octet-stream" });
  } catch {
    return null;
  }
}

function buildCommitmentDocumentTitle(params: {
  fallbackTitle: string;
  orderNumber: string;
  scheduleAccountNo: string;
  issueDateText: string;
}) {
  const parts = [params.fallbackTitle.trim() || "Title Commitment"];
  if (params.orderNumber) parts.push(`Order ${params.orderNumber}`);
  else if (params.scheduleAccountNo) parts.push(`Schedule ${params.scheduleAccountNo}`);
  if (params.issueDateText) parts.push(params.issueDateText);
  return parts.join(" - ");
}
