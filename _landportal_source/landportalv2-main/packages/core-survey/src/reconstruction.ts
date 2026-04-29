import { normalizeAzimuth, toRadians, type Point2D } from "@landportal/core-geometry";

import { validateClosure } from "./closures";
import type { ParsedDescriptionCall } from "./descriptionParser";

export type ReconstructedTraversePoint = Point2D & {
  id: string;
  label: string;
};

export type DescriptionReconstruction = {
  points: ReconstructedTraversePoint[];
  closure: ReturnType<typeof validateClosure>;
  parsedCallCount: number;
  ignoredLineCount: number;
};

export function reconstructDescriptionBoundary(
  calls: ParsedDescriptionCall[],
  origin: Point2D = { x: 0, y: 0 },
): DescriptionReconstruction {
  const points: ReconstructedTraversePoint[] = [
    {
      id: "pob",
      label: "POB",
      x: origin.x,
      y: origin.y,
    },
  ];

  let currentX = origin.x;
  let currentY = origin.y;

  calls.forEach((call, index) => {
    const azimuth = normalizeAzimuth(call.azimuth);
    const radians = toRadians(azimuth);
    const deltaNorthing = Math.cos(radians) * call.distance;
    const deltaEasting = Math.sin(radians) * call.distance;

    currentX += deltaEasting;
    currentY += deltaNorthing;

    points.push({
      id: call.id,
      label: `PT-${index + 1}`,
      x: currentX,
      y: currentY,
    });
  });

  return {
    points,
    closure: validateClosure(points),
    parsedCallCount: calls.length,
    ignoredLineCount: 0,
  };
}
