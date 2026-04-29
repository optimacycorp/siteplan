import { describe, expect, it } from "vitest";

import { generateScenarioSet } from "./index";

describe("generateScenarioSet", () => {
  it("creates conservative, base, and aggressive scenarios", () => {
    const scenarios = generateScenarioSet({
      input: {
        homesPerAcre: 4,
        openSpacePercent: 15,
        setbackFt: 12,
        averageLotSizeSqft: 6000,
        productType: "Single-family",
      },
      context: {
        parcelAreaAcres: 5,
        buildableAcres: 3.5,
        frontageFt: 220,
        buildabilityScore: 72,
        constraintCoveragePercent: 12,
        recommendedStrategy: "grid",
      },
      assumptions: {
        productType: "sfr",
        pricePerUnit: 420000,
        hardCostPerUnit: 210000,
        softCostPercent: 0.18,
        landCost: 1800000,
      },
    });

    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].name).toBe("conservative");
    expect(scenarios[1].name).toBe("base");
    expect(scenarios[2].name).toBe("aggressive");
    expect(scenarios[0].totalRevenue).toBeLessThan(scenarios[1].totalRevenue);
    expect(scenarios[2].grossMargin).toBeGreaterThanOrEqual(scenarios[1].grossMargin);
  });

  it("uses subdivision lot counts when present", () => {
    const scenarios = generateScenarioSet({
      input: {
        homesPerAcre: 4,
        openSpacePercent: 20,
        setbackFt: 10,
        averageLotSizeSqft: 5000,
        productType: "Townhome",
      },
      context: {
        parcelAreaAcres: 4,
        buildableAcres: 2.8,
        frontageFt: 180,
      },
      assumptions: {
        productType: "townhouse",
        pricePerUnit: 365000,
        hardCostPerUnit: 175000,
        softCostPercent: 0.16,
        landCost: 1400000,
      },
      validLotCount: 20,
    });

    expect(scenarios[1].lotCount).toBe(20);
    expect(scenarios[1].unitCount).toBeGreaterThan(20);
  });
});
