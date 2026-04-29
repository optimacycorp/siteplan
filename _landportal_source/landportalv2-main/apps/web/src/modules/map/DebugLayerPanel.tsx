import { useDebugLayerStore, type DebugLayerKey } from "./debugLayerStore";
import styles from "./DebugLayerPanel.module.css";

const layerLabels: Record<DebugLayerKey, string> = {
  rawBoundary: "Raw boundary",
  normalizedBoundary: "Normalized boundary",
  constraints: "Constraints",
  buildableEnvelope: "Buildable envelope",
  frontageEdges: "Frontage edges",
  selectedFrontage: "Selected frontage",
  strategyLabel: "Strategy label",
  subdivisionLots: "Subdivision lots",
  roadCorridor: "Road corridor",
  parcelMetrics: "Metrics and warnings",
};

export function DebugLayerPanel() {
  const enabled = useDebugLayerStore((state) => state.enabled);
  const layers = useDebugLayerStore((state) => state.layers);
  const toggleEnabled = useDebugLayerStore((state) => state.toggleEnabled);
  const toggleLayer = useDebugLayerStore((state) => state.toggleLayer);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <strong>Debug layers</strong>
          <div className={styles.helper}>Internal geometry overlays for parcel, subdivision, and planning workflows.</div>
        </div>
        <button className={styles.toggle} onClick={toggleEnabled} type="button">
          {enabled ? "Hide debug" : "Show debug"}
        </button>
      </div>
      {enabled ? (
        <div className={styles.layerList}>
          {(Object.keys(layerLabels) as DebugLayerKey[]).map((key) => (
            <label className={styles.layerItem} key={key}>
              <input checked={layers[key]} onChange={() => toggleLayer(key)} type="checkbox" />
              <span>{layerLabels[key]}</span>
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}
