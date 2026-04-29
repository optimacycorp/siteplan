import type {
  ProjectDocumentRecord,
  TitleCommitmentRecord,
  TitleCommitmentReferenceRecord,
  TitleLinkedDocumentRecord,
} from "@landportal/api-client";

export type TitleChainTileViewModel = {
  id: string;
  title: string;
  referenceText: string;
  displayReference: string;
  fullReference: string;
  relationType: string;
  sourcePageNumber: number | null;
  fetchStatus: "pending" | "stored" | "failed" | "manual_review";
  matchConfidence: number | null;
  storedDocumentId: string | null;
  storedDocumentTitle: string | null;
  storedDocumentAvailable: boolean;
  originalExternalReference: string | null;
  originalSourceHost: string | null;
  canRetryFetch: boolean;
  isStoredLocally: boolean;
  referenceId: string | null;
  linkId: string | null;
  sourceReferenceText: string;
};

export function buildActiveChainTiles(args: {
  activeCommitment: TitleCommitmentRecord | null;
  linkedDocumentLinks: TitleLinkedDocumentRecord[];
  uploadedDocuments: ProjectDocumentRecord[];
  activeReferences: TitleCommitmentReferenceRecord[];
}): TitleChainTileViewModel[] {
  const { activeCommitment, linkedDocumentLinks, uploadedDocuments, activeReferences } = args;
  if (!activeCommitment) return [];

  const linksForCommitment = linkedDocumentLinks.filter((entry) => entry.titleCommitmentId === activeCommitment.id);
  const documentMap = new Map(uploadedDocuments.map((document) => [document.id, document] as const));
  const linkByReferenceKey = new Map<string, TitleLinkedDocumentRecord>();
  const orphanLinks: TitleLinkedDocumentRecord[] = [];

  for (const link of linksForCommitment) {
    const key = normalizeTileReferenceKey(link.sourceReference || link.sourceReferenceText);
    if (key) {
      linkByReferenceKey.set(key, link);
    } else {
      orphanLinks.push(link);
    }
  }

  const referenceDrivenTiles = activeReferences.map((reference) => {
    const matchedLink =
      linkByReferenceKey.get(reference.referenceKey)
      ?? linksForCommitment.find((link) => link.projectDocumentId === reference.visitedProjectDocumentId)
      ?? null;
    const linkedDocument = matchedLink ? documentMap.get(matchedLink.projectDocumentId) ?? null : null;
    const originalExternalReference = reference.linkUrl || matchedLink?.externalReference || linkedDocument?.externalReference || null;
    const storedDocumentId = reference.visitedProjectDocumentId ?? linkedDocument?.id ?? null;
    const storedDocumentTitle = linkedDocument?.title ?? null;
    const storedDocumentAvailable = Boolean(storedDocumentId);
    const fetchStatus = normalizeFetchStatus(reference.fetchStatus, storedDocumentAvailable);

    return {
      id: reference.id,
      title: buildFriendlyChainTitle(
        reference.referenceText,
        matchedLink?.sourceReferenceText,
        storedDocumentTitle,
        originalExternalReference,
      ),
      referenceText: reference.referenceText,
      displayReference: truncateReference(reference.referenceText),
      fullReference: reference.referenceText,
      relationType: matchedLink?.relationType ?? "chain_of_title",
      sourcePageNumber: reference.sourcePage ?? matchedLink?.sourcePageNumber ?? linkedDocument?.sourcePageNumber ?? null,
      fetchStatus,
      matchConfidence: reference.matchConfidence,
      storedDocumentId,
      storedDocumentTitle,
      storedDocumentAvailable,
      originalExternalReference,
      originalSourceHost: getSourceHost(originalExternalReference),
      canRetryFetch: Boolean(originalExternalReference) && (fetchStatus === "failed" || fetchStatus === "manual_review"),
      isStoredLocally: storedDocumentAvailable,
      referenceId: reference.id,
      linkId: matchedLink?.id ?? null,
      sourceReferenceText: matchedLink?.sourceReferenceText || matchedLink?.sourceReference || reference.referenceText,
    } satisfies TitleChainTileViewModel;
  });

  const orphanTiles = orphanLinks
    .filter((link) => !referenceDrivenTiles.some((tile) => tile.linkId === link.id))
    .map((link) => {
      const linkedDocument = documentMap.get(link.projectDocumentId) ?? null;
      const originalExternalReference = link.externalReference || linkedDocument?.externalReference || null;
      const storedDocumentId = linkedDocument?.id ?? null;
      const storedDocumentTitle = linkedDocument?.title ?? null;

      return {
        id: link.id,
        title: buildFriendlyChainTitle(
          link.sourceReferenceText,
          link.sourceReference,
          storedDocumentTitle,
          originalExternalReference,
        ),
        referenceText: link.sourceReferenceText || link.sourceReference || storedDocumentTitle || "Linked record",
        displayReference: truncateReference(link.sourceReferenceText || link.sourceReference || storedDocumentTitle || "Linked record"),
        fullReference: link.sourceReferenceText || link.sourceReference || storedDocumentTitle || "Linked record",
        relationType: link.relationType,
        sourcePageNumber: link.sourcePageNumber ?? linkedDocument?.sourcePageNumber ?? null,
        fetchStatus: storedDocumentId ? "stored" : originalExternalReference ? "pending" : "manual_review",
        matchConfidence: null,
        storedDocumentId,
        storedDocumentTitle,
        storedDocumentAvailable: Boolean(storedDocumentId),
        originalExternalReference,
        originalSourceHost: getSourceHost(originalExternalReference),
        canRetryFetch: Boolean(originalExternalReference) && !storedDocumentId,
        isStoredLocally: Boolean(storedDocumentId),
        referenceId: null,
        linkId: link.id,
        sourceReferenceText: link.sourceReferenceText || link.sourceReference || storedDocumentTitle || "Linked record",
      } satisfies TitleChainTileViewModel;
    });

  return [...referenceDrivenTiles, ...orphanTiles];
}

