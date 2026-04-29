import {
  polygonArea2D,
  polygonFromBox,
  subtractPolygonsToComponents,
  unionPolygons,
  validatePolygon,
  type Polygon2D,
} from "@landportal/core-geometry";

import type { FrontageEdge, ParcelConstraintInput, PolygonGeometry } from "./processParcel";

function polygonBox(polygon: PolygonGeometry) {
  const ring = polygon.coordinates[0] ?? [];
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

function normalizeInsetBox(box: { minX: number; minY: number; maxX: number; maxY: number }) {
  return {
    minX: Math.min(box.minX, box.maxX - 1),
    minY: Math.min(box.minY, box.maxY - 1),
    maxX: Math.max(box.maxX, box.minX + 1),
    maxY: Math.max(box.maxY, box.minY + 1),
  };
}

function createInsetBox(parcel: PolygonGeometry, frontage: FrontageEdge | undefined) {
  const box = polygonBox(parcel);
  const primaryLength = frontage?.lengthFt ?? Math.max(box.width, box.height, 1);
  const unitsPerFoot = Math.max(Math.max(box.width, box.height, 1) / Math.max(primaryLength, 1), 0.05);
  const front = 20 * unitsPerFoot;
  const rear = 20 * unitsPerFoot;
  const side = 8 * unitsPerFoot;

  const frontageCoordinates = frontage?.lineGeometry.coordinates ?? [];
  const horizontal = frontageCoordinates.length === 2
    ? Math.abs(frontageCoordinates[0][0] - frontageCoordinates[1][0]) >= Math.abs(frontageCoordinates[0][1] - frontageCoordinates[1][1])
    : box.width >= box.height;

  if (horizontal) {
    const frontageY = frontageCoordinates[0]?.[1] ?? box.minY;
    const frontageAtBottom = Math.abs(frontageY - box.minY) <= Math.abs(frontageY - box.maxY);
    return normalizeInsetBox(frontageAtBottom
      ? { minX: box.minX + side, minY: box.minY + front, maxX: box.maxX - side, maxY: box.maxY - rear }
      : { minX: box.minX + side, minY: box.minY + rear, maxX: box.maxX - side, maxY: box.maxY - front });
  }

  const frontageX = frontageCoordinates[0]?.[0] ?? box.minX;
  const frontageAtLeft = Math.abs(frontageX - box.minX) <= Math.abs(frontageX - box.maxX);
  const inset = frontageAtLeft
    ? { minX: box.minX + front, minY: box.minY + side, maxX: box.maxX - rear, maxY: box.maxY - side }
    : { minX: box.minX + rear, minY: box.minY + side, maxX: box.maxX - front, maxY: box.maxY - side };
  return normalizeInsetBox(inset);
}

export function buildBuildableEnvelope(
  parcel: PolygonGeometry,
  constraints: ParcelConstraintInput[] = [],
  frontage?: FrontageEdge,
): {
  envelope: PolygonGeometry;
  components: PolygonGeometry[];
  largestComponentShare: number;
  hardConstraintUnion: PolygonGeometry | null;
} {
  const insetBox = createInsetBox(parcel, frontage);
  const insetPolygon = validatePolygon(polygonFromBox(insetBox));

  const hardConstraints = constraints
    .filter((constraint) => constraint.severity !== "soft" && constraint.geometry)
    .map((constraint) => constraint.geometry as unknown as Polygon2D);

  const constraintUnion = hardConstraints.length ? unionPolygons(hardConstraints) : null;
  const components = subtractPolygonsToComponents(insetPolygon, hardConstraints).map((component) => validatePolygon(component));
  const buildablePolygon = components[0] ?? insetPolygon;
  const totalArea = components.reduce((sum, component) => sum + polygonArea2D(component), 0);
  const largestComponentShare = totalArea > 0 ? polygonArea2D(buildablePolygon) / totalArea : 1;

  return {
    envelope: buildablePolygon as unknown as PolygonGeometry,
    components: components.map((component) => component as unknown as PolygonGeometry),
    largestComponentShare: Number(largestComponentShare.toFixed(3)),
    hardConstraintUnion: constraintUnion as unknown as PolygonGeometry | null,
  };
}
