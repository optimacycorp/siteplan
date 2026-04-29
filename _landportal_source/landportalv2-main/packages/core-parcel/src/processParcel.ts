import { buildBuildableEnvelope } from "./buildBuildableEnvelope";
import { analyzeConstraints } from "./constraintAnalysis";
import { detectFrontageEdges } from "./frontage";
import { recommendSubdivisionStrategy } from "./strategy";

export type Ring = [number, number][];

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: Ring[];
};

export type ParcelConstraintInput = {
  id?: string;
  constraintType:
    | "setback_front"
    | "setback_side"
    | "setback_rear"
    | "easement"
    | "row"
    | "floodplain"
    | "utility_zone"
    | "tree_preservation"
    | "steep_slope"
    | "wetland"
    | "custom";
  label?: string;
  severity?: "hard" | "soft" | "info";
  geometry?: PolygonGeometry | null;
  attributes?: Record<string, unknown>;
};

export type ParcelInput = {
  parcelSnapshotId: string;
  boundary: PolygonGeometry;
  constraints?: ParcelConstraintInput[];
  selectedFrontageEdgeIndex?: number | null;
  analysisVersion?: string;
};

export type FrontageEdge = {
  edgeIndex: number;
  lineGeometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  lengthFt: number;
  edgeRole: "candidate" | "frontage" | "rear" | "side" | "access" | "restricted";
  touchesPublicRow: boolean;
  isSelected: boolean;
  metadata: Record<string, unknown>;
};

export type ParcelIntelligenceRecord = {
  analysisVersion: string;
  grossAreaSqft: number;
  grossAreaAcres: number;
  buildableAreaSqft: number;
  buildableAreaAcres: number;
  frontageFt: number;
  avgDepthFt: number;
  maxDepthFt: number;
  minDepthFt: number;
  compactnessScore: number;
  irregularityScore: number;
  constraintCoveragePercent: number;
  shapeClassification:
    | "rectangular"
    | "irregular"
    | "triangular"
    | "l_shaped"
    | "deep_narrow"
    | "wide_shallow";
  accessClassification:
    | "external_frontage"
    | "corner_access"
    | "internal_road_required"
    | "limited_access";
  bestSubdivisionStrategy:
    | "frontage_split"
    | "grid"
    | "access_corridor"
    | "cluster"
    | "manual_review";
  buildabilityScore: number;
  riskScore: number;
  warnings: Array<{
    severity: "error" | "warning" | "info";
    code: string;
    message: string;
  }>;
  metrics: Record<string, unknown>;
  recommendations: Record<string, unknown>;
};

export type ProcessParcelResult = {
  normalizedBoundary: PolygonGeometry;
  buildableEnvelope: PolygonGeometry;
  frontageEdges: FrontageEdge[];
  intelligence: ParcelIntelligenceRecord;
};

const SQFT_PER_ACRE = 43560;

function ensureClosedRing(ring: Ring): Ring {
  if (ring.length < 3) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  return fx === lx && fy === ly ? ring : [...ring, [fx, fy]];
}

function removeSequentialDuplicates(ring: Ring): Ring {
  const out: Ring = [];
  for (const pt of ring) {
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) out.push(pt);
  }
  return out;
}

function normalizePolygon(polygon: PolygonGeometry): PolygonGeometry {
  const outer = ensureClosedRing(removeSequentialDuplicates(polygon.coordinates[0] ?? []));
  if (outer.length < 4) {
    throw new Error("Parcel boundary is invalid: not enough coordinates.");
  }
  return {
    type: "Polygon",
    coordinates: [outer],
  };
}

function polygonAreaSqft(polygon: PolygonGeometry): number {
  const ring = polygon.coordinates[0];
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeterFt(polygon: PolygonGeometry): number {
  const ring = polygon.coordinates[0];
  let total = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    total += Math.hypot(x2 - x1, y2 - y1);
  }
  return total;
}

