import { pointBounds, summarizeDrawingFeature } from "../map/mapUtils";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { EmptyState } from "./EmptyState";

function describeSummary(label: string, value?: number) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return `${value.toFixed(label === "acres" ? 2 : 1)} ${label}`;
}

export function FeatureListPanel() {
  const drawings = useDrawingStore((state) => state.drawings);
  const selectedDrawingId = useDrawingStore((state) => state.selectedDrawingId);
  const selectDrawing = useDrawingStore((state) => state.selectDrawing);
  const deleteDrawingById = useDrawingStore((state) => state.deleteDrawingById);
  const duplicateDrawingById = useDrawingStore((state) => state.duplicateDrawingById);
  const renameDrawingById = useDrawingStore((state) => state.renameDrawingById);
  const focusMapBounds = useQuickSiteStore((state) => state.focusMapBounds);

  const handleRename = (id: string, currentLabel: string) => {
    const nextLabel = window.prompt("Rename feature", currentLabel);
    if (nextLabel === null) return;
    renameDrawingById(id, nextLabel);
  };

  return (
    <section className="panel-section">
      <h2>Plan features</h2>
      {!drawings.length ? (
        <EmptyState
          title="No plan features yet"
          body="After you confirm the parcel, add a structure, driveway, easement, dimension, or label."
        />
      ) : null}
      {drawings.map((feature) => {
        const summary = summarizeDrawingFeature(feature);
        const bounds = pointBounds(feature.points);
        const secondary =
          describeSummary("acres", summary.areaAcres) ||
          describeSummary("sq ft", summary.areaSqft) ||
          describeSummary("ft", summary.lengthFeet) ||
          `${summary.vertexCount} point(s)`;
        return (
          <div
            className={`result-card ${feature.id === selectedDrawingId ? "result-card-active" : ""}`}
            key={feature.id}
          >
            <button className="result-card-button" onClick={() => selectDrawing(feature.id)} type="button">
              <strong>{feature.label}</strong>
              <p className="muted">
                {feature.type} | {secondary}
              </p>
              {!summary.isValid && summary.warning ? <p className="muted">{summary.warning}</p> : null}
            </button>
            <div className="card-actions">
              <button className="secondary-button" onClick={() => handleRename(feature.id, feature.label)} type="button">
                Rename
              </button>
              <button
                className="secondary-button"
                disabled={!bounds}
                onClick={() => {
                  if (bounds) {
                    selectDrawing(feature.id);
                    focusMapBounds(bounds, 19);
                  }
                }}
                type="button"
              >
                Zoom
              </button>
              <button className="secondary-button" onClick={() => duplicateDrawingById(feature.id)} type="button">
                Duplicate
              </button>
              <button className="secondary-button" onClick={() => deleteDrawingById(feature.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
