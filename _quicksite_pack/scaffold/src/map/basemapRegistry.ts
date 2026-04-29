import type { StyleSpecification } from "maplibre-gl";

export type BasemapKey = "streets" | "light" | "topo" | "satellite";

export type BasemapDefinition = {
  key: BasemapKey;
  label: string;
  style: StyleSpecification;
};

function rasterStyle(id: string, tiles: string[], attribution: string, paint?: Record<string, unknown>): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      [id]: { type: "raster", tiles, tileSize: 256, attribution },
    },
    layers: [{ id: `${id}-layer`, type: "raster", source: id, paint: paint ?? {} }],
  };
}

export const basemaps: BasemapDefinition[] = [
  { key: "streets", label: "Streets", style: rasterStyle("osm", ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], "© OpenStreetMap contributors") },
  { key: "light", label: "Light", style: rasterStyle("osm-light", ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], "© OpenStreetMap contributors", { "raster-saturation": -0.55, "raster-contrast": -0.1 }) },
  { key: "topo", label: "Topo", style: rasterStyle("topo", ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"], "© OpenTopoMap contributors") },
  { key: "satellite", label: "Aerial", style: rasterStyle("esri-world-imagery", ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], "Tiles © Esri") },
];

export function getBasemapDefinition(key: BasemapKey) {
  return basemaps.find((entry) => entry.key === key) ?? basemaps[0];
}
