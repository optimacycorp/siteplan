import { basemaps } from "../map/basemapRegistry";
import { useQuickSiteStore } from "../state/quickSiteStore";

const layers = [
  ["parcel", "Parcel boundary"],
  ["neighbors", "Adjoining parcels"],
  ["drawings", "Drawings"],
  ["labels", "Labels"],
  ["contours", "Contours"],
  ["buildings", "Buildings"],
] as const;

export function LayerPanel() {
  const { basemap, layerVisibility, setBasemap, toggleLayer } = useQuickSiteStore();

  return (
    <section className="panel-section">
      <h2>Map options</h2>
      <p className="muted">Choose the base map and decide what stays visible while you draw.</p>
      <div className="toolbar-grid compact-grid two-column-grid">
        {basemaps.filter((entry) => entry.key === "satellite" || entry.key === "streets").map((entry) => (
          <button
            className={basemap === entry.key ? "primary-button" : "secondary-button"}
            key={entry.key}
            onClick={() => setBasemap(entry.key)}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="layer-list">
        {layers.filter(([key]) => key === "parcel" || key === "drawings" || key === "labels").map(([key, label]) => (
          <label className="layer-toggle" key={key}>
            <input
              type="checkbox"
              checked={Boolean(layerVisibility[key])}
              onChange={() => toggleLayer(key)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <details className="result-details">
        <summary>Advanced map layers</summary>
        <div className="layer-list advanced-layer-list">
          {layers.filter(([key]) => key === "neighbors" || key === "contours" || key === "buildings").map(([key, label]) => (
            <label className="layer-toggle" key={key}>
              <input
                type="checkbox"
                checked={Boolean(layerVisibility[key])}
                onChange={() => toggleLayer(key)}
              />
              <span>{label}</span>
            </label>
          ))}
          <div className="toolbar-grid compact-grid two-column-grid">
            {basemaps.filter((entry) => entry.key === "light" || entry.key === "topo").map((entry) => (
              <button
                className={basemap === entry.key ? "primary-button" : "secondary-button"}
                key={entry.key}
                onClick={() => setBasemap(entry.key)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
