import type { ReactNode } from "react";
import { createExportSessionPayload, saveExportSession } from "../export/exportSession";

type AppShellProps = {
  left: ReactNode;
  map: ReactNode;
  right: ReactNode;
  subtitle: string;
  exportReady: boolean;
};

export function AppShell({ left, map, right, subtitle, exportReady }: AppShellProps) {
  const handleExport = () => {
    const payload = createExportSessionPayload();
    saveExportSession(payload);
    const exportUrl = new URL(window.location.href);
    exportUrl.searchParams.set("export", "1");
    exportUrl.searchParams.set("autoprint", "1");
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
          <button className="primary-button" disabled={!exportReady} onClick={handleExport} type="button">
            Export PDF
          </button>
        </div>
      </header>
      <aside className="left-panel">{left}</aside>
      <main className="map-panel">{map}</main>
      <aside className="right-panel">{right}</aside>
    </div>
  );
}
