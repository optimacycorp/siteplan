import { useEffect, useState } from "react";
import { readExportSession } from "../export/exportSession";
import { QuickMapCanvas } from "../map/QuickMapCanvas";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { PrintPlanSheet } from "./PrintPlanSheet";

export function ExportOnlyApp() {
  const [ready, setReady] = useState(false);
  const hydrateQuickSite = useQuickSiteStore((state) => state.hydrateExportSession);
  const hydrateDrawings = useDrawingStore((state) => state.hydrateExportSession);

  useEffect(() => {
    const payload = readExportSession();
    if (!payload) {
      setReady(true);
      return;
    }

    hydrateQuickSite({
      basemap: payload.basemap as never,
      selectedParcel: payload.selectedParcel,
      neighbors: payload.neighbors,
      mapView: payload.mapView,
      exportMeta: payload.exportMeta,
      layerVisibility: payload.layerVisibility,
    });
    hydrateDrawings({
      drawings: payload.drawings,
    });
    setReady(true);
  }, [hydrateDrawings, hydrateQuickSite]);

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

  if (!ready) {
    return (
      <div className="export-only-shell">
        <div className="export-loading">Preparing export map...</div>
      </div>
    );
  }

  return (
    <div className="export-only-shell">
      <div className="map-panel export-only-map-panel">
        <QuickMapCanvas />
        <PrintPlanSheet />
      </div>
    </div>
  );
}
