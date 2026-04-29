import type { ProjectParcelSelection, ParcelRecord, SitePlanLayout, SubdivisionLayout } from "@landportal/api-client";
import type { RegridParcelNeighbor } from "@/modules/parcel/regridParcelService";

import type { OverlaySettings } from "@/modules/overlays/useOverlaySettings";

import styles from "./DesignConsolePage.module.css";

type DesignMapCanvasProps = {
  adjoiningParcels: RegridParcelNeighbor[];
  contourMajorEvery: number;
  contourMinorInterval: number;
  contoursGenerated: boolean;
  overlaySettings: OverlaySettings;
  parcel: ParcelRecord | null;
  parcelSelection?: ProjectParcelSelection | null;
  sitePlan: SitePlanLayout | null;
  selectedLayout: SubdivisionLayout | null;
};

export function DesignMapCanvas(props: DesignMapCanvasProps) {
  const parcel = props.parcel;
  const summaryArea = parcel?.intelligence?.buildableAreaAcres ?? parcel?.buildableAcres ?? 0;
  const lotCount = props.selectedLayout?.lotCount ?? 0;
  const transformed = buildCanvasTransform(parcel, props.parcelSelection, props.adjoiningParcels);
  const renderParcel = transformed.renderParcel ?? parcel;

  return (
    <main className={styles.mapWrap}>
      <div className={styles.mapHeader}>
        <div className={styles.header}>
          <strong>Operator map workspace</strong>
          <span className={styles.mapBadge}>Dark parcel-first console</span>
        </div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValueLabel}>Buildable</span>
            <span className={styles.summaryValue}>{summaryArea.toFixed(2)} ac</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValueLabel}>Estimated yield</span>
            <span className={styles.summaryValue}>{lotCount || parcel?.maxUnits || 0}</span>
          </div>
        </div>
      </div>

      <div className={styles.mapCard}>
        <svg className={styles.mapSvg} preserveAspectRatio="none" viewBox="0 0 100 100">
          {transformed.adjoiningParcels.length ? transformed.adjoiningParcels.map((neighbor) => (
            <polygon className={styles.adjoiningParcelPolygon} key={neighbor.llUuid} points={polygonToPoints(neighbor.points)} />
          )) : null}
          {renderParcel && isVisible(props.overlaySettings, "raw_parcel") ? (
            <polygon className={styles.parcelPolygon} points={polygonToPoints(renderParcel.polygon)} style={{ opacity: props.overlaySettings.raw_parcel.opacity }} />
          ) : null}
          {renderParcel && renderParcel.normalizedBoundary.length && isVisible(props.overlaySettings, "normalized_parcel") ? (
            <polygon className={styles.normalizedPolygon} points={polygonToPoints(renderParcel.normalizedBoundary)} style={{ opacity: props.overlaySettings.normalized_parcel.opacity }} />
          ) : null}
          {renderParcel && renderParcel.buildableEnvelope.length && isVisible(props.overlaySettings, "buildable_envelope") ? (
            <polygon className={styles.envelopePolygon} points={polygonToPoints(renderParcel.buildableEnvelope)} style={{ opacity: props.overlaySettings.buildable_envelope.opacity }} />
          ) : null}
          {renderParcel && isVisible(props.overlaySettings, "constraints") ? renderParcel.constraints.map((constraint) => (
            <polygon className={styles.constraintPolygon} key={constraint.id} points={polygonToPoints(constraint.points)} style={{ opacity: props.overlaySettings.constraints.opacity }} />
          )) : null}
          {renderParcel && isVisible(props.overlaySettings, "frontage_edges") ? renderParcel.frontageEdges.map((edge) => (
            <polyline className={styles.frontageLine} key={edge.edgeIndex} points={polygonToPoints(edge.points)} style={{ opacity: props.overlaySettings.frontage_edges.opacity }} />
          )) : null}
          {props.contoursGenerated && renderParcel && isVisible(props.overlaySettings, "contours") ? buildContours(props.contourMinorInterval, props.contourMajorEvery).map((line, index) => (
            <polyline className={styles.contourLine} key={`contour-${index}`} points={line} style={{ opacity: props.overlaySettings.contours.opacity }} />
          )) : null}
          {props.selectedLayout && isVisible(props.overlaySettings, "roads") ? props.selectedLayout.lots.slice(0, 1).map((lot) => (
            <polyline className={styles.roadLine} key={`road-${lot.id}`} points={polygonToPoints(transformPoints(lot.polygon, transformed.localToCanvas))} style={{ opacity: props.overlaySettings.roads.opacity * 0.4 }} />
          )) : null}
          {props.selectedLayout ? props.selectedLayout.lots.map((lot) => (
            <g key={lot.id}>
              <polygon className={styles.buildingPolygon} points={polygonToPoints(transformPoints(lot.polygon, transformed.localToCanvas))} style={{ opacity: isVisible(props.overlaySettings, "buildings") ? props.overlaySettings.buildings.opacity * 0.35 : 0 }} />
              {isVisible(props.overlaySettings, "lot_labels") ? <text className={styles.lotLabel} x={(transformPoints(lot.polygon, transformed.localToCanvas)[0]?.x ?? 0) + 1.2} y={(transformPoints(lot.polygon, transformed.localToCanvas)[0]?.y ?? 0) + 3}>{lot.label}</text> : null}
            </g>
          )) : null}
          {props.sitePlan && isVisible(props.overlaySettings, "trees") ? props.sitePlan.elements.filter((element) => element.elementType === "tree").flatMap((element) => element.points.map((point, index) => (
            <circle className={styles.treeCircle} cx={transformPoint(point, transformed.localToCanvas).x} cy={transformPoint(point, transformed.localToCanvas).y} key={`${element.id}-${index}`} r="0.8" style={{ opacity: props.overlaySettings.trees.opacity }} />
          ))) : null}
          {props.sitePlan && isVisible(props.overlaySettings, "utilities") ? props.sitePlan.elements.filter((element) => element.elementType === "utility").map((element) => (
            <polyline className={styles.utilityLine} key={element.id} points={polygonToPoints(transformPoints(element.points, transformed.localToCanvas))} style={{ opacity: props.overlaySettings.utilities.opacity }} />
          )) : null}
          {renderParcel ? <text className={styles.parcelLabel} x="6" y="8">{renderParcel.name}</text> : null}
        </svg>
      </div>
    </main>
  );
}

function polygonToPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function isVisible(settings: OverlaySettings, key: string) {
  return settings[key]?.visible;
}

type CanvasPoint = { x: number; y: number };
type CanvasTransform = {
  localToCanvas: (point: CanvasPoint) => CanvasPoint;
  adjoiningParcels: Array<{ llUuid: string; points: CanvasPoint[] }>;
  renderParcel: ParcelRecord | null;
};

function transformPoint(point: CanvasPoint, mapPoint: (point: CanvasPoint) => CanvasPoint) {
  return mapPoint(point);
}

function transformPoints(points: CanvasPoint[], mapPoint: (point: CanvasPoint) => CanvasPoint) {
  return points.map((point) => mapPoint(point));
}

function buildCanvasTransform(
  parcel: ParcelRecord | null,
  parcelSelection: ProjectParcelSelection | null | undefined,
  adjoiningParcels: RegridParcelNeighbor[],
): CanvasTransform {
  const identity = (point: CanvasPoint) => point;

  if (!parcel || !parcelSelection?.bbox || !parcelSelection.geometry) {
    return {
      localToCanvas: identity,
      adjoiningParcels: [],
      renderParcel: parcel,
    };
  }

  const bbox = parcelSelection.bbox as { minLng?: number; minLat?: number; maxLng?: number; maxLat?: number };
  if (
    typeof bbox.minLng !== "number"
    || typeof bbox.minLat !== "number"
    || typeof bbox.maxLng !== "number"
    || typeof bbox.maxLat !== "number"
  ) {
    return {
      localToCanvas: identity,
      adjoiningParcels: [],
      renderParcel: parcel,
    };
  }

  const minLng = bbox.minLng;
  const maxLng = bbox.maxLng;
  const minLat = bbox.minLat;
  const maxLat = bbox.maxLat;

  const localXs = parcel.polygon.map((point) => point.x);
  const localYs = parcel.polygon.map((point) => point.y);
  const localMinX = Math.min(...localXs);
  const localMaxX = Math.max(...localXs);
  const localMinY = Math.min(...localYs);
  const localMaxY = Math.max(...localYs);
  const localWidth = Math.max(localMaxX - localMinX, 0.0001);
  const localHeight = Math.max(localMaxY - localMinY, 0.0001);

  const selectedGeometry = parcelSelection.geometry as { type?: string; coordinates?: unknown };
  const selectedCoordinates = geometryToCoordinatePairs(selectedGeometry);
  const neighborCoordinates = adjoiningParcels.flatMap((neighbor) => geometryToCoordinatePairs(neighbor.geometry as { type?: string; coordinates?: unknown }));
  const allCoordinates = [...selectedCoordinates, ...neighborCoordinates];

  if (!allCoordinates.length) {
    return {
      localToCanvas: identity,
      adjoiningParcels: [],
      renderParcel: parcel,
    };
  }

  let canvasMinLng = Infinity;
  let canvasMaxLng = -Infinity;
  let canvasMinLat = Infinity;
  let canvasMaxLat = -Infinity;

  allCoordinates.forEach(([lng, lat]) => {
    canvasMinLng = Math.min(canvasMinLng, lng);
    canvasMaxLng = Math.max(canvasMaxLng, lng);
    canvasMinLat = Math.min(canvasMinLat, lat);
    canvasMaxLat = Math.max(canvasMaxLat, lat);
  });

  const expandedWidth = Math.max(canvasMaxLng - canvasMinLng, 0.0001);
  const expandedHeight = Math.max(canvasMaxLat - canvasMinLat, 0.0001);

  const lngLatToCanvas = ([lng, lat]: [number, number]): CanvasPoint => ({
    x: ((lng - canvasMinLng) / expandedWidth) * 100,
    y: ((lat - canvasMinLat) / expandedHeight) * 100,
  });

  const localToCanvas = (point: CanvasPoint): CanvasPoint => {
    const lng = minLng + ((point.x - localMinX) / localWidth) * (maxLng - minLng);
    const lat = minLat + ((point.y - localMinY) / localHeight) * (maxLat - minLat);
    return lngLatToCanvas([lng, lat]);
  };

  return {
    localToCanvas,
    adjoiningParcels: adjoiningParcels.map((neighbor) => ({
      llUuid: neighbor.llUuid,
      points: geometryToCoordinatePairs(neighbor.geometry as { type?: string; coordinates?: unknown }).map(lngLatToCanvas),
    })).filter((neighbor) => neighbor.points.length >= 3),
    renderParcel: {
      ...parcel,
      polygon: transformPoints(parcel.polygon, localToCanvas),
      normalizedBoundary: transformPoints(parcel.normalizedBoundary, localToCanvas),
      buildableEnvelope: transformPoints(parcel.buildableEnvelope, localToCanvas),
      constraints: parcel.constraints.map((constraint) => ({
        ...constraint,
        points: transformPoints(constraint.points, localToCanvas),
      })),
      frontageEdges: parcel.frontageEdges.map((edge) => ({
        ...edge,
        points: transformPoints(edge.points, localToCanvas),
      })),
    },
  };
}

function geometryToCoordinatePairs(geometry: { type?: string; coordinates?: unknown } | null | undefined): [number, number][] {
  if (!geometry?.coordinates) return [];
  if (geometry.type === "Polygon") {
    const ring = (geometry.coordinates as [number, number][][])?.[0] ?? [];
    return ring.slice(0, -1);
  }
  if (geometry.type === "MultiPolygon") {
    const ring = (geometry.coordinates as [number, number][][][])?.[0]?.[0] ?? [];
    return ring.slice(0, -1);
  }
  return [];
}

function buildContours(minorInterval: number, majorEvery: number) {
  const lines: string[] = [];
  const count = Math.max(6, Math.min(14, 18 - minorInterval));
  for (let index = 0; index < count; index += 1) {
    const y = 14 + index * 5.2;
    const sway = index % majorEvery === 0 ? 3.2 : 1.8;
    lines.push(`8,${y} 24,${y - sway} 46,${y + sway} 72,${y - sway} 92,${y}`);
  }
  return lines;
}
