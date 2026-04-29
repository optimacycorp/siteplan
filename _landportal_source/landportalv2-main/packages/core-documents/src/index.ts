export type ReportDescriptor = {
  title: string;
  type: string;
  sourceEntityId?: string;
};

export type ExportJobStatus = "blocked" | "queued" | "running" | "completed" | "failed";
export type ExportReadiness = "ready" | "attention" | "blocked";
export type ExportSheetType = "yield_summary" | "subdivision_brief" | "concept_plan" | "title_review_memo" | "survey_review_memo";

export type ExportJobDescriptor = {
  exportType: ExportSheetType;
  title: string;
  description: string;
  status: ExportJobStatus;
  readiness: ExportReadiness;
  blockers: string[];
  highlights: string[];
};

export type ExportPlannerInput = {
  projectName: string;
  parcelCount: number;
  analyzedParcelCount: number;
  layoutCount: number;
  scenarioCount: number;
  sitePlanCount: number;
  readyDocumentCount: number;
  buildableAcres: number;
  bestUnitCount: number;
  parcelAnchorAttached?: boolean;
  titleCommitmentCount?: number;
  titleReferenceCount?: number;
  visitedTitleReferenceCount?: number;
  surveyParcelPromoted?: boolean;
  surveyIssueCount?: number;
};

export type SheetPreviewInput = {
  projectName: string;
  parcelName?: string;
  layoutName?: string;
  scenarioName?: string;
  lotCount: number;
  buildableAcres: number;
  documentCount: number;
};

export type SheetPreviewModel = {
  title: string;
  subtitle: string;
  notes: string[];
  stats: Array<{ label: string; value: string }>;
};

export type YieldSummaryInput = {
  projectName: string;
  parcelName?: string;
  buildableAcres: number;
  frontageFt: number;
  unitRange: string;
  recommendedStrategy?: string;
  scenarioCount: number;
};

export type YieldSummaryModel = {
  title: string;
  summary: string;
  bullets: string[];
};

export type SubdivisionBriefInput = {
  projectName: string;
  parcelName?: string;
  layoutName?: string;
  lotCount: number;
  yieldUnits: number;
  invalidLotCount: number;
  openSpacePercent?: number;
  warnings: string[];
};

export type SubdivisionBriefModel = {
  title: string;
  summary: string;
  bullets: string[];
};

export type TextExportModel = {
  title: string;
  summary: string;
  bullets: string[];
};

export type TitleReviewMemoInput = {
  projectName: string;
  parcelLabel?: string;
  parcelAnchorAttached: boolean;
  titleCommitmentTitle?: string;
  titleCommitmentCount: number;
  expectedReferenceCount: number;
  visitedReferenceCount: number;
  linkedDocumentCount: number;
};

export type SurveyReviewMemoInput = {
  projectName: string;
  parcelLabel?: string;
  surveyParcelId?: string;
  sourceLabel?: string;
  closureWithinTolerance: boolean;
  issueCount: number;
  auditEntryCount: number;
  legalDescriptionReady: boolean;
};

export type TitleDocumentInput = {
  id: string;
  title: string;
  type: string;
  status: string;
};

export type TitleIntakeSummary = {
  primaryTitleCommitmentId: string | null;
  primaryTitleCommitmentTitle: string | null;
  titleDocumentCount: number;
  supportingDocumentCount: number;
  reviewNeededCount: number;
  nextActions: string[];
};

