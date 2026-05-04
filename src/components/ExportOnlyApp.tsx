import { useEffect } from "react";
import { readExportSession } from "../export/exportSession";
import { QuickMapCanvas } from "../map/QuickMapCanvas";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { PrintPlanSheet } from "./PrintPlanSheet";

export function ExportOnlyApp() {
  const hydrateQuickSite = useQuickSiteStore((state) => state.hydrateExportSession);
  const hydrateDrawings = useDrawingStore((state) => state.hydrateExportSession);

  useEffect(() => {
    const payload = readExportSession();
    if (!payload) return;

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

    if (new URLSearchParams(window.location.search).get("autoprint") === "1") {
      window.setTimeout(() => window.print(), 750);
    }
  }, [hydrateDrawings, hydrateQuickSite]);

  return (
    <div className="export-only-shell">
      <div className="map-panel export-only-map-panel">
        <QuickMapCanvas />
        <PrintPlanSheet />
      </div>
    </div>
  );
}
