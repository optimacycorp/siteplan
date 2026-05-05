import type maplibregl from "maplibre-gl";
import {
  buildUsgsContourRasterSource,
  USGS_CONTOUR_LAYER_ID,
  USGS_CONTOUR_SOURCE_ID,
} from "./usgsTerrainSources";

export const USGS_CONTOUR_VECTOR_SOURCE_ID = "usgs-contours-vector";
export const USGS_CONTOUR_VECTOR_LINE_LAYER_ID = "usgs-contours-vector-line";
export const USGS_CONTOUR_VECTOR_LABEL_LAYER_ID = "usgs-contours-vector-label";

export type TerrainOverlayOptions = {
  contoursVisible: boolean;
  contourOpacity?: number;
  contourUnits: "feet" | "meters";
  contourFeatures?: GeoJSON.FeatureCollection | null;
};

function findTerrainInsertBeforeLayer(map: maplibregl.Map) {
  const candidates = [
    "neighbors-fill",
    "neighbors-outline",
    "parcel-fill",
    "parcel-outline",
    "drawing-polygons-fill",
  ];

  return candidates.find((id) => map.getLayer(id));
}

function ensureRasterContourLayer(map: maplibregl.Map, options: TerrainOverlayOptions) {
  if (!map.getSource(USGS_CONTOUR_SOURCE_ID)) {
    map.addSource(USGS_CONTOUR_SOURCE_ID, buildUsgsContourRasterSource());
  }

  if (!map.getLayer(USGS_CONTOUR_LAYER_ID)) {
    const beforeId = findTerrainInsertBeforeLayer(map);
    map.addLayer(
      {
        id: USGS_CONTOUR_LAYER_ID,
        type: "raster",
        source: USGS_CONTOUR_SOURCE_ID,
        layout: {
          visibility: options.contoursVisible ? "visible" : "none",
        },
        paint: {
          "raster-opacity": options.contourOpacity ?? 0.65,
        },
      },
      beforeId,
    );
    return;
  }

  map.setLayoutProperty(
    USGS_CONTOUR_LAYER_ID,
    "visibility",
    options.contoursVisible ? "visible" : "none",
  );
  map.setPaintProperty(USGS_CONTOUR_LAYER_ID, "raster-opacity", options.contourOpacity ?? 0.65);
}

function ensureVectorContourLayers(map: maplibregl.Map, options: TerrainOverlayOptions) {
  const contourFeatures = options.contourFeatures ?? { type: "FeatureCollection", features: [] };
  const existingSource = map.getSource(USGS_CONTOUR_VECTOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(contourFeatures);
  } else {
    map.addSource(USGS_CONTOUR_VECTOR_SOURCE_ID, {
      type: "geojson",
      data: contourFeatures,
    });
  }

  const beforeId = findTerrainInsertBeforeLayer(map);

  if (!map.getLayer(USGS_CONTOUR_VECTOR_LINE_LAYER_ID)) {
    map.addLayer(
      {
        id: USGS_CONTOUR_VECTOR_LINE_LAYER_ID,
        type: "line",
        source: USGS_CONTOUR_VECTOR_SOURCE_ID,
        layout: {
          visibility: options.contoursVisible ? "visible" : "none",
        },
        paint: {
          "line-color": "#7c3f00",
          "line-opacity": options.contourOpacity ?? 0.75,
          "line-width": 1.1,
        },
      },
      beforeId,
    );
  } else {
    map.setLayoutProperty(
      USGS_CONTOUR_VECTOR_LINE_LAYER_ID,
      "visibility",
      options.contoursVisible ? "visible" : "none",
    );
    map.setPaintProperty(
      USGS_CONTOUR_VECTOR_LINE_LAYER_ID,
      "line-opacity",
      options.contourOpacity ?? 0.75,
    );
  }

  if (!map.getLayer(USGS_CONTOUR_VECTOR_LABEL_LAYER_ID)) {
    map.addLayer(
      {
        id: USGS_CONTOUR_VECTOR_LABEL_LAYER_ID,
        type: "symbol",
        source: USGS_CONTOUR_VECTOR_SOURCE_ID,
        layout: {
          visibility: options.contoursVisible ? "visible" : "none",
          "symbol-placement": "line",
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-keep-upright": true,
          "text-letter-spacing": 0.02,
        },
        paint: {
          "text-color": "#6b3b14",
          "text-halo-color": "#fff8ef",
          "text-halo-width": 1,
          "text-opacity": Math.min(1, (options.contourOpacity ?? 0.75) + 0.1),
        },
      },
      beforeId,
    );
  } else {
    map.setLayoutProperty(
      USGS_CONTOUR_VECTOR_LABEL_LAYER_ID,
      "visibility",
      options.contoursVisible ? "visible" : "none",
    );
    map.setPaintProperty(
      USGS_CONTOUR_VECTOR_LABEL_LAYER_ID,
      "text-opacity",
      Math.min(1, (options.contourOpacity ?? 0.75) + 0.1),
    );
  }
}

export function registerTerrainOverlays(map: maplibregl.Map, options: TerrainOverlayOptions) {
  if (!map.isStyleLoaded()) return;

  if (options.contourUnits === "feet") {
    ensureVectorContourLayers(map, options);
    if (map.getLayer(USGS_CONTOUR_LAYER_ID)) {
      map.setLayoutProperty(USGS_CONTOUR_LAYER_ID, "visibility", "none");
    }
    return;
  }

  ensureRasterContourLayer(map, options);
  if (map.getLayer(USGS_CONTOUR_VECTOR_LINE_LAYER_ID)) {
    map.setLayoutProperty(USGS_CONTOUR_VECTOR_LINE_LAYER_ID, "visibility", "none");
  }
  if (map.getLayer(USGS_CONTOUR_VECTOR_LABEL_LAYER_ID)) {
    map.setLayoutProperty(USGS_CONTOUR_VECTOR_LABEL_LAYER_ID, "visibility", "none");
  }
}
