import { useEffect, useRef } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";

import { bindInteractiveLayers, registerMapLayers, type MapLayerDescriptor } from "./MapLayerManager";
import { getBasemapDefinition, type BasemapKey } from "./mapProviderRegistry";
import styles from "./BaseMapCanvas.module.css";

type BaseMapCanvasProps = {
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
  basemap: BasemapKey;
  fitNonce?: number;
  layers: MapLayerDescriptor[];
  onFeatureSelect?: (layerId: string, feature: GeoJSON.Feature) => void;
  onFeatureHover?: (layerId: string, feature: GeoJSON.Feature | null) => void;
  onMapClick?: (coordinate: { lng: number; lat: number }) => void;
};

function fitMap(map: maplibregl.Map, bounds: [[number, number], [number, number]]) {
  map.fitBounds(new LngLatBounds(bounds[0], bounds[1]), {
    padding: 84,
    duration: 0,
    maxZoom: 18,
  });
}

function syncMapLayers(
  map: maplibregl.Map,
  layers: MapLayerDescriptor[],
  onFeatureSelect?: (layerId: string, feature: GeoJSON.Feature) => void,
  onFeatureHover?: (layerId: string, feature: GeoJSON.Feature | null) => void,
) {
  registerMapLayers(map, layers);
  bindInteractiveLayers(
    map,
    layers,
    (layerId, feature) => {
      onFeatureSelect?.(layerId, feature);
    },
    (layerId, feature) => {
      onFeatureHover?.(layerId, feature);
    },
  );
}

export function BaseMapCanvas({
  basemap,
  bounds,
  center,
  fitNonce = 0,
  layers,
  onFeatureHover,
  onFeatureSelect,
  onMapClick,
  zoom,
}: BaseMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const featureHoverRef = useRef(onFeatureHover);
  const featureSelectRef = useRef(onFeatureSelect);
  const mapClickRef = useRef(onMapClick);
  const basemapRef = useRef(basemap);
  const layersRef = useRef(layers);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const boundLayerIdsRef = useRef<Set<string>>(new Set());
  const boundsRef = useRef(bounds);

  useEffect(() => {
    featureHoverRef.current = onFeatureHover;
  }, [onFeatureHover]);

  useEffect(() => {
    featureSelectRef.current = onFeatureSelect;
  }, [onFeatureSelect]);

  useEffect(() => {
    mapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBasemapDefinition(basemapRef.current).style,
      center: centerRef.current,
      zoom: zoomRef.current,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");

    map.on("load", () => {
      boundLayerIdsRef.current.clear();
      syncMapLayers(map, layersRef.current, (layerId, feature) => {
        featureSelectRef.current?.(layerId, feature);
      }, (layerId, feature) => {
        featureHoverRef.current?.(layerId, feature);
      });
      fitMap(map, boundsRef.current);
    });

    map.on("styledata", () => {
      if (!map.isStyleLoaded()) {
        return;
      }

      boundLayerIdsRef.current.clear();
      syncMapLayers(map, layersRef.current, (layerId, feature) => {
        featureSelectRef.current?.(layerId, feature);
      }, (layerId, feature) => {
        featureHoverRef.current?.(layerId, feature);
      });
    });

    map.on("click", (event) => {
      mapClickRef.current?.({
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || basemapRef.current === basemap) {
      return;
    }

    basemapRef.current = basemap;
    boundLayerIdsRef.current.clear();
    map.setStyle(getBasemapDefinition(basemap).style);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    registerMapLayers(map, layers);

    layers
      .filter((descriptor) => descriptor.interactive && !boundLayerIdsRef.current.has(descriptor.id))
      .forEach((descriptor) => {
        boundLayerIdsRef.current.add(descriptor.id);
        bindInteractiveLayers(
          map,
          [descriptor],
          (layerId, feature) => {
            featureSelectRef.current?.(layerId, feature);
          },
          (layerId, feature) => {
            featureHoverRef.current?.(layerId, feature);
          },
        );
      });
  }, [layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    fitMap(map, bounds);
  }, [fitNonce]);

  return <div className={styles.mapCanvas} ref={containerRef} />;
}
