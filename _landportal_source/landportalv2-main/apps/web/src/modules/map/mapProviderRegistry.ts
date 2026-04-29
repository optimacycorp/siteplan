import type { StyleSpecification } from "maplibre-gl";

export type BasemapKey = "streets" | "light" | "topo";

export type BasemapDefinition = {
  key: BasemapKey;
  label: string;
  style: StyleSpecification;
};

function rasterStyle(id: string, tiles: string[], paint?: Record<string, unknown>): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      [id]: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: `${id}-layer`,
        type: "raster",
        source: id,
        paint: paint ?? {},
      },
    ],
  };
}

export const mapProviderRegistry: BasemapDefinition[] = [
  {
    key: "streets",
    label: "Streets",
    style: rasterStyle("osm-streets", ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]),
  },
  {
    key: "light",
    label: "Light",
    style: rasterStyle(
      "osm-light",
      ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      {
        "raster-saturation": -0.45,
        "raster-contrast": -0.08,
        "raster-brightness-min": 0.1,
        "raster-brightness-max": 0.92,
      },
    ),
  },
  {
    key: "topo",
    label: "Topo",
    style: rasterStyle("osm-topo", ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"]),
  },
];

export function getBasemapDefinition(key: BasemapKey) {
  return mapProviderRegistry.find((entry) => entry.key === key) ?? mapProviderRegistry[0];
}
