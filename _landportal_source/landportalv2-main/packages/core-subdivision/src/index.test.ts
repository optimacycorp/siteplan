import { describe, expect, it } from "vitest";

import { generateSubdivisionLayout } from "./index";

const parcel = [
  { x: 10, y: 10 },
  { x: 90, y: 12 },
  { x: 88, y: 70 },
  { x: 18, y: 80 },
];

const rules = {
  minLotAreaSqft: 3200,
  minFrontageFt: 28,
  minDepthFt: 48,
  roadWidthFt: 24,
  setbackFt: 8,
};

describe("generateSubdivisionLayout", () => {
  it("creates frontage-aware lots", () => {
    const result = generateSubdivisionLayout({
      strategy: "frontage",
      parcelPolygon: parcel,
      buildableAreaSqft: 220000,
      rules,
    });

    expect(result.summary.strategy).toBe("frontage");
    expect(result.lots.length).toBeGreaterThan(0);
    expect(result.frontageEdge).not.toBeNull();
  });

  it("creates a corridor road for the corridor strategy", () => {
    const result = generateSubdivisionLayout({
      strategy: "corridor",
      parcelPolygon: parcel,
      buildableAreaSqft: 220000,
      rules,
    });

    expect(result.roads.length).toBe(1);
    expect(result.summary.strategy).toBe("corridor");
  });
});