export function buildExportPlan(input: ExportPlannerInput): ExportJobDescriptor[] {
  const parcelReady = input.analyzedParcelCount > 0;
  const layoutReady = input.layoutCount > 0;
  const scenarioReady = input.scenarioCount > 0;
  const sitePlanReady = input.sitePlanCount > 0;
  const titleReady = Boolean(input.parcelAnchorAttached) && (input.titleCommitmentCount ?? 0) > 0;
  const titleReferencesReady = (input.titleReferenceCount ?? 0) === 0
    ? false
    : (input.visitedTitleReferenceCount ?? 0) >= (input.titleReferenceCount ?? 0);
  const surveyReady = Boolean(input.surveyParcelPromoted) && (input.surveyIssueCount ?? 0) === 0;

  return [
    {
      exportType: "yield_summary",
      title: "Yield summary",
      description: "Summarize the selected parcel, yield range, and current scenario recommendation.",
      status: parcelReady && scenarioReady ? "queued" : "blocked",
      readiness: parcelReady && scenarioReady ? "ready" : parcelReady ? "attention" : "blocked",
      blockers: [
        !parcelReady ? "At least one parcel analysis is required." : null,
        !scenarioReady ? "Save a yield scenario before exporting a yield summary." : null,
      ].filter(Boolean) as string[],
      highlights: [
        `${input.scenarioCount} saved scenarios available.`,
        input.bestUnitCount ? `Best saved scenario currently reaches ${input.bestUnitCount} homes.` : "No saved unit outcome yet.",
      ],
    },
    {
      exportType: "subdivision_brief",
      title: "Subdivision brief",
      description: "Package the preferred layout, lot metrics, and design warnings for review.",
      status: parcelReady && layoutReady ? "queued" : "blocked",
      readiness: parcelReady && layoutReady ? "ready" : parcelReady ? "attention" : "blocked",
      blockers: [
        !parcelReady ? "Parcel intelligence must exist before a subdivision brief is credible." : null,
        !layoutReady ? "Save a subdivision layout before exporting a brief." : null,
      ].filter(Boolean) as string[],
      highlights: [
        `${input.layoutCount} saved layout concepts available.`,
        input.buildableAcres ? `${input.buildableAcres.toFixed(2)} buildable acres available to summarize.` : "Buildable acres not available yet.",
      ],
    },
    {
      exportType: "concept_plan",
      title: "Concept plan sheet",
      description: "Generate a presentation-ready sheet with plan graphics, title block, and project context.",
      status: parcelReady && layoutReady && sitePlanReady ? "queued" : "blocked",
      readiness: parcelReady && layoutReady && sitePlanReady ? "ready" : layoutReady ? "attention" : "blocked",
      blockers: [
        !parcelReady ? "Parcel intelligence is required for a trusted concept sheet." : null,
        !layoutReady ? "Pin a subdivision layout before composing the concept plan." : null,
        !sitePlanReady ? "A site plan layer set is needed before producing the concept sheet." : null,
      ].filter(Boolean) as string[],
      highlights: [
        `${input.sitePlanCount} site plan records available.`,
        `${input.readyDocumentCount} ready documents already exist in the project history.`,
      ],
    },
    {
      exportType: "title_review_memo",
      title: "Title review memo",
      description: "Summarize parcel anchoring, primary title commitment status, and visited supporting records.",
      status: titleReady ? "queued" : "blocked",
      readiness: titleReady && titleReferencesReady ? "ready" : titleReady ? "attention" : "blocked",
      blockers: [
        !input.parcelAnchorAttached ? "Attach a parcel anchor before exporting a title review memo." : null,
        !titleReady ? "A primary title commitment is required before this memo is credible." : null,
        titleReady && !titleReferencesReady ? "Expected title references still need matching visited documents." : null,
      ].filter(Boolean) as string[],
      highlights: [
        `${input.titleCommitmentCount ?? 0} title commitment${(input.titleCommitmentCount ?? 0) === 1 ? "" : "s"} recorded.`,
        `${input.visitedTitleReferenceCount ?? 0}/${input.titleReferenceCount ?? 0} expected references are currently matched.`,
      ],
    },
    {
      exportType: "survey_review_memo",
      title: "Survey review memo",
      description: "Package the active survey parcel, issue count, and review status for downstream design or document work.",
      status: input.surveyParcelPromoted ? "queued" : "blocked",
      readiness: surveyReady ? "ready" : input.surveyParcelPromoted ? "attention" : "blocked",
      blockers: [
        !input.surveyParcelPromoted ? "Promote a survey parcel before exporting a survey review memo." : null,
        input.surveyParcelPromoted && (input.surveyIssueCount ?? 0) > 0 ? "Resolve or accept active survey issues before finalizing the memo." : null,
      ].filter(Boolean) as string[],
      highlights: [
        input.surveyParcelPromoted ? "An active survey parcel is available for review." : "No active survey parcel is available yet.",
        `${input.surveyIssueCount ?? 0} survey issue${(input.surveyIssueCount ?? 0) === 1 ? "" : "s"} currently open.`,
      ],
    },
  ];
}

