export type Coordinate2D = [number, number];
export type Box2D = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};
export type Polygon2D = {
  type: "Polygon";
  coordinates: Coordinate2D[][];
};

function ensureClosedRing(ring: Coordinate2D[]): Coordinate2D[] {
  if (!ring.length) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  return fx === lx && fy === ly ? ring : [...ring, [fx, fy] as Coordinate2D];
}

export function polygonBox(polygon: Polygon2D): Box2D {
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

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function polygonFromBox(box: { minX: number; minY: number; maxX: number; maxY: number }): Polygon2D {
  return {
    type: "Polygon",
    coordinates: [[
      [box.minX, box.minY],
      [box.maxX, box.minY],
      [box.maxX, box.maxY],
      [box.minX, box.maxY],
      [box.minX, box.minY],
    ]],
  };
}

function normalizeBox(box: { minX: number; minY: number; maxX: number; maxY: number }): Box2D {
  return {
    minX: box.minX,
    minY: box.minY,
    maxX: box.maxX,
    maxY: box.maxY,
    width: Math.max(0, box.maxX - box.minX),
    height: Math.max(0, box.maxY - box.minY),
  };
}

export function polygonArea2D(polygon: Polygon2D) {
  const ring = polygon.coordinates[0] ?? [];
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

export function remapPolygonToBox(polygon: Polygon2D, targetBox: { minX: number; minY: number; maxX: number; maxY: number }) {
  const ring = ensureClosedRing((polygon.coordinates[0] ?? []).slice(0, -1));
  const source = polygonBox(polygon);
  const targetWidth = targetBox.maxX - targetBox.minX;
  const targetHeight = targetBox.maxY - targetBox.minY;
  const scaleX = source.width > 0 ? targetWidth / source.width : 1;
  const scaleY = source.height > 0 ? targetHeight / source.height : 1;
  const remappedRing: Coordinate2D[] = ring.map(([x, y]) => ([
    targetBox.minX + (x - source.minX) * scaleX,
    targetBox.minY + (y - source.minY) * scaleY,
  ] as Coordinate2D));

  const coordinates: Coordinate2D[][] = [ensureClosedRing(remappedRing)];

  return {
    type: "Polygon",
    coordinates,
  } satisfies Polygon2D;
}

export function bufferPolygon(polygon: Polygon2D, distance: number) {
  const source = polygonBox(polygon);
  const target = {
    minX: source.minX + distance,
    minY: source.minY + distance,
    maxX: source.maxX - distance,
    maxY: source.maxY - distance,
    width: Math.max(source.width - distance * 2, source.width * 0.2),
    height: Math.max(source.height - distance * 2, source.height * 0.2),
  };

  if (target.maxX <= target.minX || target.maxY <= target.minY) {
    return polygonFromBox({
      minX: source.minX + source.width * 0.2,
      minY: source.minY + source.height * 0.2,
      maxX: source.maxX - source.width * 0.2,
      maxY: source.maxY - source.height * 0.2,
    });
  }

  return remapPolygonToBox(polygon, target);
}

export function unionPolygons(polygons: Polygon2D[]) {
  if (!polygons.length) {
    return {
      type: "Polygon",
      coordinates: [[]],
    } satisfies Polygon2D;
  }

  const unionBox = polygons.reduce((acc, polygon) => {
    const box = polygonBox(polygon);
    return {
      minX: Math.min(acc.minX, box.minX),
      minY: Math.min(acc.minY, box.minY),
      maxX: Math.max(acc.maxX, box.maxX),
      maxY: Math.max(acc.maxY, box.maxY),
    };
  }, {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  });

  return polygonFromBox(unionBox);
}

function boxesOverlap(left: Box2D, right: Box2D) {
  return left.minX < right.maxX && left.maxX > right.minX && left.minY < right.maxY && left.maxY > right.minY;
}

function intersectionBox(left: Box2D, right: Box2D) {
  if (!boxesOverlap(left, right)) return null;
  return normalizeBox({
    minX: Math.max(left.minX, right.minX),
    minY: Math.max(left.minY, right.minY),
    maxX: Math.min(left.maxX, right.maxX),
    maxY: Math.min(left.maxY, right.maxY),
  });
}

function boxArea(box: Box2D) {
  return box.width * box.height;
}

function subtractBox(base: Box2D, cut: Box2D) {
  const overlap = intersectionBox(base, cut);
  if (!overlap || overlap.width <= 0 || overlap.height <= 0) return [base];

  const candidates = [
    normalizeBox({ minX: base.minX, minY: base.minY, maxX: overlap.minX, maxY: base.maxY }),
    normalizeBox({ minX: overlap.maxX, minY: base.minY, maxX: base.maxX, maxY: base.maxY }),
    normalizeBox({ minX: overlap.minX, minY: base.minY, maxX: overlap.maxX, maxY: overlap.minY }),
    normalizeBox({ minX: overlap.minX, minY: overlap.maxY, maxX: overlap.maxX, maxY: base.maxY }),
  ];

  return candidates.filter((candidate) => candidate.width > 0.5 && candidate.height > 0.5);
}

export function subtractPolygonsToComponents(base: Polygon2D, subtract: Polygon2D[]) {
  let components = [polygonBox(base)];

  for (const polygon of subtract) {
    const cutBox = polygonBox(polygon);
    components = components.flatMap((component) => subtractBox(component, cutBox));
  }

  return components
    .filter((component) => boxArea(component) > 1)
    .sort((left, right) => boxArea(right) - boxArea(left))
    .map((component) => polygonFromBox(component));
}

export function subtractPolygons(base: Polygon2D, subtract: Polygon2D[]) {
  const components = subtractPolygonsToComponents(base, subtract);
  if (!components.length) return base;
  return components[0];
}

export function validatePolygon(polygon: Polygon2D) {
  const ring = ensureClosedRing(polygon.coordinates[0] ?? []);
  if (ring.length < 4) return polygonFromBox({ minX: 0, minY: 0, maxX: 1, maxY: 1 });
  return {
    type: "Polygon",
    coordinates: [ring],
  } satisfies Polygon2D;
}
