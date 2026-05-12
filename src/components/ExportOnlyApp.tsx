import { useEffect, useState } from "react";
import { readExportSession } from "../export/exportSession";
import { geometryBounds, pointBounds } from "../map/mapUtils";
import { QuickMapCanvas } from "../map/QuickMapCanvas";
import { useDrawingStore } from "../state/drawingStore";
import { usePointImportStore } from "../state/pointImportStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { PrintPlanSheet } from "./PrintPlanSheet";

export function ExportOnlyApp() {
  const [ready, setReady] = useState(false);
  const [exportMode, setExportMode] = useState<"default" | "streets-context" | "streets-detail" | "satellite">("default");
  const exportMeta = useQuickSiteStore((state) => state.exportMeta);
  const setExportMeta = useQuickSiteStore((state) => state.setExportMeta);
  const focusMapBounds = useQuickSiteStore((state) => state.focusMapBounds);
  const hydrateQuickSite = useQuickSiteStore((state) => state.hydrateExportSession);
  const hydrateDrawings = useDrawingStore((state) => state.hydrateExportSession);
  const hydratePoints = usePointImportStore((state) => state.hydrateExportSession);

  useEffect(() => {
    const payload = readExportSession();
    if (!payload) {
      setReady(true);
      return;
    }
    setExportMode(payload.exportMode ?? "default");

    hydrateQuickSite({
      basemap: payload.basemap as never,
      selectedParcel: payload.selectedParcel,
      neighbors: payload.neighbors,
      mapView: payload.mapView,
      terrainSettings: payload.terrainSettings,
      exportMeta: payload.exportMeta,
      layerVisibility: payload.layerVisibility,
    });
    hydrateDrawings({
      drawings: payload.drawings,
    });
    hydratePoints({
      importedPoints: payload.importedPoints,
      transform: payload.pointTransform,
    });
    if (payload.exportMode === "streets-detail") {
      const bounds = [
        payload.selectedParcel?.geometry ? geometryBounds(payload.selectedParcel.geometry) : null,
        payload.importedPoints.length
          ? pointBounds(payload.importedPoints.map((point) => ({ lng: point.lng, lat: point.lat })))
          : null,
      ].filter(Boolean) as Array<[[number, number], [number, number]]>;

      if (bounds.length) {
        const mergedBounds = bounds.reduce((acc, next) => [
          [Math.min(acc[0][0], next[0][0]), Math.min(acc[0][1], next[0][1])],
          [Math.max(acc[1][0], next[1][0]), Math.max(acc[1][1], next[1][1])],
        ]);
        focusMapBounds(mergedBounds, payload.importedPoints.length ? 20 : 19);
      }
    }
    setReady(true);
  }, [focusMapBounds, hydrateDrawings, hydratePoints, hydrateQuickSite]);

  useEffect(() => {
    if (!ready) return;
    if (new URLSearchParams(window.location.search).get("autoprint") !== "1") return;

    const handleMapReady = () => {
      window.setTimeout(() => window.print(), 150);
    };

    window.addEventListener("quicksite-export-map-ready", handleMapReady, { once: true });
    return () => {
      window.removeEventListener("quicksite-export-map-ready", handleMapReady);
    };
  }, [ready]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "quicksite-print-page-size";
    const existing = document.getElementById(styleId);
    const style = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
    style.id = styleId;
    style.media = "print";
    style.textContent =
      exportMeta.pageSize === "tabloid"
        ? "@page { size: 17in 11in; margin: 0.35in; }"
        : "@page { size: 11in 8.5in; margin: 0.35in; }";
    if (!existing) {
      document.head.appendChild(style);
    }
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [exportMeta.pageSize]);

  if (!ready) {
    return (
      <div className="export-only-shell">
        <div className="export-loading">Preparing export map...</div>
      </div>
    );
  }

  return (
    <div className={`export-only-shell export-only-shell-${exportMeta.pageSize}`}>
      <div className="export-preview-toolbar">
        <div>
          <strong>Export preview</strong>
          <p className="muted">
            {exportMode === "streets-detail"
              ? "Detail streets view fitted to the selected parcel and imported points."
              : exportMode === "streets-context"
                ? "Context streets view preserving the current map extent and visible layers."
                : "Review the map sheet, choose letter or tabloid, then print or save PDF."}
          </p>
        </div>
        <label className="field-label export-preview-field" htmlFor="export-page-size">
          Page size
          <select
            className="search-input"
            id="export-page-size"
            value={exportMeta.pageSize}
            onChange={(event) =>
              setExportMeta({
                pageSize: event.target.value === "tabloid" ? "tabloid" : "letter",
              })
            }
          >
            <option value="letter">Letter landscape</option>
            <option value="tabloid">Tabloid landscape</option>
          </select>
        </label>
        <div className="card-actions">
          <button className="primary-button" onClick={() => window.print()} type="button">
            Print / Save PDF
          </button>
          <button className="secondary-button" onClick={() => window.close()} type="button">
            Close preview
          </button>
        </div>
      </div>
      <div className="map-panel export-only-map-panel">
        <QuickMapCanvas />
        <PrintPlanSheet variant="map" exportMode={exportMode} />
      </div>
      <PrintPlanSheet variant="details" exportMode={exportMode} />
    </div>
  );
}