export function buildSheetPreviewModel(input: SheetPreviewInput): SheetPreviewModel {
  return {
    title: input.projectName,
    subtitle: `${input.parcelName ?? "Parcel"} concept sheet`,
    notes: [
      input.layoutName ? `Primary layout: ${input.layoutName}` : "No layout pinned yet.",
      input.scenarioName ? `Scenario context: ${input.scenarioName}` : "No saved scenario pinned yet.",
      "Generated from live project records in Land Portal.",
    ],
    stats: [
      { label: "Parcel", value: input.parcelName ?? "N/A" },
      { label: "Lots shown", value: String(input.lotCount) },
      { label: "Buildable area", value: `${input.buildableAcres.toFixed(2)} ac` },
      { label: "Documents", value: String(input.documentCount) },
    ],
  };
}

export function buildYieldSummaryModel(input: YieldSummaryInput): YieldSummaryModel {
  return {
    title: `${input.projectName} yield summary`,
    summary: `${input.parcelName ?? "Active parcel"} currently supports an expected yield range of ${input.unitRange} homes across ${input.buildableAcres.toFixed(2)} buildable acres.`,
    bullets: [
      `Frontage under review: ${input.frontageFt.toFixed(0)} ft.`,
      input.recommendedStrategy ? `Recommended layout strategy: ${input.recommendedStrategy.replaceAll("_", " ")}.` : "No layout strategy has been recommended yet.",
      `${input.scenarioCount} saved scenario${input.scenarioCount === 1 ? "" : "s"} available for comparison.`,
    ],
  };
}

export function buildSubdivisionBriefModel(input: SubdivisionBriefInput): SubdivisionBriefModel {
  return {
    title: `${input.projectName} subdivision brief`,
    summary: `${input.layoutName ?? "Active layout"} currently shows ${input.lotCount} lots and ${input.yieldUnits} units${typeof input.openSpacePercent === "number" ? ` with ${input.openSpacePercent}% open space` : ""}.`,
    bullets: [
      input.parcelName ? `Source parcel: ${input.parcelName}.` : "No source parcel is pinned.",
      input.invalidLotCount ? `${input.invalidLotCount} lots still fail the active ruleset.` : "No invalid lots are flagged in the active layout.",
      input.warnings.length ? `Primary warning: ${input.warnings[0]}` : "No layout warnings are currently recorded.",
    ],
  };
}

export function buildTitleReviewMemoModel(input: TitleReviewMemoInput): TextExportModel {
  return {
    title: `${input.projectName} title review memo`,
    summary: `${input.parcelLabel ?? "Active parcel"} currently has ${input.titleCommitmentCount} title commitment${input.titleCommitmentCount === 1 ? "" : "s"} recorded, with ${input.visitedReferenceCount} of ${input.expectedReferenceCount} expected references matched to visited documents.`,
    bullets: [
      input.parcelAnchorAttached ? "A parcel anchor is attached to this review set." : "No parcel anchor is attached to this review set yet.",
      input.titleCommitmentTitle ? `Primary title commitment: ${input.titleCommitmentTitle}.` : "No primary title commitment is assigned.",
      `${input.linkedDocumentCount} linked supporting document${input.linkedDocumentCount === 1 ? "" : "s"} are attached to the active title commitment.`,
    ],
  };
}

