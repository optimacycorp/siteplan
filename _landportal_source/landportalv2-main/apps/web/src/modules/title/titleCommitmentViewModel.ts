import type {
  TitleCommitmentRecord,
  TitleCommitmentReferenceRecord,
  TitleLinkedDocumentRecord,
  ProjectDocumentRecord,
} from "@landportal/api-client";

import { buildActiveChainTiles, type TitleChainTileViewModel } from "@/modules/title/titleChainTileModel";

export type TitleCommitmentStackItem = {
  commitment: TitleCommitmentRecord;
  chainTiles: TitleChainTileViewModel[];
  displayTitle: string;
  statusLabel: string;
  importStatusLabel: string;
  orderNumber: string;
  scheduleNumber: string;
  issueDate: string;
  effectiveDate: string;
  propertyAddress: string;
  issuingCompany: string;
  propertyDescription: string;
};

export function buildCommitmentStackItems(args: {
  commitments: TitleCommitmentRecord[];
  linkedDocumentLinks: TitleLinkedDocumentRecord[];
  uploadedDocuments: ProjectDocumentRecord[];
  commitmentReferences: TitleCommitmentReferenceRecord[];
}): TitleCommitmentStackItem[] {
  const { commitments, linkedDocumentLinks, uploadedDocuments, commitmentReferences } = args;

  return commitments.map((commitment) => {
    const chainTiles = buildActiveChainTiles({
      activeCommitment: commitment,
      linkedDocumentLinks,
      uploadedDocuments,
      activeReferences: commitmentReferences.filter((entry) => entry.titleCommitmentId === commitment.id),
    });

    return {
      commitment,
      chainTiles,
      displayTitle: buildCommitmentDisplayTitle(commitment),
      statusLabel: getCommitmentStatusLabel(commitment),
      importStatusLabel: getCommitmentImportStatusLabel(commitment),
      orderNumber: getCommitmentOrderNumber(commitment),
      scheduleNumber: getCommitmentScheduleNumber(commitment),
      issueDate: getCommitmentIssueDate(commitment),
      effectiveDate: getCommitmentEffectiveDate(commitment),
      propertyAddress: getCommitmentPropertyAddress(commitment),
      issuingCompany: getCommitmentIssuingCompany(commitment),
      propertyDescription: getCommitmentPropertyDescription(commitment),
    };
  });
}

export function buildCommitmentDocumentTitle(params: {
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

export function buildCommitmentDisplayTitle(commitment: {
  title: string;
  orderNumber: string;
  commitmentNumber: string;
  dateOfIssue: string | null;
  effectiveDate: string | null;
  metadata: Record<string, unknown> | null;
}) {
  const fallbackTitle = cleanString(commitment.title) || "Title Commitment";
  const orderNumber = getCommitmentOrderNumber(commitment);
  const scheduleAccountNo = getCommitmentScheduleNumber(commitment);
  const issueDateText = getCommitmentIssueDate(commitment) || getCommitmentEffectiveDate(commitment);
  return buildCommitmentDocumentTitle({
    fallbackTitle,
    orderNumber,
    scheduleAccountNo,
    issueDateText,
  });
}

export function getCommitmentOrderNumber(commitment: {
  orderNumber: string;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.orderNumber) || getCommitmentMetadataValue(commitment, ["orderNumber", "orderNo", "order_number"]);
}

export function getCommitmentScheduleNumber(commitment: {
  commitmentNumber: string;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.commitmentNumber) || getCommitmentMetadataValue(commitment, ["scheduleAccountNo", "scheduleNumber", "accountNumber", "commitmentNumber"]);
}

export function getCommitmentIssueDate(commitment: {
  dateOfIssue: string | null;
  effectiveDate: string | null;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.dateOfIssue)
    || getCommitmentMetadataValue(commitment, ["dateOfIssue", "issueDateText", "issueDate"])
    || cleanString(commitment.effectiveDate)
    || "";
}

export function getCommitmentEffectiveDate(commitment: {
  effectiveDate: string | null;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.effectiveDate)
    || getCommitmentMetadataValue(commitment, ["effectiveDateText", "effectiveDateIso", "effectiveDate"]);
}

export function getCommitmentPropertyAddress(commitment: {
  propertyAddress: string;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.propertyAddress) || getCommitmentMetadataValue(commitment, ["propertyAddress", "siteAddress", "address"]);
}

export function getCommitmentIssuingCompany(commitment: {
  issuingCompany: string;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.issuingCompany) || getCommitmentMetadataValue(commitment, ["issuingCompany", "titleCompany", "company"]);
}

export function getCommitmentPropertyDescription(commitment: {
  fullPropertyDescription: string;
  metadata: Record<string, unknown> | null;
}) {
  return cleanString(commitment.fullPropertyDescription) || getCommitmentMetadataValue(commitment, ["fullPropertyDescription", "propertyDescription", "legalDescription"]);
}

export function getCommitmentStatusLabel(commitment: {
  status: string;
}) {
  return commitment.status?.trim() ? commitment.status.trim() : "ready";
}

export function getCommitmentImportStatusLabel(commitment: {
  importStatus: string;
}) {
  return commitment.importStatus?.trim() ? commitment.importStatus.replaceAll("_", " ") : "not started";
}

function getCommitmentMetadataValue(
  commitment: { metadata: Record<string, unknown> | null },
  keys: string[],
) {
  const metadata = commitment.metadata ?? {};
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function cleanString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}
