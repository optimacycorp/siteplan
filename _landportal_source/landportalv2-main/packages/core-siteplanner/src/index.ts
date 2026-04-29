import { centroid, rotatePolygon, scalePolygon, translatePolygon, type Point2D } from "@landportal/core-geometry";

export type SitePlanElementType = "building" | "tree" | "utility" | "easement" | "row";

export type PlannerElement = {
  id: string;
  elementType: SitePlanElementType;
  label: string;
  points: Point2D[];
  style?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
};

export type PlannerLayerKey = SitePlanElementType;

export const symbolRegistry: Record<SitePlanElementType, { fill: string; stroke: string; label: string }> = {
  building: { fill: "rgba(221, 211, 191, 0.95)", stroke: "#665843", label: "Building footprints" },
  tree: { fill: "#3e8456", stroke: "#24563a", label: "Trees" },
  utility: { fill: "rgba(52, 117, 185, 0.18)", stroke: "#3475b9", label: "Utilities" },
  easement: { fill: "rgba(204, 170, 91, 0.16)", stroke: "#b07f20", label: "Easements" },
  row: { fill: "rgba(88, 96, 109, 0.1)", stroke: "#58606d", label: "Right-of-way" },
};

export function moveElement(element: PlannerElement, dx: number, dy: number): PlannerElement {
  return { ...element, points: translatePolygon(element.points, dx, dy) };
}

export function rotateElement(element: PlannerElement, angleDegrees: number): PlannerElement {
  return { ...element, points: rotatePolygon(element.points, angleDegrees, centroid(element.points)) };
}

export function resizeElement(element: PlannerElement, factor: number): PlannerElement {
  return { ...element, points: scalePolygon(element.points, factor, centroid(element.points)) };
}

export function summarizeSitePlan(elements: PlannerElement[]) {
  return elements.reduce(
    (summary, element) => {
      if (element.elementType === "building") summary.buildingCount += 1;
      if (element.elementType === "tree") summary.treeCount += Math.max(Number(element.attributes?.count ?? element.points.length ?? 1), 1);
      if (element.elementType === "utility") summary.utilityCount += 1;
      return summary;
    },
    { buildingCount: 0, treeCount: 0, utilityCount: 0 },
  );
}
