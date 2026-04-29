export type YieldScenarioInput = {
  homesPerAcre: number;
  openSpacePercent: number;
  setbackFt: number;
  averageLotSizeSqft: number;
  productType: string;
};

export type YieldScenarioContext = {
  parcelAreaAcres: number;
  buildableAcres: number;
  frontageFt: number;
  existingLotCount?: number;
  constraintCoveragePercent?: number;
  buildabilityScore?: number;
  recommendedStrategy?: string | null;
};

export type YieldScenarioResult = {
  units: number;
  buildableAreaSqft: number;
  efficiencyPercent: number;
  adjustedBuildableAcres: number;
  estimatedAverageLotSqft: number;
  frontageSupportUnits: number;
  constrainedUnits: number;
};

export type YieldFinancialAssumptions = {
  productType: "sfr" | "duplex" | "cottage" | "townhouse";
  pricePerUnit: number;
  hardCostPerUnit: number;
  softCostPercent: number;
  landCost: number;
  unitsPerLot?: number;
};

export type YieldScenarioPreset = "conservative" | "base" | "aggressive";

export type GeneratedYieldScenario = {
  name: YieldScenarioPreset;
  lotCount: number;
  unitCount: number;
  totalRevenue: number;
  totalHardCost: number;
  totalSoftCost: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPercent: number;
  roiPercent: number;
  breakEvenLandValue: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateYieldScenario(input: YieldScenarioInput, context: YieldScenarioContext): YieldScenarioResult {
  const openSpaceRatio = clamp(input.openSpacePercent / 100, 0, 0.85);
  const setbackPenalty = clamp(input.setbackFt * 0.004, 0, 0.18);
  const constraintPenalty = clamp((context.constraintCoveragePercent ?? 0) / 100 * 0.45, 0, 0.3);
  const buildabilityBoost = clamp(((context.buildabilityScore ?? 50) - 50) / 200, -0.12, 0.12);
  const strategyBoost = context.recommendedStrategy === "grid"
    ? 0.04
    : context.recommendedStrategy === "frontage_split"
      ? 0.02
      : context.recommendedStrategy === "access_corridor"
        ? -0.03
        : context.recommendedStrategy === "cluster"
          ? -0.05
          : 0;
  const adjustedBuildableAcres = Math.max(
    context.buildableAcres * (1 - openSpaceRatio - setbackPenalty - constraintPenalty + buildabilityBoost + strategyBoost),
    0.1,
  );
  const buildableAreaSqft = adjustedBuildableAcres * 43560;
  const densityUnits = Math.max(Math.round(adjustedBuildableAcres * input.homesPerAcre), 1);
  const lotLimitedUnits = Math.max(Math.floor(buildableAreaSqft / Math.max(input.averageLotSizeSqft, 1200)), 1);
  const frontageSupportUnits = Math.max(Math.floor(context.frontageFt / 52), 1);
  const existingLotCount = context.existingLotCount && context.existingLotCount > 0 ? context.existingLotCount : Number.POSITIVE_INFINITY;
  const constrainedUnits = Math.max(Math.min(densityUnits, lotLimitedUnits, frontageSupportUnits, existingLotCount), 1);
  const estimatedAverageLotSqft = Math.round(buildableAreaSqft / constrainedUnits);
  const efficiencyPercent = Math.round((adjustedBuildableAcres / Math.max(context.parcelAreaAcres, adjustedBuildableAcres)) * 100);

  return {
    units: constrainedUnits,
    buildableAreaSqft: Math.round(buildableAreaSqft),
    efficiencyPercent,
    adjustedBuildableAcres: Number(adjustedBuildableAcres.toFixed(2)),
    estimatedAverageLotSqft,
    frontageSupportUnits,
    constrainedUnits,
  };
}

export function estimateUnitsFromParcel(
  context: YieldScenarioContext,
  input: YieldScenarioInput,
  unitsPerLot = 1,
) {
  const result = calculateYieldScenario(input, context);
  return {
    lotCount: result.units,
    unitCount: Math.max(Math.round(result.units * unitsPerLot), 1),
    buildableAreaSqft: result.buildableAreaSqft,
  };
}

export function estimateUnitsFromSubdivision(
  validLotCount: number,
  unitsPerLot = 1,
) {
  return {
    lotCount: Math.max(validLotCount, 0),
    unitCount: Math.max(Math.round(validLotCount * unitsPerLot), 0),
  };
}

export function generateScenarioSet(params: {
  input: YieldScenarioInput;
  context: YieldScenarioContext;
  assumptions: YieldFinancialAssumptions;
  validLotCount?: number | null;
}) {
  const unitsPerLot = params.assumptions.unitsPerLot
    ?? (params.assumptions.productType === "duplex" ? 2 : params.assumptions.productType === "townhouse" ? 3 : params.assumptions.productType === "cottage" ? 1.25 : 1);
  const baseUnits = params.validLotCount != null
    ? estimateUnitsFromSubdivision(params.validLotCount, unitsPerLot)
    : estimateUnitsFromParcel(params.context, params.input, unitsPerLot);

  const presets: Array<{ name: YieldScenarioPreset; revenueFactor: number; costFactor: number }> = [
    { name: "conservative", revenueFactor: 0.9, costFactor: 1.1 },
    { name: "base", revenueFactor: 1, costFactor: 1 },
    { name: "aggressive", revenueFactor: 1.1, costFactor: 0.9 },
  ];

  return presets.map((preset) => {
    const totalRevenue = Math.round(baseUnits.unitCount * params.assumptions.pricePerUnit * preset.revenueFactor);
    const totalHardCost = Math.round(baseUnits.unitCount * params.assumptions.hardCostPerUnit * preset.costFactor);
    const totalSoftCost = Math.round(totalHardCost * params.assumptions.softCostPercent);
    const totalCost = params.assumptions.landCost + totalHardCost + totalSoftCost;
    const grossMargin = totalRevenue - totalCost;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    const roiPercent = totalCost > 0 ? (grossMargin / totalCost) * 100 : 0;
    const breakEvenLandValue = totalRevenue - (totalHardCost + totalSoftCost);

    return {
      name: preset.name,
      lotCount: baseUnits.lotCount,
      unitCount: baseUnits.unitCount,
      totalRevenue,
      totalHardCost,
      totalSoftCost,
      totalCost,
      grossMargin,
      grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
      roiPercent: Number(roiPercent.toFixed(1)),
      breakEvenLandValue: Math.round(breakEvenLandValue),
    } satisfies GeneratedYieldScenario;
  });
}
