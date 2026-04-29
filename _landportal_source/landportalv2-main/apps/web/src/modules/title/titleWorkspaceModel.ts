import type { ProjectDocumentRecord, TitleLinkedDocumentRecord } from "@landportal/api-client";

export function buildTitleWorkspaceDocumentCollections(args: {
  uploadedDocuments: ProjectDocumentRecord[];
  linkedDocumentLinks: TitleLinkedDocumentRecord[];
}) {
  const { uploadedDocuments, linkedDocumentLinks } = args;
  const linkedDocumentIds = new Set(linkedDocumentLinks.map((entry) => entry.projectDocumentId));

  const titleDocuments = uploadedDocuments.filter((document) =>
    document.documentType === "title_commitment"
    || document.documentRole === "primary_title_commitment"
    || /title|schedule a|schedule b/i.test(document.title),
  );

  const supportingDocuments = uploadedDocuments.filter((document) =>
    ["survey", "plat", "easement", "agency_letter", "opinion_letter", "deed", "ilc", "record_of_survey"].includes(document.documentType)
    && document.documentRole !== "title_linked_record"
    && document.documentRole !== "primary_title_commitment"
    && !linkedDocumentIds.has(document.id)
    && !document.parentDocumentId
    && !document.sourceCommitmentId,
  );

  return {
    titleDocuments,
    supportingDocuments,
  };
}
