import { useDrawingStore } from "../state/drawingStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

export function PropertiesPanel() {
  const drawings = useDrawingStore((state) => state.drawings);
  const selectedDrawingId = useDrawingStore((state) => state.selectedDrawingId);
  const selectedVertex = useDrawingStore((state) => state.selectedVertex);
  const selectDrawing = useDrawingStore((state) => state.selectDrawing);
  const renameSelected = useDrawingStore((state) => state.renameSelected);
  const deleteSelectedVertex = useDrawingStore((state) => state.deleteSelectedVertex);
  const selectedDrawing = drawings.find((feature) => feature.id === selectedDrawingId) ?? null;

  return (
    <section className="panel-section">
      <h2>Drawing features</h2>
      {!drawings.length ? (
        <EmptyState
          title="No plan items yet"
          body="After you confirm the parcel, add a structure, driveway, dimension, easement, or label."
        />
      ) : null}
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
            {selectedDrawing.type} | {selectedDrawing.points.length} point(s)
          </p>
          {selectedVertex?.drawingId === selectedDrawing.id ? (
            <>
              <InlineNotice tone="info">
                Vertex {selectedVertex.pointIndex + 1} selected. Drag it on the map to reshape the
                feature, or remove it below.
              </InlineNotice>
              <div className="card-actions">
                <button className="secondary-button" onClick={deleteSelectedVertex} type="button">
                  Delete selected vertex
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Select a vertex or midpoint on the map to edit the shape.</p>
          )}
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
            {feature.type} | {feature.points.length} point(s)
          </p>
        </button>
      ))}
    </section>
  );
}
