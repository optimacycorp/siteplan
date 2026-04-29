import { describe, expect, it } from "vitest";

import { processParcel } from "./index";

function rectangleBoundary(width: number, height: number) {
  return {
    type: "Polygon" as const,
    coordinates: [[
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
      [0, 0],
    ]],
  };
}

describe("processParcel", () => {
  it("produces a persisted-ready parcel intelligence result", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-1",
      boundary: rectangleBoundary(160, 90),
      constraints: [
        {
          constraintType: "row",
          label: "Road edge",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [0, -8],
              [160, -8],
              [160, 4],
              [0, 4],
              [0, -8],
            ]],
          },
        },
      ],
    });

    expect(result.intelligence.buildabilityScore).toBeGreaterThan(0);
    expect(result.frontageEdges.length).toBeGreaterThan(0);
    expect(result.intelligence.bestSubdivisionStrategy).toBeTruthy();
    expect(result.intelligence.warnings).toBeDefined();
  });

  it("classifies triangular parcels", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-2",
      boundary: {
        type: "Polygon",
        coordinates: [[
          [0, 0],
          [120, 0],
          [30, 130],
          [0, 0],
        ]],
      },
    });

    expect(result.intelligence.shapeClassification).toBe("triangular");
  });

  it("reduces buildable area when hard constraints are applied", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-3",
      boundary: rectangleBoundary(200, 120),
      constraints: [
        {
          constraintType: "easement",
          severity: "hard",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [60, 20],
              [150, 20],
              [150, 70],
              [60, 70],
              [60, 20],
            ]],
          },
        },
      ],
    });

    expect(result.intelligence.buildableAreaSqft).toBeLessThan(result.intelligence.grossAreaSqft);
    expect(result.intelligence.constraintCoveragePercent).toBeGreaterThan(0);
  });

  it("supports frontage override selection", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-4",
      boundary: rectangleBoundary(180, 90),
      selectedFrontageEdgeIndex: 1,
    });

    const selected = result.frontageEdges.find((edge) => edge.isSelected);
    expect(selected?.edgeIndex).toBe(1);
  });

  it("recommends an access corridor for deep narrow parcels", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-5",
      boundary: rectangleBoundary(40, 220),
    });

    expect(result.intelligence.shapeClassification).toBe("deep_narrow");
    expect(result.intelligence.bestSubdivisionStrategy).toBe("access_corridor");
  });

  it("recommends cluster strategy when hard constraints fragment the parcel", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-6",
      boundary: rectangleBoundary(240, 160),
      constraints: [
        {
          constraintType: "easement",
          severity: "hard",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [80, 0],
              [160, 0],
              [160, 160],
              [80, 160],
              [80, 0],
            ]],
          },
        },
      ],
    });

    expect(Number(result.intelligence.metrics.fragmentationScore)).toBeGreaterThan(0.6);
    expect(Number(result.intelligence.metrics.disconnectedBuildableAreas)).toBeGreaterThan(1);
    expect(result.intelligence.bestSubdivisionStrategy).toBe("cluster");
  });

  it("recommends grid strategy for wide shallow parcels with strong frontage", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-7",
      boundary: rectangleBoundary(240, 60),
      constraints: [
        {
          constraintType: "row",
          label: "Main road",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [0, -10],
              [240, -10],
              [240, 4],
              [0, 4],
              [0, -10],
            ]],
          },
        },
      ],
    });

    expect(result.intelligence.shapeClassification).toBe("wide_shallow");
    expect(result.intelligence.bestSubdivisionStrategy).toBe("grid");
  });

  it("flags parcels with no ROW frontage as internal-access required", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-8",
      boundary: rectangleBoundary(140, 100),
      constraints: [
        {
          constraintType: "easement",
          severity: "hard",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [20, 20],
              [50, 20],
              [50, 50],
              [20, 50],
              [20, 20],
            ]],
          },
        },
      ],
    });

    expect(result.frontageEdges.filter((edge) => edge.edgeRole === "frontage")).toHaveLength(0);
    expect(result.intelligence.frontageFt).toBe(0);
    expect(result.intelligence.accessClassification).toBe("internal_road_required");
  });

  it("detects multiple frontage edges on corner parcels", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-9",
      boundary: rectangleBoundary(150, 120),
      constraints: [
        {
          constraintType: "row",
          label: "North road",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [0, -10],
              [150, -10],
              [150, 5],
              [0, 5],
              [0, -10],
            ]],
          },
        },
        {
          constraintType: "row",
          label: "West road",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [-10, 0],
              [5, 0],
              [5, 120],
              [-10, 120],
              [-10, 0],
            ]],
          },
        },
      ],
    });

    expect(result.frontageEdges.filter((edge) => edge.edgeRole === "frontage").length).toBeGreaterThanOrEqual(2);
    expect(result.intelligence.accessClassification).toBe("corner_access");
  });

  it("raises warnings for constraint-heavy parcels", () => {
    const result = processParcel({
      parcelSnapshotId: "parcel-10",
      boundary: rectangleBoundary(180, 120),
      constraints: [
        {
          constraintType: "floodplain",
          severity: "hard",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [10, 10],
              [170, 10],
              [170, 60],
              [10, 60],
              [10, 10],
            ]],
          },
        },
        {
          constraintType: "utility_zone",
          severity: "soft",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [20, 70],
              [160, 70],
              [160, 100],
              [20, 100],
              [20, 70],
            ]],
          },
        },
      ],
    });

    expect(result.intelligence.constraintCoveragePercent).toBeGreaterThan(40);
    expect(result.intelligence.warnings.some((warning) => warning.code === "HIGH_CONSTRAINT_COVERAGE")).toBe(true);
  });
});
