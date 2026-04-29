import type { ParcelConstraintInput, PolygonGeometry } from "./processParcel";

function polygonArea(polygon: PolygonGeometry) {
  const ring = polygon.coordinates[0] ?? [];
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

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

export function analyzeConstraints(
  parcel: PolygonGeometry,
  constraints: ParcelConstraintInput[] = [],
  buildableComponents: PolygonGeometry[] = [],
) {
  const parcelArea = Math.max(polygonArea(parcel), 1);
  const parcelBox = polygonBox(parcel);
  const hard = constraints.filter((constraint) => constraint.severity !== "soft" && constraint.geometry);
  const soft = constraints.filter((constraint) => constraint.severity === "soft" && constraint.geometry);

  const hardArea = hard.reduce((sum, constraint) => sum + polygonArea(constraint.geometry!), 0);
  const softArea = soft.reduce((sum, constraint) => sum + polygonArea(constraint.geometry!), 0);
  const coveragePercent = ((hardArea + softArea * 0.45) / parcelArea) * 100;

  let fragmentationScore = 0;
  for (const constraint of hard) {
    const box = polygonBox(constraint.geometry!);
    const widthRatio = parcelBox.width > 0 ? box.width / parcelBox.width : 0;
    const heightRatio = parcelBox.height > 0 ? box.height / parcelBox.height : 0;
    if (widthRatio > 0.45 || heightRatio > 0.45) fragmentationScore += 0.25;
    if (
      box.minX < parcelBox.minX + parcelBox.width * 0.4
      && box.maxX > parcelBox.minX + parcelBox.width * 0.6
    ) {
      fragmentationScore += 0.2;
    }
    if (
      box.minY < parcelBox.minY + parcelBox.height * 0.4
      && box.maxY > parcelBox.minY + parcelBox.height * 0.6
    ) {
      fragmentationScore += 0.2;
    }
  }

  fragmentationScore += Math.max(0, hard.length - 1) * 0.1;
  const componentAreas = buildableComponents.map((component) => polygonArea(component));
  const totalBuildableArea = componentAreas.reduce((sum, area) => sum + area, 0);
  const largestComponentArea = componentAreas.length ? Math.max(...componentAreas) : parcelArea;
  const largestContiguousAreaPercent = totalBuildableArea > 0 ? largestComponentArea / totalBuildableArea : 1;
  if (buildableComponents.length > 1) {
    fragmentationScore += Math.min(0.5, (buildableComponents.length - 1) * 0.18);
    fragmentationScore += Math.max(0, (1 - largestContiguousAreaPercent) * 0.6);
  }

  return {
    hardConstraintAreaSqft: hardArea,
    softConstraintAreaSqft: softArea,
    totalArea: hardArea + softArea,
    coveragePercent: Math.min(100, Number(coveragePercent.toFixed(1))),
    fragmentationScore: Math.min(1, Number(fragmentationScore.toFixed(2))),
    largestContiguousAreaPercent: Number(largestContiguousAreaPercent.toFixed(3)),
    disconnectedBuildableAreas: buildableComponents.length,
    hardConstraintCount: hard.length,
    softConstraintCount: soft.length,
  };
}
