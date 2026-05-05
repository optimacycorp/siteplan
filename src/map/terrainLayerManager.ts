import type maplibregl from "maplibre-gl";
import {
  buildUsgsContourRasterSource,
  USGS_CONTOUR_LAYER_ID,
  USGS_CONTOUR_SOURCE_ID,
} from "./usgsTerrainSources";

export type TerrainOverlayOptions = {
  contoursVisible: boolean;
  contourOpacity?: number;
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

export function registerTerrainOverlays(map: maplibregl.Map, options: TerrainOverlayOptions) {
  if (!map.isStyleLoaded()) return;

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
