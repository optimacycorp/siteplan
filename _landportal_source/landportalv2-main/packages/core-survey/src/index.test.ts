import { describe, expect, it } from "vitest";

import { bearingFromPoints, buildSurveyCopilotSummary, buildSurveyParcel, buildSurveyReviewSummary, exportReconstructedPointsCsv, generateDraftLegalDescription, parseDescriptionCalls, reconstructDescriptionBoundary, renderSurveyAuditTrail, reviewDescriptionReconstruction, renderSurveyReviewSummary, validateClosure } from "./index";

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe("core-survey engine", () => {
  it("computes a quadrant bearing label from points", () => {
    const result = bearingFromPoints({ x: 0, y: 0 }, { x: 100, y: 100 });
    expect(result.label).toContain("N");
    expect(result.label).toContain("E");
  });

  it("builds a survey parcel with closure metrics", () => {
    const parcel = buildSurveyParcel("parcel-1", square);
    expect(parcel.area).toBe(10000);
    expect(parcel.closure.withinTolerance).toBe(true);
    expect(parcel.bearings).toHaveLength(4);
  });

  it("flags non-closing geometry", () => {
    const result = validateClosure([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 5, y: 110 },
    ], 0.01);

    expect(result.withinTolerance).toBe(false);
    expect(result.closureError).toBeGreaterThan(0);
  });

  it("generates a draft legal description", () => {
    const description = generateDraftLegalDescription("Test Parcel", square);
    expect(description).toContain("Draft legal description");
    expect(description).toContain("Point of Beginning");
    expect(description).toContain("Thence");
  });

  it("parses description calls and reconstructs a closing boundary", () => {
    const calls = parseDescriptionCalls([
      "Thence N 90 deg 00'00\" E 100.00 feet",
      "Thence N 00 deg 00'00\" E 100.00 feet",
      "Thence S 90 deg 00'00\" W 100.00 feet",
      "Thence S 00 deg 00'00\" W 100.00 feet",
    ].join("\n"));

    const reconstruction = reconstructDescriptionBoundary(calls);

    expect(calls).toHaveLength(4);
    expect(reconstruction.points).toHaveLength(5);
    expect(reconstruction.closure.withinTolerance).toBe(true);
  });

  it("builds survey review outputs from reconstructed geometry", () => {
    const calls = parseDescriptionCalls([
      "Thence N 90 deg 00'00\" E 100.00 feet",
      "Thence N 00 deg 00'00\" E 100.00 feet",
      "Thence S 90 deg 00'00\" W 100.00 feet",
      "Thence S 00 deg 00'00\" W 100.00 feet",
    ].join("\n"));
    const reconstruction = reconstructDescriptionBoundary(calls);
    const issues = reviewDescriptionReconstruction(reconstruction, 0);
    const model = buildSurveyReviewSummary("Test Parcel", reconstruction, issues);
    const text = renderSurveyReviewSummary(model);
    const csv = exportReconstructedPointsCsv(reconstruction);

    expect(text).toContain("survey review summary");
    expect(csv).toContain("point_id,label,easting,northing");
    expect(csv).toContain("pob,POB");
    expect(renderSurveyAuditTrail([])).toContain("No survey audit entries");
  });

  it("builds a survey copilot summary from title and review state", () => {
    const calls = parseDescriptionCalls([
      "Thence N 90 deg 00'00\" E 100.00 feet",
      "Thence N 00 deg 00'00\" E 100.00 feet",
      "Thence S 90 deg 00'00\" W 100.00 feet",
      "Thence S 00 deg 00'00\" W 100.00 feet",
    ].join("\n"));
    const reconstruction = reconstructDescriptionBoundary(calls);
    const issues = reviewDescriptionReconstruction(reconstruction, 0);
    const copilot = buildSurveyCopilotSummary({
      titleSummary: {
        primaryTitleCommitmentId: "doc-1",
        primaryTitleCommitmentTitle: "Commitment for Title Insurance",
        titleDocumentCount: 1,
        supportingDocumentCount: 2,
        reviewNeededCount: 0,
        nextActions: [],
      },
      reconstruction,
      issues,
      ignoredLineCount: 0,
    });

    expect(copilot.confidenceLabel).toBe("high");
    expect(copilot.nextActions[0]).toContain("Save the review");
  });
});
