import { useEffect, useMemo, useRef } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import {
  fetchParcelCandidatesAtPoint,
  fetchParcelNeighbors,
} from "../services/parcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { useDrawingStore } from "../state/drawingStore";
import { getBasemapDefinition } from "./basemapRegistry";
import { buildMapLayers } from "./mapLayers";
import { registerMapLayers } from "./mapLayerManager";
import { geometryBounds } from "./mapUtils";

const defaultCenter: [number, number] = [
  Number(import.meta.env.VITE_DEFAULT_CENTER_LNG ?? -104.897322),
  Number(import.meta.env.VITE_DEFAULT_CENTER_LAT ?? 38.87837),
];
const defaultZoom = Number(import.meta.env.VITE_DEFAULT_ZOOM ?? 17);

export function QuickMapCanvas() {
  const isExportView =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("export") === "1";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const modeRef = useRef(useDrawingStore.getState().mode);
  const layersRef = useRef<ReturnType<typeof buildMapLayers>>([]);
  const suppressClickRef = useRef(false);
  const exportReadyDispatchedRef = useRef(false);
  const draggingVertexRef = useRef<{ drawingId: string; pointIndex: number } | null>(null);
  const drawingDimensionRef = useRef<{ start: { lng: number; lat: number } } | null>(null);
  const drawingStructureRectRef = useRef<{
    start: { lng: number; lat: number };
    startPixel: { x: number; y: number };
    dragging: boolean;
  } | null>(null);
  const {
    basemap,
    selectedParcel,
    neighbors,
    mapView,
    setMapView,
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
    selectedVertex,
    mode,
    addPoint,
    setActivePoints,
    completeActiveFeature,
    selectDrawing,
    selectVertex,
    updateDrawingPoint,
    insertDrawingPoint,
  } = useDrawingStore();

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  function buildRectanglePoints(
    start: { lng: number; lat: number },
    end: { lng: number; lat: number },
  ) {
    return [
      { lng: start.lng, lat: start.lat },
      { lng: end.lng, lat: start.lat },
      { lng: end.lng, lat: end.lat },
      { lng: start.lng, lat: end.lat },
    ];
  }

  const layers = useMemo(
    () =>
      buildMapLayers({
        selectedParcel,
        neighbors,
        drawings,
        activePoints,
        selectedDrawingId,
        selectedVertex,
        layerVisibility,
      }),
    [selectedParcel, neighbors, drawings, activePoints, selectedDrawingId, selectedVertex, layerVisibility],
  );

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  function syncAppLayers(map: maplibregl.Map) {
    if (!map.isStyleLoaded()) return;
    registerMapLayers(map, layersRef.current);
  }

  function dispatchExportReady() {
    if (!isExportView || exportReadyDispatchedRef.current || typeof window === "undefined") return;
    exportReadyDispatchedRef.current = true;
    window.dispatchEvent(new CustomEvent("quicksite-export-map-ready"));
  }

  function scheduleExportReady(map: maplibregl.Map) {
    if (!isExportView || exportReadyDispatchedRef.current) return;

    const notifyWhenIdle = () => {
      window.setTimeout(() => {
        syncAppLayers(map);
        dispatchExportReady();
      }, 150);
    };

    if (map.loaded()) {
      notifyWhenIdle();
      return;
    }

    map.once("idle", notifyWhenIdle);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBasemapDefinition(basemap).style,
      center: mapView.center ?? selectedParcel?.centroid ?? defaultCenter,
      zoom: mapView.zoom ?? defaultZoom,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.doubleClickZoom.disable();
    setMapView({
      center: [map.getCenter().lng, map.getCenter().lat],
      zoom: map.getZoom(),
    });

    const setCursor = (cursor: string) => {
      map.getCanvas().style.cursor = cursor;
    };

    const finishPointerInteraction = () => {
      map.dragPan.enable();
      draggingVertexRef.current = null;
      drawingDimensionRef.current = null;
      drawingStructureRectRef.current = null;
      setCursor("");
    };

    const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (draggingVertexRef.current) {
        const { drawingId, pointIndex } = draggingVertexRef.current;
        updateDrawingPoint(drawingId, pointIndex, {
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
        });
        return;
      }

      if (drawingDimensionRef.current) {
        const { start } = drawingDimensionRef.current;
        setActivePoints([
          start,
          {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
        ]);
        return;
      }

      if (drawingStructureRectRef.current) {
        const interaction = drawingStructureRectRef.current;
        const pixelDistance = Math.hypot(
          event.point.x - interaction.startPixel.x,
          event.point.y - interaction.startPixel.y,
        );

        if (!interaction.dragging && pixelDistance >= 6) {
          interaction.dragging = true;
        }

        if (interaction.dragging) {
          setActivePoints(
            buildRectanglePoints(interaction.start, {
              lng: event.lngLat.lng,
              lat: event.lngLat.lat,
            }),
          );
        }
      }
    };

    const handleMouseUp = (event: maplibregl.MapMouseEvent) => {
      if (draggingVertexRef.current) {
        suppressClickRef.current = true;
        finishPointerInteraction();
        return;
      }

      if (drawingDimensionRef.current) {
        const { start } = drawingDimensionRef.current;
        setActivePoints([
          start,
          {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
        ]);
        suppressClickRef.current = true;
        completeActiveFeature();
        finishPointerInteraction();
        return;
      }

      if (drawingStructureRectRef.current?.dragging) {
        const { start } = drawingStructureRectRef.current;
        setActivePoints(
          buildRectanglePoints(start, {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          }),
        );
        suppressClickRef.current = true;
        completeActiveFeature();
        finishPointerInteraction();
        return;
      }

      if (drawingStructureRectRef.current && !drawingStructureRectRef.current.dragging) {
        drawingStructureRectRef.current = null;
      }
    };

    map.on("mousemove", handleMouseMove);
    map.on("mouseup", handleMouseUp);
    map.on("moveend", () => {
      setMapView({
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
      });
    });

    map.on("mouseenter", "drawing-vertices", () => {
      if (modeRef.current === "select") {
        setCursor("move");
      }
    });
    map.on("mouseleave", "drawing-vertices", () => {
      if (!draggingVertexRef.current && !drawingDimensionRef.current) {
        setCursor("");
      }
    });
    map.on("mouseenter", "drawing-midpoints", () => {
      if (modeRef.current === "select") {
        setCursor("copy");
      }
    });
    map.on("mouseleave", "drawing-midpoints", () => {
      if (!draggingVertexRef.current && !drawingDimensionRef.current) {
        setCursor("");
      }
    });

    map.on("mousedown", (event) => {
      const vertexFeature = map.queryRenderedFeatures(event.point, {
        layers: ["drawing-vertices"],
      })[0];

      if (modeRef.current === "select" && vertexFeature?.properties) {
        const drawingId = vertexFeature.properties.id;
        const pointIndex = Number(vertexFeature.properties.pointIndex);
        if (typeof drawingId === "string" && Number.isFinite(pointIndex)) {
          draggingVertexRef.current = { drawingId, pointIndex };
          selectDrawing(drawingId);
          selectVertex({ drawingId, pointIndex });
          map.dragPan.disable();
          setCursor("grabbing");
          return;
        }
      }

      const midpointFeature = map.queryRenderedFeatures(event.point, {
        layers: ["drawing-midpoints"],
      })[0];

      if (modeRef.current === "select" && midpointFeature?.properties) {
        const drawingId = midpointFeature.properties.id;
        const insertIndex = Number(midpointFeature.properties.insertIndex);
        if (typeof drawingId === "string" && Number.isFinite(insertIndex)) {
          insertDrawingPoint(drawingId, insertIndex, {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          });
          suppressClickRef.current = true;
          return;
        }
      }

      if (modeRef.current === "dimension-line") {
        drawingDimensionRef.current = {
          start: {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
        };
        map.dragPan.disable();
        setActivePoints([
          {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
          {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
        ]);
        setCursor("crosshair");
        return;
      }

      if (modeRef.current === "structure-polygon") {
        drawingStructureRectRef.current = {
          start: {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
          startPixel: {
            x: event.point.x,
            y: event.point.y,
          },
          dragging: false,
        };
      }
    });

    map.on("click", (event) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }

      const interactiveLayers = ["drawing-polygons-fill", "drawing-lines", "drawing-labels"];
      const feature = map.queryRenderedFeatures(event.point, { layers: interactiveLayers })[0];
      const featureId = feature?.properties?.id;

      if (typeof featureId === "string") {
        selectDrawing(featureId);
        selectVertex(null);
        if (modeRef.current === "select") {
          return;
        }
      }

      if (modeRef.current === "select") {
        selectDrawing(null);
        selectVertex(null);
        void (async () => {
          setSelectedParcelLoading(true);
          try {
            const clickPoint = {
              lng: event.lngLat.lng,
              lat: event.lngLat.lat,
            };
            const candidates = await fetchParcelCandidatesAtPoint(clickPoint);
            const detail = candidates[0] ?? null;
            if (!detail) {
              setSearchError(
                `No parcel found at that clicked location (${clickPoint.lat.toFixed(6)}, ${clickPoint.lng.toFixed(6)}). Try clicking inside the parcel boundary.`,
              );
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

      if (modeRef.current === "dimension-line") {
        return;
      }

      addPoint({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    map.on("dblclick", (event) => {
      if (modeRef.current === "select") return;
      event.preventDefault();
      completeActiveFeature();
    });

    map.on("load", () => {
      syncAppLayers(map);
      scheduleExportReady(map);
    });
    mapRef.current = map;

    return () => {
      map.off("mousemove", handleMouseMove);
      map.off("mouseup", handleMouseUp);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    exportReadyDispatchedRef.current = false;
    map.setStyle(getBasemapDefinition(basemap).style);
    map.once("style.load", () => {
      syncAppLayers(map);
      scheduleExportReady(map);
    });
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncAppLayers(map);
    scheduleExportReady(map);
  }, [layers]);

  useEffect(() => {
    if (isExportView) return;
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
    if (isExportView) return;
    const map = mapRef.current;
    if (!map || !selectedParcel?.centroid || selectedParcel.geometry) return;
    map.flyTo({
      center: selectedParcel.centroid,
      zoom: Math.max(map.getZoom(), 17),
      duration: 350,
    });
  }, [selectedParcel?.llUuid, selectedParcel?.centroid, selectedParcel?.geometry]);

  const mapHint =
    mode === "select"
      ? selectedDrawingId
        ? "Drag blue vertices to reshape the selection. Click amber midpoint handles to insert a new vertex."
        : "Click a parcel to select it, or click a drawing to edit it."
      : mode === "structure-polygon"
        ? "Click to place custom corners, or click-drag to drop a rectangle."
        : mode === "dimension-line"
          ? "Click-drag to place a dimension line in one motion."
          : "Click to place points. Double-click or use Complete to finish.";

  return (
    <>
      <div className="map-canvas" ref={containerRef} />
      {!isExportView ? <div className="map-hint-overlay">{mapHint}</div> : null}
    </>
  );
}