function bbox(polygon: PolygonGeometry) {
  const ring = polygon.coordinates[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function classifyShape(polygon: PolygonGeometry): ParcelIntelligenceRecord["shapeClassification"] {
  const ring = polygon.coordinates[0];
  const vertexCount = Math.max(0, ring.length - 1);
  const box = bbox(polygon);
  const ratio = box.width > 0 && box.height > 0 ? Math.max(box.width, box.height) / Math.min(box.width, box.height) : 1;

  if (vertexCount === 3) return "triangular";
  if (ratio > 3) return box.width > box.height ? "wide_shallow" : "deep_narrow";
  if (vertexCount <= 5) return "rectangular";
  if (vertexCount <= 7) return "l_shaped";
  return "irregular";
}

function estimateCompactness(area: number, perimeter: number): number {
  if (perimeter <= 0) return 0;
  const score = (4 * Math.PI * area) / (perimeter * perimeter);
  return Math.max(0, Math.min(1, score));
}

function estimateIrregularity(shape: ParcelIntelligenceRecord["shapeClassification"], compactness: number): number {
  const base =
    shape === "rectangular"
      ? 0.15
      : shape === "wide_shallow" || shape === "deep_narrow"
        ? 0.35
        : shape === "triangular"
          ? 0.55
          : shape === "l_shaped"
            ? 0.65
            : 0.8;
  return Math.max(0, Math.min(1, (base + (1 - compactness)) / 2));
}

function estimateDepths(polygon: PolygonGeometry) {
  const box = bbox(polygon);
  const minDepthFt = Math.min(box.width, box.height);
  const maxDepthFt = Math.max(box.width, box.height);
  const avgDepthFt = (minDepthFt + maxDepthFt) / 2;
  return { minDepthFt, maxDepthFt, avgDepthFt, widthFt: box.width, depthFt: box.height };
}

function classifyAccess(
  frontageEdges: FrontageEdge[],
  shape: ParcelIntelligenceRecord["shapeClassification"],
): ParcelIntelligenceRecord["accessClassification"] {
  const frontageCount = frontageEdges.filter((edge) => edge.edgeRole === "frontage").length;
  if (frontageCount >= 2) return "corner_access";
  if (frontageCount === 1 && (shape === "rectangular" || shape === "wide_shallow")) return "external_frontage";
  if (frontageCount === 1) return "limited_access";
  return "internal_road_required";
}

function buildWarnings(params: {
  grossAreaSqft: number;
  constraintCoveragePercent: number;
  frontageFt: number;
  fragmentationScore: number;
  shape: ParcelIntelligenceRecord["shapeClassification"];
  access: ParcelIntelligenceRecord["accessClassification"];
}) {
  const warnings: ParcelIntelligenceRecord["warnings"] = [];

  if (params.grossAreaSqft < 10000) {
    warnings.push({
      severity: "warning",
      code: "SMALL_PARCEL",
      message: "Parcel may be too small for a meaningful subdivision layout.",
    });
  }

  if (params.constraintCoveragePercent > 30) {
    warnings.push({
      severity: "warning",
      code: "HIGH_CONSTRAINT_COVERAGE",
      message: "Constraints cover a large portion of the parcel.",
    });
  }

  if (params.frontageFt < 50) {
    warnings.push({
      severity: "warning",
      code: "LIMITED_FRONTAGE",
      message: "Usable frontage appears limited for standard lot layouts.",
    });
  }

  if (params.shape === "irregular" || params.shape === "l_shaped") {
    warnings.push({
      severity: "info",
      code: "IRREGULAR_SHAPE",
      message: "Irregular parcel shape may require cluster or corridor strategies.",
    });
  }

  if (params.access === "internal_road_required") {
    warnings.push({
      severity: "info",
      code: "INTERNAL_ACCESS_LIKELY",
      message: "Internal road access is likely required for efficient buildout.",
    });
  }

  if (params.fragmentationScore > 0.45) {
    warnings.push({
      severity: "warning",
      code: "FRAGMENTED_BUILDABLE_AREA",
      message: "Constraints split the parcel into fragmented buildable zones.",
    });
  }

  return warnings;
}

export function processParcel(input: ParcelInput): ProcessParcelResult {
  const analysisVersion = input.analysisVersion ?? "v1";
  const normalizedBoundary = normalizePolygon(input.boundary);
  const grossAreaSqft = polygonAreaSqft(normalizedBoundary);
  const grossAreaAcres = grossAreaSqft / SQFT_PER_ACRE;
  const perimeterFt = polygonPerimeterFt(normalizedBoundary);

  const frontageEdges = detectFrontageEdges(
    normalizedBoundary,
    input.constraints,
    input.selectedFrontageEdgeIndex,
  );
  const selectedFrontage = frontageEdges.find((edge) => edge.isSelected) ?? null;
  const buildable = buildBuildableEnvelope(normalizedBoundary, input.constraints, selectedFrontage ?? undefined);
  const buildableEnvelope = buildable.envelope;
  const buildableAreaSqft = polygonAreaSqft(buildableEnvelope);
  const buildableAreaAcres = buildableAreaSqft / SQFT_PER_ACRE;

  const frontageCandidates = frontageEdges.filter((edge) => edge.edgeRole === "frontage");
  const frontageFt = selectedFrontage?.lengthFt
    ?? (frontageCandidates.length ? Math.max(...frontageCandidates.map((edge) => edge.lengthFt)) : 0);

  const { minDepthFt, maxDepthFt, avgDepthFt } = estimateDepths(normalizedBoundary);
  const envelopeDepths = estimateDepths(buildableEnvelope);
  const shapeClassification = classifyShape(normalizedBoundary);
  const compactnessScore = estimateCompactness(grossAreaSqft, perimeterFt);
  const irregularityScore = estimateIrregularity(shapeClassification, compactnessScore);

  const constraintStats = analyzeConstraints(normalizedBoundary, input.constraints, buildable.components);
  const constraintCoveragePercent = constraintStats.coveragePercent;

  const accessClassification = classifyAccess(frontageEdges, shapeClassification);
  const bestSubdivisionStrategy = recommendSubdivisionStrategy({
    shape: shapeClassification,
    frontageFt,
    envelopeWidthFt: envelopeDepths.widthFt,
    envelopeDepthFt: envelopeDepths.depthFt,
    constraintCoverage: constraintCoveragePercent,
    fragmentationScore: constraintStats.fragmentationScore,
    frontageEdgeCount: frontageEdges.filter((edge) => edge.edgeRole === "frontage").length,
    largestContiguousAreaPercent: constraintStats.largestContiguousAreaPercent,
    access: accessClassification,
  });

  const buildabilityScore = Math.max(
    0,
    Math.min(
      100,
      100
        - irregularityScore * 30
        - constraintCoveragePercent * 0.8
        - constraintStats.fragmentationScore * 18
        + compactnessScore * 20
        + Math.min(frontageFt / 10, 10),
    ),
  );

  const riskScore = Math.max(
    0,
    Math.min(100, irregularityScore * 40 + constraintCoveragePercent * 1.2 + constraintStats.fragmentationScore * 25),
  );

  const warnings = buildWarnings({
    grossAreaSqft,
    constraintCoveragePercent,
    frontageFt,
    fragmentationScore: constraintStats.fragmentationScore,
    shape: shapeClassification,
    access: accessClassification,
  });

  const intelligence: ParcelIntelligenceRecord = {
    analysisVersion,
    grossAreaSqft,
    grossAreaAcres,
    buildableAreaSqft,
    buildableAreaAcres,
    frontageFt,
    avgDepthFt,
    maxDepthFt,
    minDepthFt,
    compactnessScore,
    irregularityScore,
    constraintCoveragePercent,
    shapeClassification,
    accessClassification,
    bestSubdivisionStrategy,
    buildabilityScore,
    riskScore,
    warnings,
    metrics: {
      perimeterFt,
      selectedFrontageEdgeIndex:
        frontageEdges.find((edge) => edge.isSelected)?.edgeIndex ?? null,
      frontageEdgeCount: frontageEdges.length,
      hardConstraintAreaSqft: constraintStats.hardConstraintAreaSqft,
      softConstraintAreaSqft: constraintStats.softConstraintAreaSqft,
      fragmentationScore: constraintStats.fragmentationScore,
      largestContiguousAreaPercent: constraintStats.largestContiguousAreaPercent,
      disconnectedBuildableAreas: constraintStats.disconnectedBuildableAreas,
      buildableComponentCount: buildable.components.length,
      buildableAreaRatio: grossAreaSqft > 0 ? Number((buildableAreaSqft / grossAreaSqft).toFixed(3)) : 0,
    },
    recommendations: {
      recommendedStrategy: bestSubdivisionStrategy,
      recommendedLotWidthFt:
        bestSubdivisionStrategy === "frontage_split" ? 55 : bestSubdivisionStrategy === "grid" ? 50 : 45,
      recommendedLotDepthFt:
        bestSubdivisionStrategy === "access_corridor" ? 110 : 100,
      recommendedAccessMode: accessClassification,
      recommendedNextActions: [
        "Review property constraints",
        "Generate a concept layout",
        "Validate the result in Site Planner",
      ],
    },
  };

  return {
    normalizedBoundary,
    buildableEnvelope,
    frontageEdges,
    intelligence,
  };
}
