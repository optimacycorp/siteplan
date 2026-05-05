import { useQuickSiteStore } from "../state/quickSiteStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

export function TerrainSummary() {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  const contoursVisible = useQuickSiteStore((state) => Boolean(state.layerVisibility.contours));
  const terrainSettings = useQuickSiteStore((state) => state.terrainSettings);

  if (!parcel) {
    return null;
  }

  if (!contoursVisible) {
    return (
      <section className="panel-section">
        <h2>Terrain</h2>
        <EmptyState
          title="Contours are off"
          body="Turn on contours in Advanced map layers to add public USGS terrain context to the site plan."
        />
      </section>
    );
  }

  return (
    <section className="panel-section">
      <h2>Terrain</h2>
      <p className="muted">Approximate elevation context from public USGS data. Not survey-grade topo.</p>
      <dl className="summary-grid">
        <dt>Source</dt>
        <dd>USGS 3DEP / The National Map</dd>
        <dt>Contour units</dt>
        <dd>{terrainSettings.contourUnits}</dd>
        <dt>Status</dt>
        <dd>{terrainSettings.sourceStatus}</dd>
        <dt>Relief</dt>
        <dd>pending</dd>
      </dl>
      <InlineNotice
        tone={
          terrainSettings.sourceStatus === "ready"
            ? "success"
            : terrainSettings.sourceStatus === "error"
              ? "warning"
              : "info"
        }
      >
        {terrainSettings.sourceMessage || "Terrain summary unavailable."}
      </InlineNotice>
    </section>
  );
}
