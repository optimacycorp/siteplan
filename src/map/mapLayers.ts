import type { DrawingFeature } from "../types/drawing";
import type { ParcelDetail, ParcelNeighbor } from "../types/parcel";
import type { MapLayerDescriptor } from "./mapLayerManager";
import {
  distanceMeters,
  formatAreaLabel,
  formatFeetLabel,
  polygonAreaSquareMeters,
  polygonCentroid,
} from "./mapUtils";

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function polygonCoordinates(points: DrawingFeature["points"]) {
  const ring = points.map((point) => [point.lng, point.lat]);
  if (!ring.length) return [];
  const [firstLng, firstLat] = ring[0];
  return [[...ring, [firstLng, firstLat]]];
}

function midpoint(a: DrawingFeature["points"][number], b: DrawingFeature["points"][number]) {
  return {
    lng: (a.lng + b.lng) / 2,
    lat: (a.lat + b.lat) / 2,
  };
}

export function buildMapLayers(input: {
  selectedParcel: ParcelDetail | null;
  neighbors: ParcelNeighbor[];
  drawings: DrawingFeature[];
  activePoints?: DrawingFeature["points"];
  selectedDrawingId?: string | null;
  selectedVertex?: { drawingId: string; pointIndex: number } | null;
  layerVisibility: Record<string, boolean>;
}): MapLayerDescriptor[] {
  const parcelFeatures = input.selectedParcel?.geometry
    ? [
        {
          type: "Feature",
          properties: { id: input.selectedParcel.llUuid },
          geometry: input.selectedParcel.geometry,
        } as GeoJSON.Feature,
      ]
    : [];

  const neighborFeatures = input.neighbors.flatMap((neighbor) =>
    neighbor.geometry
      ? [
          {
            type: "Feature",
            properties: { id: neighbor.llUuid, label: neighbor.headline },
            geometry: neighbor.geometry,
          } as GeoJSON.Feature,
        ]
      : [],
  );

  const polygonDrawings = input.drawings
    .filter((drawing) => drawing.type === "structure-polygon" && drawing.points.length >= 3)
    .map(
      (drawing) =>
        ({
          type: "Feature",
          properties: {
            id: drawing.id,
            label: drawing.label,
            selected: drawing.id === input.selectedDrawingId,
          },
          geometry: {
            type: "Polygon",
            coordinates: polygonCoordinates(drawing.points),
          },
        }) as GeoJSON.Feature,
    );

  const lineDrawings = input.drawings
    .filter(
      (drawing) =>
        drawing.type !== "label-point" &&
        drawing.type !== "structure-polygon" &&
        drawing.points.length >= 2,
    )
    .map(
      (drawing) =>
        ({
          type: "Feature",
          properties: {
            id: drawing.id,
            label: drawing.label,
            selected: drawing.id === input.selectedDrawingId,
            kind: drawing.type,
          },
          geometry: {
            type: "LineString",
            coordinates: drawing.points.map((point) => [point.lng, point.lat]),
          },
        }) as GeoJSON.Feature,
    );

  const lineMeasurementLabels = input.drawings
    .filter(
      (drawing) =>
        drawing.type !== "label-point" &&
        drawing.type !== "structure-polygon" &&
        drawing.points.length >= 2,
    )
    .flatMap((drawing) => {
      const start = drawing.points[0];
      const end = drawing.points[drawing.points.length - 1];
      const mid = midpoint(start, end);
      const label = formatFeetLabel(distanceMeters(start.lng, start.lat, end.lng, end.lat));
      return [
        {
          type: "Feature",
          properties: {
            id: `${drawing.id}-measurement`,
            label,
          },
          geometry: {
            type: "Point",
            coordinates: [mid.lng, mid.lat],
          },
        } as GeoJSON.Feature,
      ];
    });

  const polygonMeasurementLabels = input.drawings
    .filter((drawing) => drawing.type === "structure-polygon" && drawing.points.length >= 3)
    .flatMap((drawing) => {
      const centroid = polygonCentroid(drawing.points);
      if (!centroid) return [];
      const label = formatAreaLabel(polygonAreaSquareMeters(drawing.points));
      return [
        {
          type: "Feature",
          properties: {
            id: `${drawing.id}-area`,
            label,
          },
          geometry: {
            type: "Point",
            coordinates: [centroid.lng, centroid.lat],
          },
        } as GeoJSON.Feature,
      ];
    });

  const labelDrawings = input.drawings
    .filter((drawing) => drawing.type === "label-point" && drawing.points[0])
    .map(
      (drawing) =>
        ({
          type: "Feature",
          properties: { id: drawing.id, label: drawing.label },
          geometry: {
            type: "Point",
            coordinates: [drawing.points[0].lng, drawing.points[0].lat],
          },
        }) as GeoJSON.Feature,
    );

  const selectedDrawing =
    input.drawings.find((drawing) => drawing.id === input.selectedDrawingId) ?? null;

  const selectedDrawingVertices = selectedDrawing
    ? selectedDrawing.points.map(
        (point, index) =>
          ({
            type: "Feature",
            properties: {
              id: selectedDrawing.id,
              pointIndex: index,
              label: selectedDrawing.label,
              selected:
                input.selectedVertex?.drawingId === selectedDrawing.id &&
                input.selectedVertex?.pointIndex === index,
            },
            geometry: {
              type: "Point",
              coordinates: [point.lng, point.lat],
            },
          }) as GeoJSON.Feature,
      )
    : [];

  const selectedDrawingMidpoints = selectedDrawing
    ? selectedDrawing.points.flatMap((point, index, points) => {
        const nextIndex =
          selectedDrawing.type === "structure-polygon"
            ? (index + 1) % points.length
            : index + 1;
        const nextPoint = points[nextIndex];
        if (!nextPoint || (selectedDrawing.type !== "structure-polygon" && index === points.length - 1)) {
          return [];
        }
        const mid = midpoint(point, nextPoint);
        return [
          {
            type: "Feature",
            properties: {
              id: selectedDrawing.id,
              insertIndex: index + 1,
              label: selectedDrawing.label,
            },
            geometry: {
              type: "Point",
              coordinates: [mid.lng, mid.lat],
            },
          } as GeoJSON.Feature,
        ];
      })
    : [];

  const sketchFeatures =
    (input.activePoints?.length ?? 0) >= 1
      ? [
          {
            type: "Feature",
            properties: { id: "active-sketch" },
            geometry: {
              type: "LineString",
              coordinates: (input.activePoints ?? []).map((point) => [point.lng, point.lat]),
            },
          } as GeoJSON.Feature,
        ]
      : [];

  const activeSketchVertices =
    (input.activePoints?.length ?? 0) >= 1
      ? (input.activePoints ?? []).map(
          (point, index) =>
            ({
              type: "Feature",
              properties: { id: "active-sketch", pointIndex: index },
              geometry: {
                type: "Point",
                coordinates: [point.lng, point.lat],
              },
            }) as GeoJSON.Feature,
        )
      : [];

  return [
    {
      id: "neighbors-fill",
      sourceId: "neighbors",
      source: { type: "geojson", data: fc(neighborFeatures) },
      layer: { type: "fill", paint: { "fill-color": "#64748b", "fill-opacity": 0.12 } },
      visible: input.layerVisibility.neighbors,
    },
    {
      id: "neighbors-outline",
      sourceId: "neighbors",
      source: { type: "geojson", data: fc(neighborFeatures) },
      layer: {
        type: "line",
        paint: { "line-color": "#94a3b8", "line-width": 1.5, "line-dasharray": [2, 2] },
      },
      visible: input.layerVisibility.neighbors,
    },
    {
      id: "parcel-fill",
      sourceId: "parcel",
      source: { type: "geojson", data: fc(parcelFeatures) },
      layer: { type: "fill", paint: { "fill-color": "#22c55e", "fill-opacity": 0.18 } },
      visible: input.layerVisibility.parcel,
    },
    {
      id: "parcel-outline",
      sourceId: "parcel",
      source: { type: "geojson", data: fc(parcelFeatures) },
      layer: { type: "line", paint: { "line-color": "#16a34a", "line-width": 3 } },
      visible: input.layerVisibility.parcel,
    },
    {
      id: "drawing-polygons-fill",
      sourceId: "drawing-polygons",
      source: { type: "geojson", data: fc(polygonDrawings) },
      layer: {
        type: "fill",
        paint: {
          "fill-color": ["case", ["boolean", ["get", "selected"], false], "#fb923c", "#f59e0b"],
          "fill-opacity": 0.25,
        },
      },
      visible: input.layerVisibility.drawings,
      interactive: true,
    },
    {
      id: "drawing-polygons-outline",
      sourceId: "drawing-polygons",
      source: { type: "geojson", data: fc(polygonDrawings) },
      layer: {
        type: "line",
        paint: {
          "line-color": ["case", ["boolean", ["get", "selected"], false], "#ea580c", "#b45309"],
          "line-width": 2.5,
        },
      },
      visible: input.layerVisibility.drawings,
    },
    {
      id: "drawing-lines",
      sourceId: "drawing-lines",
      source: { type: "geojson", data: fc(lineDrawings) },
      layer: {
        type: "line",
        paint: {
          "line-color": ["case", ["boolean", ["get", "selected"], false], "#1d4ed8", "#0f172a"],
          "line-width": ["case", ["boolean", ["get", "selected"], false], 4, 3],
        },
      },
      visible: input.layerVisibility.drawings,
      interactive: true,
    },
    {
      id: "drawing-labels",
      sourceId: "drawing-labels",
      source: { type: "geojson", data: fc(labelDrawings) },
      layer: {
        type: "symbol",
        layout: { "text-field": ["get", "label"], "text-size": 14, "text-offset": [0, 1.2] },
        paint: { "text-color": "#111827" },
      },
      visible: input.layerVisibility.labels,
      interactive: true,
    },
    {
      id: "drawing-measurements",
      sourceId: "drawing-measurements",
      source: { type: "geojson", data: fc([...lineMeasurementLabels, ...polygonMeasurementLabels]) },
      layer: {
        type: "symbol",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-offset": [0, 0],
        },
        paint: {
          "text-color": "#172534",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      },
      visible: input.layerVisibility.labels,
    },
    {
      id: "drawing-vertices",
      sourceId: "drawing-vertices",
      source: { type: "geojson", data: fc(selectedDrawingVertices) },
      layer: {
        type: "circle",
        paint: {
          "circle-radius": ["case", ["boolean", ["get", "selected"], false], 8, 6],
          "circle-color": ["case", ["boolean", ["get", "selected"], false], "#f59e0b", "#ffffff"],
          "circle-stroke-color": ["case", ["boolean", ["get", "selected"], false], "#b45309", "#2563eb"],
          "circle-stroke-width": ["case", ["boolean", ["get", "selected"], false], 3, 2],
        },
      },
      visible: input.layerVisibility.drawings,
      interactive: true,
    },
    {
      id: "drawing-midpoints",
      sourceId: "drawing-midpoints",
      source: { type: "geojson", data: fc(selectedDrawingMidpoints) },
      layer: {
        type: "circle",
        paint: {
          "circle-radius": 4,
          "circle-color": "#f8fafc",
          "circle-stroke-color": "#f59e0b",
          "circle-stroke-width": 2,
        },
      },
      visible: input.layerVisibility.drawings,
      interactive: true,
    },
    {
      id: "active-sketch",
      sourceId: "active-sketch",
      source: { type: "geojson", data: fc(sketchFeatures) },
      layer: {
        type: "line",
        paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 2] },
      },
      visible: true,
    },
    {
      id: "active-sketch-vertices",
      sourceId: "active-sketch-vertices",
      source: { type: "geojson", data: fc(activeSketchVertices) },
      layer: {
        type: "circle",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#2563eb",
          "circle-stroke-width": 2,
        },
      },
      visible: true,
    },
  ];
}
