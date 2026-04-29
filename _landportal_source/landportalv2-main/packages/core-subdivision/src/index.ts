import {
  centroid,
  insetPolygon,
  lineLength,
  longestEdge,
  pointInPolygon,
  polygonArea,
  polygonBounds,
  rotatePoint,
  rotatePolygon,
  toDegrees,
  translatePolygon,
  type Edge2D,
  type Point2D,
} from "@landportal/core-geometry";

export type { Point2D } from "@landportal/core-geometry";

export type SubdivisionStrategy = "grid" | "frontage" | "corridor";

export type SubdivisionRules = {
  minLotAreaSqft: number;
  minFrontageFt: number;
  minDepthFt: number;
  roadWidthFt: number;
  setbackFt: number;
};

export type SubdivisionLot = {
  id: string;
  label: string;
  polygon: Point2D[];
  areaSqft: number;
  frontageFt: number;
  depthFt: number;
  valid: boolean;
};

export type FrontageEdge = {
  start: Point2D;
  end: Point2D;
  lengthUnits: number;
  lengthFt: number;
  angleDegrees: number;
};

export type RoadCorridor = {
  id: string;
  polygon: Point2D[];
  label: string;
};

export type SubdivisionLayoutSummary = {
  lotCount: number;
  averageLotAreaSqft: number;
  yieldUnits: number;
  efficiencyPercent: number;
  openSpacePercent: number;
  invalidLots: number;
  strategy: SubdivisionStrategy;
  warnings: string[];
};

export type SubdivisionLayoutResult = {
  lots: SubdivisionLot[];
  buildableEnvelope: Point2D[];
  frontageEdge: FrontageEdge | null;
  roads: RoadCorridor[];
  summary: SubdivisionLayoutSummary;
};

function scaleFactor(buildableAreaSqft: number, width: number, height: number) {
  const normalizedArea = Math.max(width * height, 1);
  return Math.sqrt(buildableAreaSqft / normalizedArea);
}

function toFrontageEdge(edge: Edge2D | null, feetPerUnit: number): FrontageEdge | null {
  if (!edge) return null;
  return {
    start: edge.start,
    end: edge.end,
    lengthUnits: edge.length,
    lengthFt: Math.round(edge.length * feetPerUnit),
    angleDegrees: edge.angle,
  };
}

function polygonWithinEnvelope(polygon: Point2D[], envelope: Point2D[]) {
  const center = centroid(polygon);
  return pointInPolygon(center, envelope) && polygon.every((point) => pointInPolygon(point, envelope));
}

function polygonHitsConstraints(polygon: Point2D[], constraints: Point2D[][]) {
  const center = centroid(polygon);
  return constraints.some((constraint) => pointInPolygon(center, constraint) || polygon.some((point) => pointInPolygon(point, constraint)));
}

function validateLot(polygon: Point2D[], feetPerUnit: number, rules: SubdivisionRules) {
  const bounds = polygonBounds(polygon);
  const frontageFt = Math.round(bounds.width * feetPerUnit);
  const depthFt = Math.round(bounds.height * feetPerUnit);
  const areaSqft = Math.round(polygonArea(polygon) * feetPerUnit * feetPerUnit);
  const valid = areaSqft >= rules.minLotAreaSqft && frontageFt >= rules.minFrontageFt && depthFt >= rules.minDepthFt;
  return { areaSqft, frontageFt, depthFt, valid };
}

function mapLots(polygons: Point2D[][], feetPerUnit: number, rules: SubdivisionRules) {
  return polygons.map((polygon, index) => {
    const metrics = validateLot(polygon, feetPerUnit, rules);
    return {
      id: `lot-${index + 1}`,
      label: `${index + 1}`,
      polygon,
      ...metrics,
    } satisfies SubdivisionLot;
  });
}

