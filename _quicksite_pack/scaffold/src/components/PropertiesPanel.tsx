import { useDrawingStore } from "../state/drawingStore";

export function PropertiesPanel() {
  const drawings = useDrawingStore((state) => state.drawings);
  return (
    <section className="panel-section">
      <h2>Drawing features</h2>
      {!drawings.length ? <p className="muted">No drawing features yet.</p> : drawings.map((feature) => (
        <div className="result-card" key={feature.id}>
          <strong>{feature.label}</strong>
          <p className="muted">{feature.points.length} point(s)</p>
        </div>
      ))}
    </section>
  );
}
