import type { RasterSourceSpecification } from "maplibre-gl";

export const USGS_CONTOUR_SOURCE_ID = "usgs-contours";
export const USGS_CONTOUR_LAYER_ID = "usgs-contours-layer";

const USGS_CONTOUR_EXPORT_BASE =
  "https://cartowfs.nationalmap.gov/arcgis/rest/services/contours/MapServer/export";

// Keep terrain endpoints isolated so we can swap to a proxy or different
// public service without touching the map component or UI.
export function buildUsgsContourRasterSource(): RasterSourceSpecification {
  return {
    type: "raster",
    tiles: [
      `${USGS_CONTOUR_EXPORT_BASE}?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image`,
    ],
    tileSize: 256,
    attribution: "USGS The National Map: 3DEP",
  };
}