function normalizeFetchStatus(fetchStatus: string, storedDocumentAvailable: boolean): TitleChainTileViewModel["fetchStatus"] {
  if (storedDocumentAvailable) return "stored";
  if (fetchStatus === "stored" || fetchStatus === "linked" || fetchStatus === "matched") return "pending";
  if (fetchStatus === "failed") return "failed";
  if (fetchStatus === "manual_review") return "manual_review";
  return "pending";
}

function normalizeTileReferenceKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9:/# .-]+/g, "");
}

function getSourceHost(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function buildFriendlyChainTitle(
  referenceText: string | null | undefined,
  sourceReferenceText: string | null | undefined,
  storedDocumentTitle: string | null,
  originalExternalReference: string | null,
) {
  const candidates = [referenceText, sourceReferenceText, storedDocumentTitle];
  for (const candidate of candidates) {
    const normalized = normalizeFriendlyTitle(candidate);
    if (normalized) return normalized;
  }

  const readableUrlLabel = buildReadableTitleFromUrl(originalExternalReference);
  if (readableUrlLabel) return readableUrlLabel;

  const host = getSourceHost(originalExternalReference);
  return host ? `Recorded document from ${host}` : "Linked record";
}

function normalizeFriendlyTitle(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isSyntheticLinkedDocumentTitle(trimmed) || isTokenLikeOrUrlLike(trimmed)) return null;
  return trimmed;
}

export function isSyntheticLinkedDocumentTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  return /^linked document \d+$/.test(normalized)
    || /county recorded linked document \d+$/.test(normalized)
    || /^document \d+$/.test(normalized);
}

function isTokenLikeOrUrlLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("www.")) return true;
  if (trimmed.startsWith(".eJ")) return true;
  if (trimmed.length > 120) return true;
  return /^[A-Za-z0-9._-]{60,}$/.test(trimmed);
}

function buildReadableTitleFromUrl(url: string | null) {
  if (!url) return null;
  const decoded = decodeUrlTail(url);
  if (!decoded) return null;

  const receptionMatch = decoded.match(/el paso[_\s-]+(\d{4})[_\s-]+(\d{5,})/i);
  if (receptionMatch) {
    return `El Paso county recorded ${receptionMatch[1]} under reception no. ${receptionMatch[2]}`;
  }

  const bookPageMatch = decoded.match(/el paso[_\s-]+(\d{3,5})[_\s-]+(\d{2,5})/i);
  if (bookPageMatch) {
    return `El Paso county recorded at book ${bookPageMatch[1]} page ${bookPageMatch[2]}`;
  }

  const readable = decoded
    .replace(/[_+]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return readable && !isSyntheticLinkedDocumentTitle(readable) ? readable : null;
}

function decodeUrlTail(url: string) {
  const lastSegment = url.split("/").pop()?.split("?")[0] ?? "";
  const withoutExtension = lastSegment.replace(/\.[a-z0-9]+$/i, "");
  let current = withoutExtension;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }

  return current;
}

function truncateReference(value: string, limit = 40) {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
