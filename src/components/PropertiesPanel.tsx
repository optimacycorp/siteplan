import { useDrawingStore } from "../state/drawingStore";

export function PropertiesPanel() {
  const drawings = useDrawingStore((state) => state.drawings);
  const selectedDrawingId = useDrawingStore((state) => state.selectedDrawingId);
  const selectDrawing = useDrawingStore((state) => state.selectDrawing);
  const renameSelected = useDrawingStore((state) => state.renameSelected);
  const selectedDrawing = drawings.find((feature) => feature.id === selectedDrawingId) ?? null;

  return (
    <section className="panel-section">
      <h2>Drawing features</h2>
      {!drawings.length ? <p className="muted">No drawing features yet.</p> : null}
      {selectedDrawing ? (
        <div className="property-card">
          <label className="field-label" htmlFor="drawing-name">
            Selected feature name
          </label>
          <input
            className="search-input"
            id="drawing-name"
            onChange={(event) => renameSelected(event.target.value)}
            value={selectedDrawing.label}
          />
          <p className="muted">
            {selectedDrawing.type} • {selectedDrawing.points.length} point(s)
          </p>
        </div>
      ) : null}
      {drawings.map((feature) => (
        <button
          className={`result-card ${feature.id === selectedDrawingId ? "result-card-active" : ""}`}
          key={feature.id}
          onClick={() => selectDrawing(feature.id)}
          type="button"
        >
          <strong>{feature.label}</strong>
          <p className="muted">
            {feature.type} • {feature.points.length} point(s)
          </p>
        </button>
      ))}
    </section>
  );
}
