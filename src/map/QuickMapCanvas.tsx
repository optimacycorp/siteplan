import { useEffect, useMemo, useRef } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { fetchParcelAtPoint, fetchParcelNeighbors } from "../services/regridParcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { useDrawingStore } from "../state/drawingStore";
import { getBasemapDefinition } from "./basemapRegistry";
import { buildMapLayers } from "./mapLayers";
import { registerMapLayers } from "./mapLayerManager";
import { geometryBounds } from "./mapUtils";

const defaultCenter: [number, number] = [
  Number(import.meta.env.VITE_DEFAULT_CENTER_LNG ?? -104.871),
  Number(import.meta.env.VITE_DEFAULT_CENTER_LAT ?? 38.93),
];
const defaultZoom = Number(import.meta.env.VITE_DEFAULT_ZOOM ?? 16);

export function QuickMapCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const modeRef = useRef(useDrawingStore.getState().mode);
  const {
    basemap,
    selectedParcel,
    neighbors,
    layerVisibility,
    setSelectedParcel,
    setNeighbors,
    setSelectedParcelLoading,
    setSearchError,
  } = useQuickSiteStore();
  const {
    drawings,
    activePoints,
    selectedDrawingId,
    mode,
    addPoint,
    completeActiveFeature,
    selectDrawing,
  } = useDrawingStore();

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const layers = useMemo(
    () =>
      buildMapLayers({
        selectedParcel,
        neighbors,
        drawings,
        activePoints,
        selectedDrawingId,
        layerVisibility,
      }),
    [selectedParcel, neighbors, drawings, activePoints, selectedDrawingId, layerVisibility],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBasemapDefinition(basemap).style,
      center: selectedParcel?.centroid ?? defaultCenter,
      zoom: defaultZoom,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.doubleClickZoom.disable();

    map.on("click", (event) => {
      const interactiveLayers = ["drawing-polygons-fill", "drawing-lines", "drawing-labels"];
      const feature = map.queryRenderedFeatures(event.point, { layers: interactiveLayers })[0];
      const featureId = feature?.properties?.id;

      if (typeof featureId === "string") {
        selectDrawing(featureId);
        if (modeRef.current === "select") {
          return;
        }
      }

      if (modeRef.current === "select") {
        selectDrawing(null);
        void (async () => {
          setSelectedParcelLoading(true);
          try {
            const detail = await fetchParcelAtPoint({
              lng: event.lngLat.lng,
              lat: event.lngLat.lat,
            });
            if (!detail) {
              setSearchError("No parcel found at that clicked location. Try clicking inside the parcel boundary.");
              return;
            }

            setSearchError("");
            setSelectedParcel(detail);
            if (detail.centroid) {
              setNeighbors(
                await fetchParcelNeighbors({
                  lng: detail.centroid[0],
                  lat: detail.centroid[1],
                  excludeLlUuid: detail.llUuid,
                }),
              );
            } else {
              setNeighbors([]);
            }
          } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Parcel selection failed");
          } finally {
            setSelectedParcelLoading(false);
          }
        })();
        return;
      }

      addPoint({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    map.on("dblclick", (event) => {
      if (modeRef.current === "select") return;
      event.preventDefault();
      completeActiveFeature();
    });

    map.on("load", () => registerMapLayers(map, layers));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(getBasemapDefinition(basemap).style);
    map.once("styledata", () => registerMapLayers(map, layers));
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    registerMapLayers(map, layers);
  }, [layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedParcel?.geometry) return;
    const bounds = geometryBounds(selectedParcel.geometry);
    if (bounds) {
      map.fitBounds(new LngLatBounds(bounds[0], bounds[1]), {
        padding: 80,
        maxZoom: 19,
        duration: 350,
      });
    }
  }, [selectedParcel?.llUuid]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedParcel?.centroid || selectedParcel.geometry) return;
    map.flyTo({
      center: selectedParcel.centroid,
      zoom: Math.max(map.getZoom(), 17),
      duration: 350,
    });
  }, [selectedParcel?.llUuid, selectedParcel?.centroid, selectedParcel?.geometry]);

  return <div className="map-canvas" ref={containerRef} />;
}
