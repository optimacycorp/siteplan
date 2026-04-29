import { useEffect, useRef } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";

import styles from "./ProjectMapPage.module.css";

type MapCanvasProps = {
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
  points: GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; name: string; code: string }>;
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString, { id: string; from: string; to: string; label: string }>;
  selectedPointId: string | null;
  showPoints: boolean;
  showLinework: boolean;
  fitNonce: number;
  onSelectPoint: (pointId: string) => void;
};

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function fitMap(map: maplibregl.Map, bounds: [[number, number], [number, number]]) {
  map.fitBounds(new LngLatBounds(bounds[0], bounds[1]), {
    padding: 84,
    duration: 0,
    maxZoom: 18,
  });
}

export function MapCanvas({
  bounds,
  center,
  fitNonce,
  lines,
  onSelectPoint,
  points,
  selectedPointId,
  showLinework,
  showPoints,
  zoom,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center,
      zoom,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");

    map.on("load", () => {
      map.addSource("survey-lines", {
        type: "geojson",
        data: lines,
      });
      map.addSource("survey-points", {
        type: "geojson",
        data: points,
      });

      map.addLayer({
        id: "survey-lines-layer",
        type: "line",
        source: "survey-lines",
        paint: {
          "line-color": "#233252",
          "line-width": 3,
          "line-opacity": 0.88,
        },
      });

      map.addLayer({
        id: "survey-points-layer",
        type: "circle",
        source: "survey-points",
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "id"], selectedPointId ?? ""],
            "#f4f7ff",
            "#ffffff",
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "id"], selectedPointId ?? ""],
            "#2c37d4",
            "#17181a",
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "id"], selectedPointId ?? ""],
            3,
            2,
          ],
          "circle-radius": [
            "case",
            ["==", ["get", "id"], selectedPointId ?? ""],
            7,
            5,
          ],
        },
      });

      map.on("click", "survey-points-layer", (event) => {
        const feature = event.features?.[0];
        const pointId = feature?.properties?.id;
        if (typeof pointId === "string") {
          onSelectPoint(pointId);
        }
      });

      map.on("mouseenter", "survey-points-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "survey-points-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      fitMap(map, bounds);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, center, lines, onSelectPoint, points, selectedPointId, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const lineSource = map.getSource("survey-lines") as maplibregl.GeoJSONSource | undefined;
    const pointSource = map.getSource("survey-points") as maplibregl.GeoJSONSource | undefined;
    lineSource?.setData(lines);
    pointSource?.setData(points);
  }, [lines, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    map.setLayoutProperty("survey-lines-layer", "visibility", showLinework ? "visible" : "none");
    map.setLayoutProperty("survey-points-layer", "visibility", showPoints ? "visible" : "none");
  }, [showLinework, showPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    map.setPaintProperty("survey-points-layer", "circle-color", [
      "case",
      ["==", ["get", "id"], selectedPointId ?? ""],
      "#f4f7ff",
      "#ffffff",
    ]);
    map.setPaintProperty("survey-points-layer", "circle-stroke-color", [
      "case",
      ["==", ["get", "id"], selectedPointId ?? ""],
      "#2c37d4",
      "#17181a",
    ]);
    map.setPaintProperty("survey-points-layer", "circle-stroke-width", [
      "case",
      ["==", ["get", "id"], selectedPointId ?? ""],
      3,
      2,
    ]);
    map.setPaintProperty("survey-points-layer", "circle-radius", [
      "case",
      ["==", ["get", "id"], selectedPointId ?? ""],
      7,
      5,
    ]);
  }, [selectedPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    fitMap(map, bounds);
  }, [bounds, fitNonce]);

  return <div className={styles.mapCanvas} ref={containerRef} />;
}
