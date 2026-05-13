import { useEffect, useState } from "react";
import { readExportSession } from "../export/exportSession";
import { geometryBounds, pointBounds } from "../map/mapUtils";
import { QuickMapCanvas } from "../map/QuickMapCanvas";
import { useDrawingStore } from "../state/drawingStore";
import { usePointImportStore } from "../state/pointImportStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { PrintPlanSheet } from "./PrintPlanSheet";

const PLOT_FRAME_INCHES: Record<"letter" | "tabloid" | "arch-d", { width: number; height: number }> = {
  letter: { width: 10.3, height: 7.4 },
  tabloid: { width: 16.3, height: 9.9 },
  "arch-d": { width: 35.3, height: 22.5 },
};

function feetToLatitudeDegrees(feet: number) {
  return (feet * 0.3048) / 111_320;
}

function feetToLongitudeDegrees(feet: number, latitude: number) {
  const cosine = Math.cos((latitude * Math.PI) / 180);
  const safeCosine = Math.max(0.2, Math.abs(cosine));
  return (feet * 0.3048) / (111_320 * safeCosine);
}

export function ExportOnlyApp() {
  const [ready, setReady] = useState(false);
  const [exportMode, setExportMode] = useState<"default" | "streets-context" | "streets-detail" | "satellite">("default");
  const [framingMode, setFramingMode] = useState<"preserve-zoom" | "fit-to-content">("preserve-zoom");
  const exportMeta = useQuickSiteStore((state) => state.exportMeta);
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const mapView = useQuickSiteStore((state) => state.mapView);
  const setExportMeta = useQuickSiteStore((state) => state.setExportMeta);
  const focusMapBounds = useQuickSiteStore((state) => state.focusMapBounds);
  const focusMapPoint = useQuickSiteStore((state) => state.focusMapPoint);
  const hydrateQuickSite = useQuickSiteStore((state) => state.hydrateExportSession);
  const hydrateDrawings = useDrawingStore((state) => state.hydrateExportSession);
  const hydratePoints = usePointImportStore((state) => state.hydrateExportSession);
  const importedPoints = usePointImportStore((state) => state.importedPoints);
  const selectedPointId = usePointImportStore((state) => state.selectedPointId);

  function mergeBounds(bounds: Array<[[number, number], [number, number]]>) {
    if (!bounds.length) return null;
    return bounds.reduce((acc, next) => [
      [Math.min(acc[0][0], next[0][0]), Math.min(acc[0][1], next[0][1])],
      [Math.max(acc[1][0], next[1][0]), Math.max(acc[1][1], next[1][1])],
    ]);
  }

  function fixedScaleBoundsForCenter(
    center: [number, number],
    pageSize: "letter" | "tabloid" | "arch-d",
    feetPerInch: 10 | 20 | 30 | 40 | 50 | 60 | 100,
  ): [[number, number], [number, number]] {
    const frame = PLOT_FRAME_INCHES[pageSize];
    const halfWidthFeet = (frame.width * feetPerInch) / 2;
    const halfHeightFeet = (frame.height * feetPerInch) / 2;
    const latDelta = feetToLatitudeDegrees(halfHeightFeet);
    const lngDelta = feetToLongitudeDegrees(halfWidthFeet, center[1]);
    return [
      [center[0] - lngDelta, center[1] - latDelta],
      [center[0] + lngDelta, center[1] + latDelta],
    ];
  }

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
      selectedPointId: payload.selectedPointId,
    });
    if (payload.exportMode === "streets-detail") {
      const bounds = [
        payload.selectedParcel?.geometry ? geometryBounds(payload.selectedParcel.geometry) : null,
        payload.importedPoints.length
          ? pointBounds(payload.importedPoints.map((point) => ({ lng: point.lng, lat: point.lat })))
          : null,
      ].filter(Boolean) as Array<[[number, number], [number, number]]>;

      if (bounds.length) {
        const mergedBounds = mergeBounds(bounds);
        if (!mergedBounds) {
          setReady(true);
          return;
        }
        focusMapBounds(mergedBounds, payload.importedPoints.length ? 20 : 19);
      }
    }
    if (payload.exportMeta.plotMode === "fixed-scale" && payload.selectedParcel?.centroid) {
      focusMapBounds(
        fixedScaleBoundsForCenter(
          payload.selectedParcel.centroid,
          payload.exportMeta.pageSize,
          payload.exportMeta.plotScaleFeetPerInch,
        ),
      );
    }
    setReady(true);
  }, [focusMapBounds, hydrateDrawings, hydratePoints, hydrateQuickSite]);

  function centerOnParcel() {
    if (exportMeta.plotMode === "fixed-scale" && selectedParcel?.centroid) {
      focusMapBounds(
        fixedScaleBoundsForCenter(
          selectedParcel.centroid,
          exportMeta.pageSize,
          exportMeta.plotScaleFeetPerInch,
        ),
      );
      return;
    }
    const parcelBounds = selectedParcel?.geometry ? geometryBounds(selectedParcel.geometry) : null;
    if (framingMode === "fit-to-content" && parcelBounds) {
      focusMapBounds(parcelBounds, 19);
      return;
    }
    if (selectedParcel?.centroid) {
      focusMapPoint(selectedParcel.centroid, mapView.zoom);
      return;
    }
    if (parcelBounds) {
      const center: [number, number] = [
        (parcelBounds[0][0] + parcelBounds[1][0]) / 2,
        (parcelBounds[0][1] + parcelBounds[1][1]) / 2,
      ];
      focusMapPoint(center, mapView.zoom);
    }
  }

  function centerOnPoint() {
    const targetPoint =
      importedPoints.find((point) => point.id === selectedPointId) ?? importedPoints[0] ?? null;
    if (!targetPoint) return;
    if (exportMeta.plotMode === "fixed-scale") {
      focusMapBounds(
        fixedScaleBoundsForCenter(
          [targetPoint.lng, targetPoint.lat],
          exportMeta.pageSize,
          exportMeta.plotScaleFeetPerInch,
        ),
      );
      return;
    }
    if (framingMode === "fit-to-content") {
      const parcelBounds = selectedParcel?.geometry ? geometryBounds(selectedParcel.geometry) : null;
      const pointClusterBounds = pointBounds(importedPoints.map((point) => ({ lng: point.lng, lat: point.lat })));
      const mergedBounds = mergeBounds(
        [parcelBounds, pointClusterBounds].filter(Boolean) as Array<[[number, number], [number, number]]>,
      );
      if (mergedBounds) {
        focusMapBounds(mergedBounds, importedPoints.length ? 20 : 19);
        return;
      }
    }
    focusMapPoint([targetPoint.lng, targetPoint.lat], mapView.zoom);
  }

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
      exportMeta.pageSize === "arch-d"
        ? "@page { size: 36in 24in; margin: 0.35in; }"
        : exportMeta.pageSize === "tabloid"
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
                pageSize:
                  event.target.value === "arch-d"
                    ? "arch-d"
                    : event.target.value === "tabloid"
                      ? "tabloid"
                      : "letter",
              })
            }
          >
            <option value="letter">Letter landscape</option>
            <option value="tabloid">Tabloid landscape</option>
            <option value="arch-d">ARCH D 24x36</option>
          </select>
        </label>
        <label className="field-label export-preview-field" htmlFor="export-plot-mode">
          Plot mode
          <select
            className="search-input"
            id="export-plot-mode"
            value={exportMeta.plotMode}
            onChange={(event) =>
              setExportMeta({
                plotMode: event.target.value === "fixed-scale" ? "fixed-scale" : "visual-fit",
              })
            }
          >
            <option value="visual-fit">Visual fit</option>
            <option value="fixed-scale">Fixed scale</option>
          </select>
        </label>
        <label className="field-label export-preview-field" htmlFor="export-plot-scale">
          Plot scale
          <select
            className="search-input"
            id="export-plot-scale"
            value={exportMeta.plotScaleFeetPerInch}
            onChange={(event) =>
              setExportMeta({
                plotScaleFeetPerInch: (Number(event.target.value) || 20) as 10 | 20 | 30 | 40 | 50 | 60 | 100,
              })
            }
          >
            <option value="10">1&quot; = 10&apos;</option>
            <option value="20">1&quot; = 20&apos;</option>
            <option value="30">1&quot; = 30&apos;</option>
            <option value="40">1&quot; = 40&apos;</option>
            <option value="50">1&quot; = 50&apos;</option>
            <option value="60">1&quot; = 60&apos;</option>
            <option value="100">1&quot; = 100&apos;</option>
          </select>
        </label>
        <label className="field-label export-preview-field" htmlFor="export-framing-mode">
          Framing
          <select
            className="search-input"
            id="export-framing-mode"
            value={framingMode}
            onChange={(event) =>
              setFramingMode(
                event.target.value === "fit-to-content" ? "fit-to-content" : "preserve-zoom",
              )
            }
          >
            <option value="preserve-zoom">Preserve current zoom</option>
            <option value="fit-to-content">Fit to content</option>
          </select>
        </label>
        <div className="card-actions">
          <button
            className="secondary-button"
            disabled={!selectedParcel}
            onClick={centerOnParcel}
            type="button"
          >
            Center on parcel
          </button>
          <button
            className="secondary-button"
            disabled={!importedPoints.length}
            onClick={centerOnPoint}
            type="button"
          >
            Center on point
          </button>
          <button className="primary-button" onClick={() => window.print()} type="button">
            Print / Save PDF
          </button>
          <button className="secondary-button" onClick={() => window.close()} type="button">
            Close preview
          </button>
        </div>
      </div>
      {exportMeta.plotMode === "fixed-scale" ? (
        <div className="inline-notice inline-notice-warning">
          Fixed-scale output is intended to be printed at 100% on {exportMeta.pageSize === "arch-d" ? "ARCH D 24x36" : exportMeta.pageSize}. Do not use browser fit-to-page scaling if you need the printed scale to remain accurate.
        </div>
      ) : null}
      <div className="map-panel export-only-map-panel">
        <QuickMapCanvas />
        <PrintPlanSheet variant="map" exportMode={exportMode} />
      </div>
      <PrintPlanSheet variant="details" exportMode={exportMode} />
    </div>
  );
}
