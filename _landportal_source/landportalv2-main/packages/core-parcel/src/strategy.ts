import type { ParcelIntelligenceRecord } from "./processParcel";

export function recommendSubdivisionStrategy(input: {
  shape: ParcelIntelligenceRecord["shapeClassification"];
  frontageFt: number;
  envelopeWidthFt: number;
  envelopeDepthFt: number;
  constraintCoverage: number;
  fragmentationScore: number;
  frontageEdgeCount: number;
  largestContiguousAreaPercent: number;
  access: ParcelIntelligenceRecord["accessClassification"];
}) {
  if (input.fragmentationScore > 0.6) return "cluster" as const;
  if (input.shape === "wide_shallow" && input.frontageFt > 120 && input.envelopeWidthFt > input.envelopeDepthFt) return "grid" as const;
  if (input.shape === "deep_narrow") return "access_corridor" as const;
  if (input.access === "internal_road_required" || input.frontageFt < 60) return "access_corridor" as const;
  if (input.frontageEdgeCount >= 2 && input.constraintCoverage < 35) return "frontage_split" as const;
  if (input.shape === "rectangular" && input.frontageFt > 150 && input.envelopeDepthFt < 200) return "grid" as const;
  if (input.largestContiguousAreaPercent < 0.7) return "cluster" as const;
  if (input.access === "external_frontage" && input.constraintCoverage < 28) return "frontage_split" as const;
  if (input.shape === "irregular" || input.shape === "l_shaped") return "cluster" as const;
  return "manual_review" as const;
}
