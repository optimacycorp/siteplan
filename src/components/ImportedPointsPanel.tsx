import { pointBounds } from "../map/mapUtils";
import { usePointImportStore } from "../state/pointImportStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { EmptyState } from "./EmptyState";

export function ImportedPointsPanel() {
  const importedPoints = usePointImportStore((state) => state.importedPoints);
  const selectedPointId = usePointImportStore((state) => state.selectedPointId);
  const selectPoint = usePointImportStore((state) => state.selectPoint);
  const deletePoint = usePointImportStore((state) => state.deletePoint);
  const clearPoints = usePointImportStore((state) => state.clearPoints);
  const focusMapBounds = useQuickSiteStore((state) => state.focusMapBounds);

  return (
    <section className="panel-section">
      <h2>Imported points</h2>
      {!importedPoints.length ? (
        <EmptyState
          title="No imported points yet"
          body="Import a local CSV to place planning points on the map and include them in the exhibit."
        />
      ) : null}
      {importedPoints.map((point) => (
        <div
          className={`result-card ${point.id === selectedPointId ? "result-card-active" : ""}`}
          key={point.id}
        >
          <button className="result-card-button" onClick={() => selectPoint(point.id)} type="button">
            <strong>{[point.pointNumber, point.name].filter(Boolean).join(" ")}</strong>
            <p className="muted">
              {point.code || "Point"}
              {point.elevation !== undefined ? ` | Elev ${point.elevation}` : ""}
            </p>
          </button>
          <div className="card-actions">
            <button
              className="secondary-button"
              onClick={() =>
                focusMapBounds(
                  [
                    [point.lng - 0.00005, point.lat - 0.00005],
                    [point.lng + 0.00005, point.lat + 0.00005],
                  ],
                  20,
                )
              }
              type="button"
            >
              Zoom
            </button>
            <button className="secondary-button" onClick={() => deletePoint(point.id)} type="button">
              Delete
            </button>
          </div>
        </div>
      ))}
      {importedPoints.length ? (
        <div className="card-actions">
          <button
            className="secondary-button"
            onClick={() => {
              const bounds = pointBounds(importedPoints.map((point) => ({ lng: point.lng, lat: point.lat })));
              if (bounds) {
                focusMapBounds(bounds, 19);
              }
            }}
            type="button"
          >
            Zoom all
          </button>
          <button className="secondary-button" onClick={clearPoints} type="button">
            Clear all
          </button>
        </div>
      ) : null}
    </section>
  );
}
