import type { ReactNode } from "react";
import type { BasemapKey } from "../map/basemapRegistry";
import { createExportSessionPayload, saveExportSession } from "../export/exportSession";

type AppShellProps = {
  left: ReactNode;
  map: ReactNode;
  right: ReactNode;
  subtitle: string;
  exportReady: boolean;
};

export function AppShell({ left, map, right, subtitle, exportReady }: AppShellProps) {
  const handleExport = (
    basemap: BasemapKey,
    exportMode: "default" | "streets-context" | "streets-detail" | "satellite",
  ) => {
    const payload = createExportSessionPayload({ basemap, exportMode });
    saveExportSession(payload);
    const exportUrl = new URL(window.location.href);
    exportUrl.searchParams.set("export", "1");
    exportUrl.searchParams.delete("autoprint");
    window.open(exportUrl.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>Optimacy QuickSite</strong>
          <span>{subtitle}</span>
        </div>
        <div className="topbar-actions">
          <span>Conceptual planning exhibit only</span>
          <button
            className="secondary-button"
            disabled={!exportReady}
            onClick={() => handleExport("streets", "streets-context")}
            type="button"
          >
            Preview streets context PDF
          </button>
          <button
            className="secondary-button"
            disabled={!exportReady}
            onClick={() => handleExport("streets", "streets-detail")}
            type="button"
          >
            Preview streets detail PDF
          </button>
          <button
            className="primary-button"
            disabled={!exportReady}
            onClick={() => handleExport("satellite", "satellite")}
            type="button"
          >
            Preview satellite PDF
          </button>
        </div>
      </header>
      <aside className="left-panel">{left}</aside>
      <main className="map-panel">{map}</main>
      <aside className="right-panel">{right}</aside>
    </div>
  );
}
