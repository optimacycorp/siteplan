export type ParsedCommitmentFields = {
  orderNumber: string | null;
  commitmentNumber: string | null;
  dateOfIssue: string | null;
  effectiveDateIso: string | null;
  effectiveDateText: string | null;
  propertyAddress: string | null;
  issuingCompany: string | null;
  fullPropertyDescription: string | null;
};

export type ParsedLinkedReference = {
  referenceText: string;
  referenceKey: string;
  sourcePage: number | null;
  sourceSection: "chain_of_title" | "schedule_b_requirement" | "schedule_b_exception" | "unknown";
  originalUrl: string | null;
  matchConfidence: number | null;
  fetchStatus: "pending" | "matched" | "manual_review";
};

export type ExtractedPdfAnnotationLink = {
  pageNumber: number | null;
  url: string;
  nearbyText: string | null;
  normalizedReferenceKey: string;
  matchConfidence: number | null;
  annotationRect: [number, number, number, number] | null;
};

export type PdfTextPage = {
  pageNumber: number;
  text: string;
  lines: string[];
};

export type ParsedChainTextEntry = {
  referenceText: string;
  referenceKey: string;
  sourcePage: number | null;
  sourceSection: ParsedLinkedReference["sourceSection"];
};

export type ExtractedCommitmentData = {
  parsedFields: ParsedCommitmentFields;
  linkedReferences: ParsedLinkedReference[];
  annotationLinks: ExtractedPdfAnnotationLink[];
  pdfTextPages: PdfTextPage[];
};

type RawPageChunk = {
  pageNumber: number;
  raw: string;
  startIndex: number;
  endIndex: number;
};

export async function extractCommitmentData(file: File): Promise<ExtractedCommitmentData> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return extractCommitmentDataFromBytes(bytes);
}

export function extractCommitmentDataFromBytes(bytes: Uint8Array): ExtractedCommitmentData {
  const rawText = normalizePdfText(new TextDecoder("latin1").decode(bytes));
  const pdfTextPages = extractPdfTextPages(bytes);
  const parsedFields = mergeParsedCommitmentFields(
    extractCommitmentFields(pdfTextPages),
    extractCommitmentFieldsFromRawText(rawText),
  );
  const textEntries = extractChainTextEntries(pdfTextPages);
  const annotationLinks = extractPdfAnnotationLinks(bytes);
  const linkedReferences = matchLinksToEntries(textEntries, annotationLinks);

  return {
    parsedFields,
    linkedReferences,
    annotationLinks,
    pdfTextPages,
  };
}

export function extractCommitmentFields(pdfTextPages: PdfTextPage[]): ParsedCommitmentFields {
  const joined = pdfTextPages.map((page) => page.text).join("\n");
  return extractCommitmentFieldsFromJoinedText(joined);
}

function extractCommitmentFieldsFromRawText(rawText: string): ParsedCommitmentFields {
  return extractCommitmentFieldsFromJoinedText(rawText);
}

function extractCommitmentFieldsFromJoinedText(joined: string): ParsedCommitmentFields {
  const issueDateText = cleanField(
    matchGroup(
      joined,
      /Date of Issue:?\s*(.+?)(?:Effective Date:|Full Property Description:|Property Address:|Chain of Title Documents:|Schedule A|$)/is,
    ),
  );
  const effectiveDateText = cleanField(
    matchGroup(
      joined,
      /Effective Date:?\s*(.+?)(?:Date of Issue:|Property Address:|Full Property Description:|Chain of Title Documents:|$)/is,
    ),
  );

  return {
    orderNumber: nonEmpty(matchGroup(joined, /Order Number:?\s*([A-Z0-9-]+)/i)),
    commitmentNumber: nonEmpty(
      matchGroup(joined, /Schedule\s*\(?(?:Account)?\)?\s*No\.?:?\s*([A-Z0-9-]+)/i),
    ),
    dateOfIssue: parseFlexibleDate(issueDateText),
    effectiveDateIso: parseFlexibleDate(effectiveDateText) ?? parseFlexibleDate(issueDateText),
    effectiveDateText: nonEmpty(effectiveDateText),
    propertyAddress: nonEmpty(
      cleanField(
        matchGroup(
          joined,
          /Property Address:?\s*(.+?)(?:Schedule\s*\(?(?:Account)?\)?\s*No\.?:|Date of Issue:|Effective Date:|Full Property Description:|Chain of Title Documents:|$)/is,
        ),
      ),
    ),
    issuingCompany: nonEmpty(
      cleanField(
        matchGroup(
          joined,
          /(?:Issued By|Issuing Company|Company):?\s*(.+?)(?:Order Number:|Property Address:|Schedule\s*\(?(?:Account)?\)?\s*No\.?:|$)/is,
        ),
      ),
    ),
    fullPropertyDescription: nonEmpty(
      cleanField(
        matchGroup(
          joined,
          /Full Property Description:?\s*(.+?)(?:Chain of Title Documents:|Supplemental Information|Schedule B|$)/is,
        ),
      ),
    ),
  };
}

