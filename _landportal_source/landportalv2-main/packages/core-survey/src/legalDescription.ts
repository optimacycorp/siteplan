import type { Point2D } from "@landportal/core-geometry";

import { bearingFromPoints } from "./bearings";
import { ensureClosedRing, type SurveyRing } from "./geometry";

export type LegalCall = {
  order: number;
  bearing: string;
  distance: number;
  text: string;
};

export function generateLegalCalls(points: SurveyRing): LegalCall[] {
  const ring = ensureClosedRing(points);
  const calls: LegalCall[] = [];

  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index] as Point2D;
    const end = ring[index + 1] as Point2D;
    const bearing = bearingFromPoints(start, end);
    calls.push({
      order: index + 1,
      bearing: bearing.label,
      distance: Number(bearing.length.toFixed(2)),
      text: `${bearing.label} for ${bearing.length.toFixed(2)} feet`,
    });
  }

  return calls;
}

export function generateDraftLegalDescription(label: string, points: SurveyRing) {
  const calls = generateLegalCalls(points);
  const body = calls
    .map((call, index) => `${index === 0 ? "Thence" : "Thence"} ${call.text};`)
    .join("\n");

  return `Draft legal description for ${label}\n\nBeginning at the Point of Beginning;\n${body}\nReturning to the Point of Beginning.`;
}
