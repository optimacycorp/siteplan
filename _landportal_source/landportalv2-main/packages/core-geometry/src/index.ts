export type Point2D = {
  x: number;
  y: number;
};

export type Edge2D = {
  start: Point2D;
  end: Point2D;
  length: number;
  angle: number;
};

export function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function normalizeAzimuth(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function distance(deltaX: number, deltaY: number) {
  return Math.sqrt(deltaX ** 2 + deltaY ** 2);
}

export function lineLength(start: Point2D, end: Point2D) {
  return distance(end.x - start.x, end.y - start.y);
}

export function polygonBounds(polygon: Point2D[]) {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function polygonArea(polygon: Point2D[]) {
  let sum = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

export function centroid(polygon: Point2D[]) {
  const total = polygon.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return {
    x: total.x / Math.max(polygon.length, 1),
    y: total.y / Math.max(polygon.length, 1),
  };
}

export function pointInPolygon(point: Point2D, polygon: Point2D[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const earlier = polygon[previous];
    const intersects = ((current.y > point.y) !== (earlier.y > point.y))
      && (point.x < ((earlier.x - current.x) * (point.y - current.y)) / ((earlier.y - current.y) || 1e-9) + current.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function rotatePoint(point: Point2D, angleDegrees: number, origin: Point2D) {
  const radians = toRadians(angleDegrees);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: origin.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

export function rotatePolygon(polygon: Point2D[], angleDegrees: number, origin = centroid(polygon)) {
  return polygon.map((point) => rotatePoint(point, angleDegrees, origin));
}

export function translatePolygon(polygon: Point2D[], dx: number, dy: number) {
  return polygon.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

export function scalePolygon(polygon: Point2D[], factor: number, origin = centroid(polygon)) {
  return polygon.map((point) => ({
    x: origin.x + (point.x - origin.x) * factor,
    y: origin.y + (point.y - origin.y) * factor,
  }));
}

export function insetPolygon(polygon: Point2D[], amountUnits: number) {
  if (!polygon.length) return [];
  const bounds = polygonBounds(polygon);
  const maxDimension = Math.max(bounds.width, bounds.height, 1);
  const factor = Math.max(0.45, 1 - amountUnits / maxDimension);
  return scalePolygon(polygon, factor);
}

export function polygonEdges(polygon: Point2D[]): Edge2D[] {
  return polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return {
      start: point,
      end: next,
      length: lineLength(point, next),
      angle: toDegrees(Math.atan2(next.y - point.y, next.x - point.x)),
    };
  });
}

export function longestEdge(polygon: Point2D[]) {
  return polygonEdges(polygon).reduce<Edge2D | null>((longest, edge) => {
    if (!longest || edge.length > longest.length) return edge;
    return longest;
  }, null);
}

export * from "./polygonOps";