function mergeParsedCommitmentFields(
  primary: ParsedCommitmentFields,
  fallback: ParsedCommitmentFields,
): ParsedCommitmentFields {
  return {
    orderNumber: primary.orderNumber || fallback.orderNumber,
    commitmentNumber: primary.commitmentNumber || fallback.commitmentNumber,
    dateOfIssue: primary.dateOfIssue || fallback.dateOfIssue,
    effectiveDateIso: primary.effectiveDateIso || fallback.effectiveDateIso,
    effectiveDateText: primary.effectiveDateText || fallback.effectiveDateText,
    propertyAddress: primary.propertyAddress || fallback.propertyAddress,
    issuingCompany: primary.issuingCompany || fallback.issuingCompany,
    fullPropertyDescription: primary.fullPropertyDescription || fallback.fullPropertyDescription,
  };
}

export function extractChainTextEntries(pdfTextPages: PdfTextPage[]): ParsedChainTextEntry[] {
  const entries: ParsedChainTextEntry[] = [];

  for (const page of pdfTextPages) {
    const section = extractChainBlock(page.lines);
    for (const line of section) {
      const referenceText = cleanField(line);
      if (!referenceText) continue;

      entries.push({
        referenceText,
        referenceKey: normalizeReferenceKey(referenceText),
        sourcePage: page.pageNumber,
        sourceSection: "chain_of_title",
      });
    }
  }

  return dedupeEntries(entries);
}

