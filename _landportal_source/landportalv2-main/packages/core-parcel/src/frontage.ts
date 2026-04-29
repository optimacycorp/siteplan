import type { ParcelConstraintInput, FrontageEdge, PolygonGeometry } from "./processParcel";

type EdgeMeasurement = FrontageEdge & {
  midpoint: [number, number];
  intersectsRow: boolean;
};

function pointInPolygon(point: [number, number], polygon: PolygonGeometry) {
  const ring = polygon.coordinates[0] ?? [];
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [cx, cy] = ring[index];
    const [px, py] = ring[previous];
    const intersects = ((cy > point[1]) !== (py > point[1]))
      && (point[0] < ((px - cx) * (point[1] - cy)) / ((py - cy) || 1e-9) + cx);
    if (intersects) inside = !inside;
  }
  return inside;
}

function orientation(a: [number, number], b: [number, number], c: [number, number]) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function onSegment(a: [number, number], b: [number, number], c: [number, number]) {
  return (
    Math.min(a[0], c[0]) <= b[0]
    && b[0] <= Math.max(a[0], c[0])
    && Math.min(a[1], c[1]) <= b[1]
    && b[1] <= Math.max(a[1], c[1])
  );
}

function segmentsIntersect(a1: [number, number], a2: [number, number], b1: [number, number], b2: [number, number]) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function edgeTouchesPolygon(start: [number, number], end: [number, number], polygon: PolygonGeometry) {
  if (pointInPolygon(start, polygon) || pointInPolygon(end, polygon)) return true;
  const ring = polygon.coordinates[0] ?? [];
  for (let index = 0; index < ring.length - 1; index += 1) {
    if (segmentsIntersect(start, end, ring[index], ring[index + 1])) return true;
  }
  return false;
}

function classifyRoles(edges: EdgeMeasurement[]) {
  const frontageEdges = edges.filter((edge) => edge.touchesPublicRow);
  if (!frontageEdges.length) return edges;

  const selected = frontageEdges.filter((edge) => edge.isSelected);
  const anchor = selected[0] ?? frontageEdges[0];

  return edges.map((edge) => {
    if (edge.edgeIndex === anchor.edgeIndex) {
      return { ...edge, edgeRole: "frontage" as const, isSelected: true };
    }

    const sharesStart =
      edge.lineGeometry.coordinates[0][0] === anchor.lineGeometry.coordinates[0][0]
      && edge.lineGeometry.coordinates[0][1] === anchor.lineGeometry.coordinates[0][1];
    const sharesEnd =
      edge.lineGeometry.coordinates[1][0] === anchor.lineGeometry.coordinates[1][0]
      && edge.lineGeometry.coordinates[1][1] === anchor.lineGeometry.coordinates[1][1];

    if (edge.touchesPublicRow) {
      return { ...edge, edgeRole: "frontage" as const };
    }

    if (sharesStart || sharesEnd) {
      return { ...edge, edgeRole: "side" as const };
    }

    return { ...edge, edgeRole: "rear" as const };
  });
}

export function detectFrontageEdges(
  parcel: PolygonGeometry,
  constraints: ParcelConstraintInput[] = [],
  selectedFrontageEdgeIndex?: number | null,
): FrontageEdge[] {
  const ring = parcel.coordinates[0] ?? [];
  const rowPolygons = constraints
    .filter((constraint) => constraint.constraintType === "row" && constraint.geometry)
    .map((constraint) => constraint.geometry!);

  const measuredEdges: EdgeMeasurement[] = [];
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    const midpoint: [number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const touchesPublicRow = rowPolygons.some((row) => edgeTouchesPolygon(start, end, row));

    measuredEdges.push({
      edgeIndex: index,
      lineGeometry: { type: "LineString", coordinates: [start, end] },
      lengthFt: Math.hypot(end[0] - start[0], end[1] - start[1]),
      edgeRole: "candidate",
      touchesPublicRow,
      isSelected: selectedFrontageEdgeIndex === index,
      metadata: { rowAdjacent: touchesPublicRow },
      midpoint,
      intersectsRow: touchesPublicRow,
    });
  }

  let edges = classifyRoles(measuredEdges);

  if (selectedFrontageEdgeIndex != null) {
    edges = edges.map((edge) => ({
      ...edge,
      edgeRole: edge.edgeIndex === selectedFrontageEdgeIndex ? "frontage" : edge.edgeRole === "frontage" ? "candidate" : edge.edgeRole,
      isSelected: edge.edgeIndex === selectedFrontageEdgeIndex,
    }));
  }

  return edges.map(({ midpoint, intersectsRow, ...edge }) => edge);
}
