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
  const { layerVisibility, toggleLayer } = useQuickSiteStore();
  return (
    <section className="panel-section">
      <h2>3. Layers</h2>
      <div className="layer-list">
        {layers.map(([key, label]) => (
          <label key={key}><input type="checkbox" checked={Boolean(layerVisibility[key])} onChange={() => toggleLayer(key)} /> {label}</label>
        ))}
      </div>
    </section>
  );
}