export function extractPdfAnnotationLinks(pdfBytes: Uint8Array): ExtractedPdfAnnotationLink[] {
  const raw = new TextDecoder("latin1").decode(pdfBytes);
  const pageChunks = extractRawPageChunks(raw);
  const linksByUrl = new Map<string, ExtractedPdfAnnotationLink>();
  const annotationMatches = Array.from(
    raw.matchAll(/\/Rect\s*\[([^[\]]+)\][\s\S]{0,1200}?\/URI\s*\((https?:\/\/[^)]+)\)/gi),
  );
  const uriMatches = Array.from(raw.matchAll(/\/URI\s*\((https?:\/\/[^)]+)\)/gi));
  const plainMatches = Array.from(raw.matchAll(/https?:\/\/[^\s<>"')\\]+/gi));

  for (const match of annotationMatches) {
    const url = match[2];
    if (!url || linksByUrl.has(url)) continue;

    const matchIndex = match.index ?? -1;
    const pageChunk = pageChunks.find((entry) => matchIndex >= entry.startIndex && matchIndex < entry.endIndex) ?? null;
    const nearbyText = pageChunk ? extractNearbyVisibleText(pageChunk.raw, url) : null;

    linksByUrl.set(url, {
      pageNumber: pageChunk?.pageNumber ?? null,
      url,
      nearbyText,
      normalizedReferenceKey: normalizeReferenceKey(nearbyText ?? ""),
      matchConfidence: nearbyText ? 0.8 : 0.45,
      annotationRect: parseAnnotationRect(match[1]),
    });
  }

  const rawMatches = [...uriMatches, ...plainMatches];
  for (const match of rawMatches) {
    const url = match[1] ?? match[0];
    if (!url || linksByUrl.has(url)) continue;

    const matchIndex = match.index ?? -1;
    const pageChunk =
      pageChunks.find((entry) => entry.raw.includes(url))
      ?? pageChunks.find((entry) => matchIndex >= entry.startIndex && matchIndex < entry.endIndex)
      ?? null;

    const nearbyText = pageChunk ? extractNearbyVisibleText(pageChunk.raw, url) : null;
    linksByUrl.set(url, {
      pageNumber: pageChunk?.pageNumber ?? null,
      url,
      nearbyText,
      normalizedReferenceKey: normalizeReferenceKey(nearbyText ?? ""),
      matchConfidence: nearbyText ? 0.72 : 0.35,
      annotationRect: null,
    });
  }

  return Array.from(linksByUrl.values());
}

export function matchLinksToEntries(
  entries: ParsedChainTextEntry[],
  links: ExtractedPdfAnnotationLink[],
): ParsedLinkedReference[] {
  if (!entries.length) {
    return synthesizeLinkedReferencesFromAnnotationStack(links);
  }

  return entries.map((entry) => {
    const scoredLinks = links.map((link) => ({
      link,
      score: scoreLinkMatch(entry, link),
    }));

    const bestMatch = scoredLinks.sort((left, right) => right.score - left.score)[0] ?? null;
    const isMatched = Boolean(bestMatch && bestMatch.link.url && bestMatch.score >= 0.55);

    return {
      referenceText: entry.referenceText,
      referenceKey: entry.referenceKey,
      sourcePage: entry.sourcePage,
      sourceSection: entry.sourceSection,
      originalUrl: isMatched ? bestMatch?.link.url ?? null : null,
      matchConfidence: isMatched ? clampScore(bestMatch?.score ?? null) : null,
      fetchStatus: isMatched ? "matched" : "manual_review",
    };
  });
}

function extractPdfTextPages(pdfBytes: Uint8Array): PdfTextPage[] {
  const raw = new TextDecoder("latin1").decode(pdfBytes);
  const pageChunks = extractRawPageChunks(raw);

  if (!pageChunks.length) {
    const text = normalizePdfText(raw);
    return [{ pageNumber: 1, text, lines: splitLines(text) }];
  }

  return pageChunks.map((chunk) => {
    const text = normalizePdfText(chunk.raw);
    return {
      pageNumber: chunk.pageNumber,
      text,
      lines: splitLines(text),
    };
  });
}

function extractRawPageChunks(raw: string): RawPageChunk[] {
  const pageChunks: RawPageChunk[] = [];
  const pagePattern = /\/Type\s*\/Page\b/g;
  const matches = Array.from(raw.matchAll(pagePattern));

  for (let index = 0; index < matches.length; index += 1) {
    const startIndex = matches[index].index ?? 0;
    const endIndex = matches[index + 1]?.index ?? raw.length;
    pageChunks.push({
      pageNumber: index + 1,
      raw: raw.slice(startIndex, endIndex),
      startIndex,
      endIndex,
    });
  }

  return pageChunks;
}

function extractChainBlock(lines: string[]) {
  const startIndex = lines.findIndex((line) => /Chain of Title Documents:/i.test(line));
  if (startIndex === -1) return [];

  const block: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = cleanField(lines[index]);
    if (/^Copyright|^ALTA COMMITMENT|^Property Address:|^Schedule A|^Schedule B|^Supplemental Information/i.test(line)) break;
    if (line.length > 12) block.push(line);
  }
  return block;
}

function extractNearbyVisibleText(rawPageChunk: string, url: string) {
  const normalizedPage = normalizePdfText(rawPageChunk);
  const lines = splitLines(normalizedPage);
  const directLineIndex = lines.findIndex((line) => line.includes(url));

  if (directLineIndex >= 0) {
    return lines[directLineIndex - 1] ?? lines[directLineIndex] ?? null;
  }

  const chainIndex = lines.findIndex((line) => /Chain of Title Documents:/i.test(line));
  if (chainIndex >= 0) {
    return lines[chainIndex + 1] ?? null;
  }

  return null;
}

function synthesizeLinkedReferencesFromAnnotationStack(links: ExtractedPdfAnnotationLink[]) {
  const bestStack = selectBestChainAnnotationStack(links);
  const countyLabel = deriveCountyRecordedLabel(bestStack);
  return bestStack.map((link, index) => {
    const referenceText = deriveReferenceTextFromUrl(link.url, index + 1, countyLabel);

    return {
      referenceText,
      referenceKey: normalizeReferenceKey(`${referenceText} ${deriveReferenceIdentity(link.url, index + 1)}`),
      sourcePage: link.pageNumber,
      sourceSection: "chain_of_title" as const,
      originalUrl: link.url,
      matchConfidence: clampScore(link.matchConfidence ?? 0.65),
      fetchStatus: "matched" as const,
    };
  });
}

function selectBestChainAnnotationStack(links: ExtractedPdfAnnotationLink[]) {
  const candidates = links.filter((link) => isLikelyChainDocumentUrl(link.url));
  const grouped = new Map<number, ExtractedPdfAnnotationLink[]>();

  for (const link of candidates) {
    const pageNumber = link.pageNumber ?? 0;
    const bucket = grouped.get(pageNumber) ?? [];
    bucket.push(link);
    grouped.set(pageNumber, bucket);
  }

  const pageStacks = Array.from(grouped.values())
    .map((pageLinks) => alignAnnotationStack(pageLinks))
    .filter((pageLinks) => pageLinks.length > 0)
    .sort((left, right) => right.length - left.length);

  if (pageStacks[0]?.length) {
    return pageStacks[0];
  }

  return candidates.slice(0, 10);
}

function alignAnnotationStack(links: ExtractedPdfAnnotationLink[]) {
  const withRects = links.filter((link) => link.annotationRect);
  if (withRects.length < 3) {
    return [...links].sort(compareAnnotationLinks);
  }

  const anchors = withRects
    .map((link) => link.annotationRect?.[0] ?? null)
    .filter((value): value is number => value != null);
  const anchorX = anchors.sort((left, right) => left - right)[Math.floor(anchors.length / 2)] ?? 0;

  return withRects
    .filter((link) => {
      const rect = link.annotationRect;
      if (!rect) return false;
      return Math.abs(rect[0] - anchorX) <= 12;
    })
    .sort(compareAnnotationLinks);
}

function compareAnnotationLinks(left: ExtractedPdfAnnotationLink, right: ExtractedPdfAnnotationLink) {
  const leftY = left.annotationRect?.[1] ?? -Infinity;
  const rightY = right.annotationRect?.[1] ?? -Infinity;
  return rightY - leftY;
}

function isLikelyChainDocumentUrl(url: string) {
  const normalized = url.toLowerCase();
  if (!normalized.startsWith("http")) return false;
  if (normalized.includes("ltgc.com/") && !normalized.includes("recorded_document")) return false;
  return normalized.includes("recorded_document")
    || normalized.includes("download")
    || normalized.endsWith(".pdf");
}

function deriveReferenceTextFromUrl(url: string, index: number, countyLabel: string) {
  const decoded = decodeUrlLabel(url);
  const readableUrlLabel = buildReadableUrlReferenceText(decoded);
  if (readableUrlLabel) {
    return readableUrlLabel;
  }

  const receptionMatch = decoded.match(/\b(19|20)\d{2}[_ -]?(\d{5,})\b/);
  if (receptionMatch) {
    return `${countyLabel} ${receptionMatch[1]} under reception no. ${receptionMatch[2]}`;
  }

  const bookPageMatch = decoded.match(/\b(\d{3,5})[_ -](\d{2,5})\b/);
  if (bookPageMatch) {
    return `${countyLabel} at book ${bookPageMatch[1]} page ${bookPageMatch[2]}`;
  }

  if (decoded && !looksEncodedToken(decoded)) {
    return decoded;
  }

  return `${countyLabel} linked document ${index}`;
}

function buildReadableUrlReferenceText(decoded: string) {
  const normalized = decoded.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/^el paso county recorded /i.test(normalized)) return normalized;
  return null;
}