function buildGridPolygons(envelope: Point2D[], constraints: Point2D[][], rules: SubdivisionRules, feetPerUnit: number) {
  const bounds = polygonBounds(envelope);
  const lotWidthUnits = Math.max(rules.minFrontageFt / feetPerUnit, 3.8);
  const lotDepthUnits = Math.max(rules.minDepthFt / feetPerUnit, 4.8);
  const columns = Math.max(Math.floor(bounds.width / lotWidthUnits), 1);
  const rows = Math.max(Math.floor(bounds.height / lotDepthUnits), 1);
  const cellWidth = Math.max(bounds.width / columns, 1.8);
  const cellHeight = Math.max(bounds.height / rows, 1.8);
  const lots: Point2D[][] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const minX = bounds.minX + column * cellWidth;
      const minY = bounds.minY + row * cellHeight;
      const polygon = [
        { x: minX, y: minY },
        { x: minX + cellWidth, y: minY },
        { x: minX + cellWidth, y: minY + cellHeight },
        { x: minX, y: minY + cellHeight },
      ];
      if (!polygonWithinEnvelope(polygon, envelope) || polygonHitsConstraints(polygon, constraints)) continue;
      lots.push(polygon);
    }
  }
  return { lots, roads: [] as RoadCorridor[] };
}

function buildFrontagePolygons(parcelPolygon: Point2D[], envelope: Point2D[], constraints: Point2D[][], rules: SubdivisionRules, feetPerUnit: number, frontageEdge: FrontageEdge | null) {
  if (!frontageEdge) return { lots: [] as Point2D[][], roads: [] as RoadCorridor[] };
  const origin = frontageEdge.start;
  const angle = -frontageEdge.angleDegrees;
  const rotatedEnvelope = rotatePolygon(envelope, angle, origin);
  const rotatedConstraints = constraints.map((constraint) => rotatePolygon(constraint, angle, origin));
  const bounds = polygonBounds(rotatedEnvelope);
  const lotWidthUnits = Math.max(rules.minFrontageFt / feetPerUnit, 3.8);
  const lotDepthUnits = Math.max(rules.minDepthFt / feetPerUnit, 4.8);
  const columns = Math.max(Math.floor(bounds.width / lotWidthUnits), 1);
  const cellWidth = Math.max(bounds.width / columns, 1.8);
  const lots: Point2D[][] = [];

  for (let column = 0; column < columns; column += 1) {
    const minX = bounds.minX + column * cellWidth;
    const polygon = [
      { x: minX, y: bounds.minY },
      { x: minX + cellWidth, y: bounds.minY },
      { x: minX + cellWidth, y: bounds.minY + lotDepthUnits },
      { x: minX, y: bounds.minY + lotDepthUnits },
    ];
    if (!polygonWithinEnvelope(polygon, rotatedEnvelope) || polygonHitsConstraints(polygon, rotatedConstraints)) continue;
    lots.push(rotatePolygon(polygon, frontageEdge.angleDegrees, origin));
  }

  if (!lots.length) {
    const fallbackWidth = Math.max(bounds.width * 0.45, lotWidthUnits);
    const fallbackDepth = Math.max(Math.min(bounds.height * 0.5, lotDepthUnits), lotDepthUnits * 0.65);
    const fallback = [
      { x: bounds.minX + 1, y: bounds.minY + 0.5 },
      { x: bounds.minX + 1 + fallbackWidth, y: bounds.minY + 0.5 },
      { x: bounds.minX + 1 + fallbackWidth, y: bounds.minY + 0.5 + fallbackDepth },
      { x: bounds.minX + 1, y: bounds.minY + 0.5 + fallbackDepth },
    ];
    if (!polygonHitsConstraints(fallback, rotatedConstraints)) {
      lots.push(rotatePolygon(fallback, frontageEdge.angleDegrees, origin));
    }
  }

  return { lots, roads: [] as RoadCorridor[] };
}

