# Concrete Patch Guidance — Terrain Overlay

This is not guaranteed to apply as-is because the live branch may have shifted, but it gives Codex a strong target.

```diff
*** Add File: src/map/usgsTerrainSources.ts
+import type { RasterSourceSpecification } from "maplibre-gl";
+
+export const USGS_CONTOUR_SOURCE_ID = "usgs-contours";
+export const USGS_CONTOUR_LAYER_ID = "usgs-contours-layer";
+
+// Keep service URLs isolated here so the source can be swapped to a proxy,
+// WMS endpoint, or ArcGIS export endpoint without touching the map component.
+export function buildUsgsContourRasterSource(): RasterSourceSpecification {
+  return {
+    type: "raster",
+    tiles: [
+      // Placeholder URL strategy. Codex should verify the exact public endpoint format
+      // during implementation and keep this function as the single source of truth.
+      "https://cartowfs.nationalmap.gov/arcgis/rest/services/contours/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image",
+    ],
+    tileSize: 256,
+    attribution: "USGS The National Map: 3DEP",
+  };
+}
+
*** Add File: src/map/terrainLayerManager.ts
+import type maplibregl from "maplibre-gl";
+import {
+  buildUsgsContourRasterSource,
+  USGS_CONTOUR_LAYER_ID,
+  USGS_CONTOUR_SOURCE_ID,
+} from "./usgsTerrainSources";
+
+export type TerrainOverlayOptions = {
+  contoursVisible: boolean;
+  contourOpacity?: number;
+};
+
+function findTerrainInsertBeforeLayer(map: maplibregl.Map) {
+  const candidates = ["neighbors-fill", "parcel-fill", "parcel-outline", "drawing-polygons-fill"];
+  return candidates.find((id) => map.getLayer(id));
+}
+
+export function registerTerrainOverlays(map: maplibregl.Map, options: TerrainOverlayOptions) {
+  if (!map.isStyleLoaded()) return;
+
+  if (!map.getSource(USGS_CONTOUR_SOURCE_ID)) {
+    map.addSource(USGS_CONTOUR_SOURCE_ID, buildUsgsContourRasterSource());
+  }
+
+  if (!map.getLayer(USGS_CONTOUR_LAYER_ID)) {
+    const beforeId = findTerrainInsertBeforeLayer(map);
+    map.addLayer(
+      {
+        id: USGS_CONTOUR_LAYER_ID,
+        type: "raster",
+        source: USGS_CONTOUR_SOURCE_ID,
+        layout: {
+          visibility: options.contoursVisible ? "visible" : "none",
+        },
+        paint: {
+          "raster-opacity": options.contourOpacity ?? 0.65,
+        },
+      },
+      beforeId,
+    );
+    return;
+  }
+
+  map.setLayoutProperty(
+    USGS_CONTOUR_LAYER_ID,
+    "visibility",
+    options.contoursVisible ? "visible" : "none",
+  );
+  map.setPaintProperty(USGS_CONTOUR_LAYER_ID, "raster-opacity", options.contourOpacity ?? 0.65);
+}
+
*** Modify File: src/map/QuickMapCanvas.tsx
@@
 import { registerMapLayers } from "./mapLayerManager";
+import { registerTerrainOverlays } from "./terrainLayerManager";
@@
   function syncAppLayers(map: maplibregl.Map) {
     if (!map.isStyleLoaded()) return;
+    registerTerrainOverlays(map, {
+      contoursVisible: Boolean(useQuickSiteStore.getState().layerVisibility.contours),
+      contourOpacity: 0.65,
+    });
     registerMapLayers(map, layersRef.current);
   }
```

Codex should verify the MapServer export URL works with MapLibre tile requests. If MapLibre does not expand `{bbox-epsg-3857}` for this source type, use a WMS-compatible template or create `server/usgsTerrainProxy.mjs` to translate tile x/y/z to bbox and stream the PNG.
