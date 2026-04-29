import { lineLength, type Point2D } from "@landportal/core-geometry";

import { ensureClosedRing, closureDelta, type SurveyRing } from "./geometry";

export type ClosureMetrics = {
  closureError: number;
  totalDistance: number;
  precisionRatio: number | null;
  deltaX: number;
  deltaY: number;
  closed: boolean;
};

export function computeClosureMetrics(points: SurveyRing): ClosureMetrics {
  const ring = ensureClosedRing(points);
  const { deltaX, deltaY, closureError } = closureDelta(points);

  let totalDistance = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    totalDistance += lineLength(ring[index] as Point2D, ring[index + 1] as Point2D);
  }

  return {
    closureError,
    totalDistance,
    precisionRatio: closureError === 0 ? null : totalDistance / closureError,
    deltaX,
    deltaY,
    closed: closureError === 0,
  };
}

export function validateClosure(points: SurveyRing, tolerance = 0.05) {
  const metrics = computeClosureMetrics(points);
  return {
    ...metrics,
    withinTolerance: metrics.closureError <= tolerance,
  };
}
