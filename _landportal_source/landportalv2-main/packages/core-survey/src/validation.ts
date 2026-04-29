import type { DescriptionReconstruction } from "./reconstruction";

export type SurveyIssueSeverity = "error" | "warning" | "info";

export type SurveyIssue = {
  id: string;
  severity: SurveyIssueSeverity;
  code: string;
  message: string;
  source: "parcel" | "description" | "alignment" | "control";
};

export function reviewDescriptionReconstruction(
  reconstruction: DescriptionReconstruction,
  ignoredLineCount = 0,
): SurveyIssue[] {
  const issues: SurveyIssue[] = [];

  if (reconstruction.parsedCallCount < 3) {
    issues.push({
      id: "description-too-short",
      severity: "warning",
      code: "DESCRIPTION_TOO_SHORT",
      message: "Fewer than three calls were parsed, so the description is not yet usable as a parcel boundary.",
      source: "description",
    });
  }

  if (ignoredLineCount > 0) {
    issues.push({
      id: "description-unparsed-lines",
      severity: "warning",
      code: "UNPARSED_LINES",
      message: `${ignoredLineCount} line${ignoredLineCount === 1 ? "" : "s"} could not be parsed into survey calls.`,
      source: "description",
    });
  }

  if (!reconstruction.closure.withinTolerance) {
    issues.push({
      id: "description-nonclosure",
      severity: "error",
      code: "NON_CLOSING_DESCRIPTION",
      message: `Reconstructed geometry has a closure error of ${reconstruction.closure.closureError.toFixed(3)} feet.`,
      source: "description",
    });
  } else {
    issues.push({
      id: "description-closure-pass",
      severity: "info",
      code: "CLOSURE_WITHIN_TOLERANCE",
      message: "Reconstructed geometry closes within the default survey tolerance.",
      source: "description",
    });
  }

  if (reconstruction.closure.precisionRatio && reconstruction.closure.precisionRatio < 5000) {
    issues.push({
      id: "description-low-precision",
      severity: "warning",
      code: "LOW_PRECISION_RATIO",
      message: `Closure precision is approximately 1:${Math.round(reconstruction.closure.precisionRatio).toLocaleString()}, which should be reviewed before finalizing.`,
      source: "description",
    });
  }

  return issues;
}
