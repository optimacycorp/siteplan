import { distance, polygonArea, type Point2D } from "@landportal/core-geometry";

export type SurveyRing = Point2D[];

export function ensureClosedRing(points: SurveyRing): SurveyRing {
  if (!points.length) return [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first.x === last.x && first.y === last.y) return points;
  return [...points, first];
}

export function closureDelta(points: SurveyRing) {
  if (points.length < 2) {
    return { deltaX: 0, deltaY: 0, closureError: 0 };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const deltaX = last.x - first.x;
  const deltaY = last.y - first.y;

  return {
    deltaX,
    deltaY,
    closureError: distance(deltaX, deltaY),
  };
}

export function buildClosedPolygon(points: SurveyRing) {
  const closed = ensureClosedRing(points);
  return {
    points: closed,
    area: polygonArea(closed),
    ...closureDelta(points),
  };
}