function deriveReferenceIdentity(url: string, index: number) {
  const decoded = decodeUrlLabel(url);
  const tokens = decoded.match(/\d{4,}/g);
  if (tokens?.length) return tokens.join("-");
  return `chain-${index}`;
}

function decodeUrlLabel(url: string) {
  const lastSegment = url.split("/").pop()?.split("?")[0] ?? "";
  const withoutExtension = lastSegment.replace(/\.[a-z0-9]+$/i, "");
  const repeatedlyDecoded = decodeRepeatedly(withoutExtension)
    .replace(/[_+]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return repeatedlyDecoded;
}

function deriveCountyRecordedLabel(links: ExtractedPdfAnnotationLink[]) {
  const decodedLabels = links.map((link) => decodeUrlLabel(link.url));
  const countyMatch = decodedLabels
    .map((label) => label.match(/\b([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+Paso\b/i) || label.match(/\b([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+county\b/i))
    .find(Boolean);

  if (countyMatch?.[0]) {
    const normalized = countyMatch[0].replace(/\s+/g, " ").trim();
    if (/county/i.test(normalized)) return `${normalized} recorded`;
    return `${normalized} county recorded`;
  }

  return "El Paso county recorded";
}

function looksEncodedToken(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  return normalized.startsWith(".eJ")
    || normalized.length > 60
    || /^[A-Za-z0-9._-]+$/.test(normalized);
}

function decodeRepeatedly(value: string) {
  let current = value;
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

function parseAnnotationRect(rawRect: string) {
  const values = rawRect
    .trim()
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (values.length !== 4) return null;
  return [values[0], values[1], values[2], values[3]] as [number, number, number, number];
}

function scoreLinkMatch(entry: ParsedChainTextEntry, link: ExtractedPdfAnnotationLink) {
  let score = 0;

  if (entry.sourcePage != null && link.pageNumber != null && entry.sourcePage === link.pageNumber) {
    score += 0.4;
  }

  if (link.normalizedReferenceKey && link.normalizedReferenceKey === entry.referenceKey) {
    score += 0.4;
  }

  const referenceTokenMatch = compareReferenceTokens(entry.referenceText, link.nearbyText ?? "");
  score += referenceTokenMatch;

  const fuzzySimilarity = compareTokenSimilarity(entry.referenceText, link.nearbyText ?? "");
  score += fuzzySimilarity * 0.15;

  return score;
}

function compareReferenceTokens(entryText: string, nearbyText: string) {
  const entryTokens = extractReferenceTokens(entryText);
  const nearbyTokens = extractReferenceTokens(nearbyText);
  if (!entryTokens.length || !nearbyTokens.length) return 0;

  const overlap = entryTokens.filter((token) => nearbyTokens.includes(token)).length;
  if (!overlap) return 0;

  const ratio = overlap / Math.max(entryTokens.length, nearbyTokens.length);
  return Math.min(0.35, ratio * 0.35);
}

function compareTokenSimilarity(leftText: string, rightText: string) {
  const leftTokens = tokenizeForSimilarity(leftText);
  const rightTokens = tokenizeForSimilarity(rightText);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
  return overlap / Math.max(leftTokens.length, rightTokens.length);
}

function extractReferenceTokens(value: string) {
  const normalized = value.toLowerCase();
  return Array.from(
    new Set(
      [
        ...Array.from(normalized.matchAll(/\b\d{5,}\b/g)).map((match) => match[0]),
        ...Array.from(normalized.matchAll(/\bbook\s*\d+\b/gi)).map((match) => match[0]),
        ...Array.from(normalized.matchAll(/\bpage\s*\d+\b/gi)).map((match) => match[0]),
      ],
    ),
  );
}

function tokenizeForSimilarity(value: string) {
  return normalizeReferenceKey(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function dedupeEntries(entries: ParsedChainTextEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.sourceSection}:${entry.referenceKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePdfText(value: string) {
  return value
    .replaceAll("\u0000", " ")
    .replace(/\r/g, "\n")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLines(value: string) {
  return value
    .split(/\n+/)
    .map((line) => cleanField(line))
    .filter(Boolean);
}

function parseFlexibleDate(value: string) {
  if (!value) return null;

  const verboseMatch = value.match(/(\d{1,2})(?:st|nd|rd|th)?\s+day\s+of\s+([A-Za-z]+)(?:\s+A\.?D\.?)?\s+(\d{4})/i);
  if (verboseMatch) {
    return buildIsoDate(verboseMatch[1], verboseMatch[2], verboseMatch[3]);
  }

  const slashMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }

  const simpleMatch = value.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (simpleMatch) {
    return buildIsoDate(simpleMatch[2], simpleMatch[1], simpleMatch[3]);
  }

  return null;
}

function buildIsoDate(dayValue: string, monthName: string, yearValue: string) {
  const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
  if (Number.isNaN(monthIndex)) return null;
  const day = Number(dayValue);
  const year = Number(yearValue);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;
  return `${year.toString().padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function matchGroup(value: string, pattern: RegExp) {
  return pattern.exec(value)?.[1]?.trim() ?? "";
}

function cleanField(value: string) {
  return value
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function nonEmpty(value: string) {
  return value ? value : null;
}

function clampScore(value: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function normalizeReferenceKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9:/# .-]+/g, "");
}
