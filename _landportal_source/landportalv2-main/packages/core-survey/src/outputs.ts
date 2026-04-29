import type { DescriptionReconstruction } from "./reconstruction";
import type { SurveyIssue } from "./validation";

type AuditEntryLike = {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
};

export type SurveyReviewSummaryModel = {
  title: string;
  summary: string;
  bullets: string[];
};

export function buildSurveyReviewSummary(
  label: string,
  reconstruction: DescriptionReconstruction,
  issues: SurveyIssue[],
): SurveyReviewSummaryModel {
  const severityLabel = issues.some((issue) => issue.severity === "error")
    ? "Errors present"
    : issues.some((issue) => issue.severity === "warning")
      ? "Warnings present"
      : "Informational review";

  return {
    title: `${label} survey review summary`,
    summary: `${label} reconstructed ${reconstruction.parsedCallCount} call${reconstruction.parsedCallCount === 1 ? "" : "s"} with a closure error of ${reconstruction.closure.closureError.toFixed(3)} feet. ${severityLabel}.`,
    bullets: [
      reconstruction.closure.precisionRatio
        ? `Precision ratio is approximately 1:${Math.round(reconstruction.closure.precisionRatio).toLocaleString()}.`
        : "Precision ratio is effectively perfect.",
      `${issues.length} survey finding${issues.length === 1 ? "" : "s"} logged during review.`,
      `Reconstructed point count: ${reconstruction.points.length}.`,
    ],
  };
}

export function renderSurveyReviewSummary(model: SurveyReviewSummaryModel): string {
  return [
    model.title,
    "=".repeat(model.title.length),
    "",
    model.summary,
    "",
    ...model.bullets.map((bullet) => `- ${bullet}`),
    "",
    "Generated from Land Portal survey review.",
  ].join("\n");
}

export function exportReconstructedPointsCsv(reconstruction: DescriptionReconstruction): string {
  const rows = [
    ["point_id", "label", "easting", "northing"].join(","),
  ];

  reconstruction.points.forEach((point) => {
    rows.push([
      point.id,
      point.label,
      point.x.toFixed(3),
      point.y.toFixed(3),
    ].join(","));
  });

  return rows.join("\n");
}

export function renderSurveyAuditTrail(auditTrail: AuditEntryLike[]): string {
  return [
    "Survey audit trail",
    "==================",
    "",
    ...(auditTrail.length
      ? auditTrail.map((entry) => `- ${entry.timestamp}: ${entry.action} :: ${entry.detail}`)
      : ["- No survey audit entries recorded yet."]),
    "",
    "Generated from Land Portal survey review.",
  ].join("\n");
}
