type AppShellProps = {
  left: React.ReactNode;
  map: React.ReactNode;
  right: React.ReactNode;
};

export function AppShell({ left, map, right }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>Optimacy QuickSite</strong>
          <span>Address-to-site-plan MVP</span>
        </div>
        <button className="primary-button">Export PDF</button>
      </header>
      <aside className="left-panel">{left}</aside>
      <main className="map-panel">{map}</main>
      <aside className="right-panel">{right}</aside>
    </div>
  );
}