function buildCorridorPolygons(parcelPolygon: Point2D[], envelope: Point2D[], constraints: Point2D[][], rules: SubdivisionRules, feetPerUnit: number, frontageEdge: FrontageEdge | null) {
  if (!frontageEdge) return { lots: [] as Point2D[][], roads: [] as RoadCorridor[] };
  const origin = frontageEdge.start;
  const angle = -frontageEdge.angleDegrees;
  const rotatedEnvelope = rotatePolygon(envelope, angle, origin);
  const rotatedConstraints = constraints.map((constraint) => rotatePolygon(constraint, angle, origin));
  const bounds = polygonBounds(rotatedEnvelope);
  const corridorWidthUnits = Math.max(rules.roadWidthFt / feetPerUnit, 3.5);
  const lotWidthUnits = Math.max(rules.minFrontageFt / feetPerUnit, 3.8);
  const sideDepthUnits = Math.max((bounds.height - corridorWidthUnits) / 2, rules.minDepthFt / feetPerUnit);
  const corridorMinY = bounds.minY + (bounds.height - corridorWidthUnits) / 2;
  const columns = Math.max(Math.floor(bounds.width / lotWidthUnits), 1);
  const cellWidth = Math.max(bounds.width / columns, 1.8);
  const lots: Point2D[][] = [];

  for (let column = 0; column < columns; column += 1) {
    const minX = bounds.minX + column * cellWidth;
    const topLot = [
      { x: minX, y: bounds.minY },
      { x: minX + cellWidth, y: bounds.minY },
      { x: minX + cellWidth, y: corridorMinY },
      { x: minX, y: corridorMinY },
    ];
    const bottomLot = [
      { x: minX, y: corridorMinY + corridorWidthUnits },
      { x: minX + cellWidth, y: corridorMinY + corridorWidthUnits },
      { x: minX + cellWidth, y: corridorMinY + corridorWidthUnits + sideDepthUnits },
      { x: minX, y: corridorMinY + corridorWidthUnits + sideDepthUnits },
    ];
    for (const polygon of [topLot, bottomLot]) {
      if (!polygonWithinEnvelope(polygon, rotatedEnvelope) || polygonHitsConstraints(polygon, rotatedConstraints)) continue;
      lots.push(rotatePolygon(polygon, frontageEdge.angleDegrees, origin));
    }
  }

  const roadPolygon = rotatePolygon([
    { x: bounds.minX, y: corridorMinY },
    { x: bounds.maxX, y: corridorMinY },
    { x: bounds.maxX, y: corridorMinY + corridorWidthUnits },
    { x: bounds.minX, y: corridorMinY + corridorWidthUnits },
  ], frontageEdge.angleDegrees, origin);

  return {
    lots,
    roads: [{ id: "road-1", polygon: roadPolygon, label: "Access corridor" } satisfies RoadCorridor],
  };
}

