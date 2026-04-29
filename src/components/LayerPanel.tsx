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
      <h2>3. Layers</h2>
      <div className="toolbar-grid compact-grid">
        {basemaps.map((entry) => (
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
        {layers.map(([key, label]) => (
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
    </section>
  );
}