export function buildSurveyReviewMemoModel(input: SurveyReviewMemoInput): TextExportModel {
  return {
    title: `${input.projectName} survey review memo`,
    summary: `${input.parcelLabel ?? "Active parcel"} is currently reviewed through survey parcel ${input.surveyParcelId ?? "not promoted"}, sourced from ${input.sourceLabel ?? "pending review"}, with ${input.issueCount} open survey issue${input.issueCount === 1 ? "" : "s"}.`,
    bullets: [
      input.closureWithinTolerance ? "The active survey parcel closes within tolerance." : "The active survey parcel is outside closure tolerance and needs review.",
      `${input.auditEntryCount} survey audit entr${input.auditEntryCount === 1 ? "y" : "ies"} are logged for this project.`,
      input.legalDescriptionReady ? "A draft legal description can be generated from the active survey parcel." : "A draft legal description is not ready yet.",
    ],
  };
}

export function renderTextExport(model: TextExportModel): string {
  return [
    model.title,
    "=".repeat(model.title.length),
    "",
    model.summary,
    "",
    ...model.bullets.map((bullet) => `- ${bullet}`),
    "",
    "Generated from Land Portal project records.",
  ].join("\n");
}

export function renderSheetPreviewHtml(model: SheetPreviewModel): string {
  const rows = model.stats
    .map((stat) => `<tr><td>${escapeHtml(stat.label)}</td><td>${escapeHtml(stat.value)}</td></tr>`)
    .join("");
  const notes = model.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(model.title)}</title>
    <style>
      body { font-family: Georgia, serif; margin: 32px; color: #1f2937; }
      .sheet { border: 2px solid #1f2937; padding: 24px; min-height: 720px; position: relative; background: #fffdf7; }
      h1 { margin: 0 0 6px; font-size: 28px; }
      .subtitle { color: #6b7280; margin-bottom: 18px; }
      table { border-collapse: collapse; width: 320px; margin-top: 18px; }
      td { border: 1px solid #d1d5db; padding: 8px 10px; }
      td:first-child { font-weight: 700; width: 45%; }
      .notes { margin-top: 18px; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>${escapeHtml(model.title)}</h1>
      <div class="subtitle">${escapeHtml(model.subtitle)}</div>
      <table>${rows}</table>
      <div class="notes">
        <strong>Notes</strong>
        <ul>${notes}</ul>
      </div>
    </div>
  </body>
</html>`;
}

export function buildTitleIntakeSummary(documents: TitleDocumentInput[]): TitleIntakeSummary {
  const titleDocuments = documents.filter((document) => isTitleDocument(document));
  const supportingDocuments = documents.filter((document) => isSupportingRecord(document));
  const reviewNeeded = documents.filter((document) => document.status !== "ready");
  const primaryTitleCommitment = titleDocuments.find((document) => document.type === "title_commitment")
    ?? titleDocuments.find((document) => /title/i.test(document.title))
    ?? null;

  return {
    primaryTitleCommitmentId: primaryTitleCommitment?.id ?? null,
    primaryTitleCommitmentTitle: primaryTitleCommitment?.title ?? null,
    titleDocumentCount: titleDocuments.length,
    supportingDocumentCount: supportingDocuments.length,
    reviewNeededCount: reviewNeeded.length,
    nextActions: [
      primaryTitleCommitment ? `Primary title commitment identified: ${primaryTitleCommitment.title}.` : "Upload or mark a primary title commitment to anchor the record stack.",
      supportingDocuments.length ? `${supportingDocuments.length} supporting record documents are available for cross-checking.` : "Add deeds, surveys, plats, or opinion letters to strengthen the title package.",
      reviewNeeded.length ? `${reviewNeeded.length} document${reviewNeeded.length === 1 ? "" : "s"} still need review or processing.` : "All current documents are in a reviewable state.",
    ],
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isTitleDocument(document: TitleDocumentInput) {
  return document.type === "title_commitment" || /title|schedule a|schedule b/i.test(document.title);
}

function isSupportingRecord(document: TitleDocumentInput) {
  return ["survey", "plat", "easement", "agency_letter", "opinion_letter", "deed", "ilc", "record_of_survey"].includes(document.type);
}
