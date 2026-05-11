import type { LocalPointTransform, ParsedFieldPointRow } from "../types/fieldPoint";

type TransformedPoint = {
  lng: number;
  lat: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function feetToMeters(value: number) {
  return value * 0.3048;
}

export function transformLocalCoordinate(
  row: Pick<ParsedFieldPointRow, "northing" | "easting">,
  transform: LocalPointTransform,
): TransformedPoint {
  if (!transform.origin) {
    throw new Error("Choose a map origin before previewing imported points.");
  }

  const unitsScale = transform.units === "feet" ? 0.3048 : 1;
  const scaleFactor = Number.isFinite(transform.scaleFactor) && transform.scaleFactor > 0
    ? transform.scaleFactor
    : 1;

  const northMeters = row.northing * unitsScale * scaleFactor;
  const eastMeters = row.easting * unitsScale * scaleFactor;
  const rotationRadians = toRadians(transform.rotationDegrees);

  const rotatedEast =
    eastMeters * Math.cos(rotationRadians) + northMeters * Math.sin(rotationRadians);
  const rotatedNorth =
    northMeters * Math.cos(rotationRadians) - eastMeters * Math.sin(rotationRadians);

  const latDelta = rotatedNorth / 111_320;
  const lngDelta =
    rotatedEast /
    (111_320 * Math.max(0.2, Math.abs(Math.cos(toRadians(transform.origin.lat)))));

  return {
    lng: transform.origin.lng + lngDelta,
    lat: transform.origin.lat + latDelta,
  };
}

export function transformLocalRows(
  rows: ParsedFieldPointRow[],
  transform: LocalPointTransform,
) {
  return rows.map((row) => ({
    row,
    ...transformLocalCoordinate(row, transform),
  }));
}

export const __testUtils = {
  feetToMeters,
};
