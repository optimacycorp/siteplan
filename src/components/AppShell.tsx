import type { ReactNode } from "react";

type AppShellProps = {
  left: ReactNode;
  map: ReactNode;
  right: ReactNode;
};

export function AppShell({ left, map, right }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>Optimacy QuickSite</strong>
          <span>Address-to-site-plan MVP</span>
        </div>
        <div className="topbar-actions">
          <span>Conceptual planning exhibit only</span>
          <button className="primary-button" onClick={() => window.print()} type="button">
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
