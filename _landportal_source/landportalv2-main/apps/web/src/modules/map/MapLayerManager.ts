import type maplibregl from "maplibre-gl";

type GeoJsonMapSource = {
  type: "geojson";
  data: GeoJSON.FeatureCollection;
};

type VectorMapSource = {
  type: "vector";
  url?: string;
  tiles?: string[];
  promoteId?: string;
};

export type MapLayerDescriptor = {
  id: string;
  sourceId: string;
  source: GeoJsonMapSource | VectorMapSource;
  sourceLayer?: string;
  minzoom?: number;
  maxzoom?: number;
  layer: {
    type: "circle" | "line" | "fill" | "symbol";
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    filter?: unknown[];
  };
  visible?: boolean;
  interactive?: boolean;
};

export function registerMapLayers(map: maplibregl.Map, descriptors: MapLayerDescriptor[]) {
  descriptors.forEach((descriptor) => {
    const existingSource = map.getSource(descriptor.sourceId);
    if (descriptor.source.type === "geojson") {
      const existingGeoJsonSource = existingSource as maplibregl.GeoJSONSource | undefined;
      if (existingGeoJsonSource) {
        existingGeoJsonSource.setData(descriptor.source.data);
      } else {
        map.addSource(descriptor.sourceId, {
          type: "geojson",
          data: descriptor.source.data,
        });
      }
    } else if (!existingSource) {
      const vectorSource: Record<string, unknown> = {
        type: "vector",
      };

      if (descriptor.source.url) {
        vectorSource.url = descriptor.source.url;
      }

      if (descriptor.source.tiles?.length) {
        vectorSource.tiles = descriptor.source.tiles;
      }

      if (descriptor.source.promoteId) {
        vectorSource.promoteId = descriptor.source.promoteId;
      }

      map.addSource(descriptor.sourceId, vectorSource as maplibregl.VectorSourceSpecification);
    }

    if (!map.getLayer(descriptor.id)) {
      const layerSpec: Record<string, unknown> = {
        id: descriptor.id,
        type: descriptor.layer.type,
        source: descriptor.sourceId,
        paint: (descriptor.layer.paint ?? {}) as never,
        layout: {
          visibility: descriptor.visible === false ? "none" : "visible",
          ...(descriptor.layer.layout ?? {}),
        } as never,
      };

      if (descriptor.source.type === "vector" && descriptor.sourceLayer) {
        layerSpec["source-layer"] = descriptor.sourceLayer;
      }

      if (descriptor.layer.filter) {
        layerSpec.filter = descriptor.layer.filter as maplibregl.FilterSpecification;
      }

      if (typeof descriptor.minzoom === "number") {
        layerSpec.minzoom = descriptor.minzoom;
      }

      if (typeof descriptor.maxzoom === "number") {
        layerSpec.maxzoom = descriptor.maxzoom;
      }

      map.addLayer(layerSpec as maplibregl.LayerSpecification);
      return;
    }

    map.setLayoutProperty(descriptor.id, "visibility", descriptor.visible === false ? "none" : "visible");

    if (descriptor.layer.filter) {
      map.setFilter(descriptor.id, descriptor.layer.filter as maplibregl.FilterSpecification);
    }

    if (descriptor.layer.paint) {
      Object.entries(descriptor.layer.paint).forEach(([key, value]) => {
        map.setPaintProperty(descriptor.id, key, value as never);
      });
    }

    if (descriptor.layer.layout) {
      Object.entries(descriptor.layer.layout).forEach(([key, value]) => {
        map.setLayoutProperty(descriptor.id, key, value as never);
      });
    }

    if (descriptor.source.type === "vector" && descriptor.sourceLayer) {
      const currentSourceLayer = map.getLayer(descriptor.id);
      if (currentSourceLayer && "source-layer" in currentSourceLayer) {
        const layerSpec = currentSourceLayer as maplibregl.LayerSpecification & { "source-layer"?: string };
        if (layerSpec["source-layer"] !== descriptor.sourceLayer) {
          map.removeLayer(descriptor.id);
          const replacementLayerSpec: Record<string, unknown> = {
            id: descriptor.id,
            type: descriptor.layer.type,
            source: descriptor.sourceId,
            paint: (descriptor.layer.paint ?? {}) as never,
            layout: {
              visibility: descriptor.visible === false ? "none" : "visible",
              ...(descriptor.layer.layout ?? {}),
            } as never,
          };

          if (descriptor.sourceLayer) {
            replacementLayerSpec["source-layer"] = descriptor.sourceLayer;
          }

          if (descriptor.layer.filter) {
            replacementLayerSpec.filter = descriptor.layer.filter as maplibregl.FilterSpecification;
          }

          if (typeof descriptor.minzoom === "number") {
            replacementLayerSpec.minzoom = descriptor.minzoom;
          }

          if (typeof descriptor.maxzoom === "number") {
            replacementLayerSpec.maxzoom = descriptor.maxzoom;
          }

          map.addLayer(replacementLayerSpec as maplibregl.LayerSpecification);
        }
      }
    }
  });
}

export function bindInteractiveLayers(
  map: maplibregl.Map,
  descriptors: MapLayerDescriptor[],
  onFeatureSelect?: (layerId: string, feature: GeoJSON.Feature) => void,
  onFeatureHover?: (layerId: string, feature: GeoJSON.Feature | null) => void,
) {
  descriptors.filter((descriptor) => descriptor.interactive).forEach((descriptor) => {
    map.on("click", descriptor.id, (event) => {
      const feature = event.features?.[0] as GeoJSON.Feature | undefined;
      if (feature) {
        onFeatureSelect?.(descriptor.id, feature);
      }
    });

    map.on("mousemove", descriptor.id, (event) => {
      const feature = event.features?.[0] as GeoJSON.Feature | undefined;
      onFeatureHover?.(descriptor.id, feature ?? null);
    });

    map.on("mouseenter", descriptor.id, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", descriptor.id, () => {
      map.getCanvas().style.cursor = "";
      onFeatureHover?.(descriptor.id, null);
    });
  });
}