export function generateSubdivisionLayout(options: {
  strategy: SubdivisionStrategy;
  parcelPolygon: Point2D[];
  buildableEnvelopePolygon?: Point2D[];
  buildableAreaSqft: number;
  constraintPolygons?: Point2D[][];
  preferredFrontageEdge?: { start: Point2D; end: Point2D } | null;
  rules: SubdivisionRules;
}): SubdivisionLayoutResult {
  const {
    strategy,
    parcelPolygon,
    buildableEnvelopePolygon,
    buildableAreaSqft,
    constraintPolygons = [],
    preferredFrontageEdge,
    rules,
  } = options;
  if (!parcelPolygon.length) {
    return {
      lots: [],
      buildableEnvelope: [],
      frontageEdge: null,
      roads: [],
      summary: {
        lotCount: 0,
        averageLotAreaSqft: 0,
        yieldUnits: 0,
        efficiencyPercent: 0,
        openSpacePercent: 0,
        invalidLots: 0,
        strategy,
        warnings: ["No property shape is available for layout generation."],
      },
    };
  }

  const parcelBounds = polygonBounds(parcelPolygon);
  const feetPerUnit = scaleFactor(buildableAreaSqft, parcelBounds.width || 1, parcelBounds.height || 1);
  const buildableEnvelope = buildableEnvelopePolygon?.length
    ? buildableEnvelopePolygon
    : insetPolygon(parcelPolygon, rules.setbackFt / Math.max(feetPerUnit, 1e-6));
  const envelopeBounds = polygonBounds(buildableEnvelope);
  const envelopeWidthFt = envelopeBounds.width * feetPerUnit;
  const envelopeDepthFt = envelopeBounds.height * feetPerUnit;
  const frontageEdge = preferredFrontageEdge
    ? {
      start: preferredFrontageEdge.start,
      end: preferredFrontageEdge.end,
      lengthUnits: lineLength(preferredFrontageEdge.start, preferredFrontageEdge.end),
      lengthFt: Math.round(lineLength(preferredFrontageEdge.start, preferredFrontageEdge.end) * feetPerUnit),
      angleDegrees: toDegrees(
        Math.atan2(
          preferredFrontageEdge.end.y - preferredFrontageEdge.start.y,
          preferredFrontageEdge.end.x - preferredFrontageEdge.start.x,
        ),
      ),
    }
    : strategy === "grid" || strategy === "frontage" || strategy === "corridor"
      ? toFrontageEdge(longestEdge(parcelPolygon), feetPerUnit)
      : null;

  const strategyOutput = strategy === "frontage"
    ? buildFrontagePolygons(parcelPolygon, buildableEnvelope, constraintPolygons, rules, feetPerUnit, frontageEdge)
    : strategy == "corridor"
      ? buildCorridorPolygons(parcelPolygon, buildableEnvelope, constraintPolygons, rules, feetPerUnit, frontageEdge)
      : buildGridPolygons(buildableEnvelope, constraintPolygons, rules, feetPerUnit);

  const lots = mapLots(strategyOutput.lots, feetPerUnit, rules);
  const invalidLots = lots.filter((lot) => !lot.valid).length;
  const averageLotAreaSqft = lots.length ? Math.round(lots.reduce((sum, lot) => sum + lot.areaSqft, 0) / lots.length) : 0;
  const usedAreaSqft = lots.reduce((sum, lot) => sum + lot.areaSqft, 0);
  const efficiencyPercent = buildableAreaSqft > 0 ? Math.min(100, Math.round((usedAreaSqft / buildableAreaSqft) * 100)) : 0;
  const openSpacePercent = Math.max(0, 100 - efficiencyPercent);
  const warnings: string[] = [];

  if (!frontageEdge && strategy !== "grid") {
    warnings.push("No selected frontage edge is available. Frontage-driven layouts need a confirmed road-facing edge.");
  }
  if (strategy !== "corridor" && rules.minFrontageFt > envelopeWidthFt) {
    warnings.push(`Minimum frontage of ${rules.minFrontageFt} ft exceeds the current envelope width of ${Math.round(envelopeWidthFt)} ft.`);
  }
  if (rules.minDepthFt > envelopeDepthFt) {
    warnings.push(`Minimum depth of ${rules.minDepthFt} ft exceeds the current envelope depth of ${Math.round(envelopeDepthFt)} ft.`);
  }
  if (strategy === "corridor") {
    const sideDepthFt = Math.max((envelopeBounds.height - Math.max(rules.roadWidthFt / Math.max(feetPerUnit, 1e-6), 3.5)) / 2, 0) * feetPerUnit;
    if (sideDepthFt < rules.minDepthFt) {
      warnings.push(`Access corridor leaves only about ${Math.round(sideDepthFt)} ft of side depth per side, below the ${rules.minDepthFt} ft minimum.`);
    }
  }
  if (!lots.length) warnings.push("No lots fit the current rules. Try grid mode, reduce setbacks, or lower frontage/depth requirements.");
  if (invalidLots) warnings.push(`${invalidLots} generated lots fall below the current frontage, depth, or lot-size rules.`);
  if (strategy === "grid") warnings.push("Grid strategy is best for quick feasibility, not final access design.");
  if (strategy === "frontage") warnings.push("Frontage split favors street-facing lots and may leave interior area unused.");
  if (strategy === "corridor") warnings.push("Access corridor is an early road concept, not a final civil layout.");

  return {
    lots,
    buildableEnvelope,
    frontageEdge,
    roads: strategyOutput.roads,
    summary: {
      lotCount: lots.length,
      averageLotAreaSqft,
      yieldUnits: lots.filter((lot) => lot.valid).length,
      efficiencyPercent,
      openSpacePercent,
      invalidLots,
      strategy,
      warnings,
    },
  };
}

export function generateGridSubdivision(options: {
  parcelPolygon: Point2D[];
  buildableEnvelopePolygon?: Point2D[];
  buildableAreaSqft: number;
  constraintPolygons?: Point2D[][];
  preferredFrontageEdge?: { start: Point2D; end: Point2D } | null;
  rules: SubdivisionRules;
}) {
  return generateSubdivisionLayout({ ...options, strategy: "grid" });
}
