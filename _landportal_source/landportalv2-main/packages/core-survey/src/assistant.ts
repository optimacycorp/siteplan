import type { TitleIntakeSummary } from "@landportal/core-documents";

import type { DescriptionReconstruction } from "./reconstruction";
import type { SurveyIssue } from "./validation";

export type SurveyCopilotSummary = {
  status: "ready" | "attention" | "blocked";
  confidenceLabel: "high" | "medium" | "low";
  headline: string;
  summary: string;
  nextActions: string[];
};

export function buildSurveyCopilotSummary(input: {
  titleSummary: TitleIntakeSummary;
  reconstruction: DescriptionReconstruction;
  issues: SurveyIssue[];
  ignoredLineCount: number;
}): SurveyCopilotSummary {
  const errorCount = input.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = input.issues.filter((issue) => issue.severity === "warning").length;
  const hasTitleCommitment = Boolean(input.titleSummary.primaryTitleCommitmentId);

  const status: SurveyCopilotSummary["status"] = errorCount > 0 || !hasTitleCommitment
    ? "blocked"
    : warningCount > 0
      ? "attention"
      : "ready";

  const confidenceLabel: SurveyCopilotSummary["confidenceLabel"] = errorCount > 0
    ? "low"
    : warningCount > 1 || input.ignoredLineCount > 0
      ? "medium"
      : "high";

  const headline = status === "ready"
    ? "Survey reconstruction is in a good review state."
    : status === "attention"
      ? "Survey reconstruction is usable, but still needs review."
      : "Survey reconstruction is not ready to promote yet.";

  const summary = hasTitleCommitment
    ? `${input.titleSummary.primaryTitleCommitmentTitle ?? "Primary title commitment"} anchors the current review package. ${input.reconstruction.parsedCallCount} calls were reconstructed with a closure error of ${input.reconstruction.closure.closureError.toFixed(3)} feet.`
    : `No primary title commitment is identified yet. ${input.reconstruction.parsedCallCount} calls were reconstructed with a closure error of ${input.reconstruction.closure.closureError.toFixed(3)} feet.`;

  const nextActions: string[] = [];

  if (!hasTitleCommitment) {
    nextActions.push("Mark a primary title commitment so the reconstruction is anchored to a legal source document.");
  }

  if (input.ignoredLineCount > 0) {
    nextActions.push(`Review the ${input.ignoredLineCount} unparsed line${input.ignoredLineCount === 1 ? "" : "s"} and convert them into bearing/distance calls.`);
  }

  if (!input.reconstruction.closure.withinTolerance) {
    nextActions.push("Resolve the closure error before promoting this reconstruction into a parcel or survey object.");
  }

  if (warningCount > 0 && input.reconstruction.closure.withinTolerance) {
    nextActions.push("Save the review to the survey log and cross-check the call sequence against deeds, plats, and prior surveys.");
  }

  if (!nextActions.length) {
    nextActions.push("Save the review to the survey log, then promote the reconstructed boundary into the next parcel-analysis step.");
  }

  return {
    status,
    confidenceLabel,
    headline,
    summary,
    nextActions,
  };
}
