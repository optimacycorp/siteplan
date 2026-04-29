import type { DrawingFeature } from "../types/drawing";
import type { ParcelDetail, ParcelNeighbor } from "../types/parcel";
import type { MapLayerDescriptor } from "./mapLayerManager";

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

export function buildMapLayers(input: {
  selectedParcel: ParcelDetail | null;
  neighbors: ParcelNeighbor[];
  drawings: DrawingFeature[];
  layerVisibility: Record<string, boolean>;
}): MapLayerDescriptor[] {
  const parcelFeatures = input.selectedParcel?.geometry ? [{ type: "Feature", properties: { id: input.selectedParcel.llUuid }, geometry: input.selectedParcel.geometry } as GeoJSON.Feature] : [];
  const neighborFeatures = input.neighbors.flatMap((n) => n.geometry ? [{ type: "Feature", properties: { id: n.llUuid, label: n.headline }, geometry: n.geometry } as GeoJSON.Feature] : []);
  const lineDrawings = input.drawings.filter((d) => d.type !== "label-point" && d.points.length >= 2).map((d) => ({ type: "Feature", properties: { id: d.id, label: d.label }, geometry: { type: "LineString", coordinates: d.points.map((p) => [p.lng, p.lat]) } } as GeoJSON.Feature));
  const labelDrawings = input.drawings.filter((d) => d.type === "label-point" && d.points[0]).map((d) => ({ type: "Feature", properties: { id: d.id, label: d.label }, geometry: { type: "Point", coordinates: [d.points[0].lng, d.points[0].lat] } } as GeoJSON.Feature));

  return [
    { id: "neighbors-fill", sourceId: "neighbors", source: { type: "geojson", data: fc(neighborFeatures) }, layer: { type: "fill", paint: { "fill-color": "#64748b", "fill-opacity": 0.12 } }, visible: input.layerVisibility.neighbors },
    { id: "parcel-fill", sourceId: "parcel", source: { type: "geojson", data: fc(parcelFeatures) }, layer: { type: "fill", paint: { "fill-color": "#22c55e", "fill-opacity": 0.18 } }, visible: input.layerVisibility.parcel },
    { id: "parcel-outline", sourceId: "parcel", source: { type: "geojson", data: fc(parcelFeatures) }, layer: { type: "line", paint: { "line-color": "#16a34a", "line-width": 3 } }, visible: input.layerVisibility.parcel },
    { id: "drawing-lines", sourceId: "drawing-lines", source: { type: "geojson", data: fc(lineDrawings) }, layer: { type: "line", paint: { "line-color": "#0f172a", "line-width": 3 } }, visible: input.layerVisibility.drawings },
    { id: "drawing-labels", sourceId: "drawing-labels", source: { type: "geojson", data: fc(labelDrawings) }, layer: { type: "symbol", layout: { "text-field": ["get", "label"], "text-size": 14, "text-offset": [0, 1.2] }, paint: { "text-color": "#111827" } }, visible: input.layerVisibility.labels },
  ];
}
