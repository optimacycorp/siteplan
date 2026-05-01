import type maplibregl from "maplibre-gl";

type GeoJsonMapSource = { type: "geojson"; data: GeoJSON.FeatureCollection };

export type MapLayerDescriptor = {
  id: string;
  sourceId: string;
  source: GeoJsonMapSource;
  layer: {
    type: "circle" | "line" | "fill" | "symbol";
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
  };
  visible?: boolean;
  interactive?: boolean;
};

const APP_LAYER_ORDER = [
  "neighbors-fill",
  "neighbors-outline",
  "parcel-fill",
  "parcel-outline",
  "drawing-polygons-fill",
  "drawing-polygons-outline",
  "drawing-lines",
  "active-sketch",
  "drawing-labels",
] as const;

function findInsertBeforeLayer(map: maplibregl.Map, layerId: string) {
  const currentIndex = APP_LAYER_ORDER.indexOf(layerId as (typeof APP_LAYER_ORDER)[number]);
  if (currentIndex === -1) return undefined;

  for (let index = currentIndex + 1; index < APP_LAYER_ORDER.length; index += 1) {
    const candidate = APP_LAYER_ORDER[index];
    if (map.getLayer(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function registerMapLayers(map: maplibregl.Map, descriptors: MapLayerDescriptor[]) {
  descriptors.forEach((descriptor) => {
    const existingSource = map.getSource(descriptor.sourceId) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (existingSource) {
      existingSource.setData(descriptor.source.data);
    } else {
      map.addSource(descriptor.sourceId, {
        type: "geojson",
        data: descriptor.source.data,
      });
    }

    if (!map.getLayer(descriptor.id)) {
      const beforeId = findInsertBeforeLayer(map, descriptor.id);
      map.addLayer({
        id: descriptor.id,
        type: descriptor.layer.type,
        source: descriptor.sourceId,
        paint: descriptor.layer.paint as never,
        layout: {
          visibility: descriptor.visible === false ? "none" : "visible",
          ...(descriptor.layer.layout ?? {}),
        } as never,
      } as maplibregl.LayerSpecification, beforeId);
      return;
    }

    const beforeId = findInsertBeforeLayer(map, descriptor.id);
    if (beforeId) {
      map.moveLayer(descriptor.id, beforeId);
    }

    map.setLayoutProperty(
      descriptor.id,
      "visibility",
      descriptor.visible === false ? "none" : "visible",
    );

    Object.entries(descriptor.layer.paint ?? {}).forEach(([key, value]) => {
      map.setPaintProperty(descriptor.id, key, value as never);
    });

    Object.entries(descriptor.layer.layout ?? {}).forEach(([key, value]) => {
      if (key === "visibility") return;
      map.setLayoutProperty(descriptor.id, key, value as never);
    });
  });
}
