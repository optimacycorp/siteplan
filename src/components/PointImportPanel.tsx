import { useState } from "react";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { usePointImportStore } from "../state/pointImportStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

export function PointImportPanel() {
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const mapView = useQuickSiteStore((state) => state.mapView);
  const {
    transform,
    previewRows,
    previewPoints,
    importedPoints,
    importError,
    parseCsvText,
    setTransform,
    setOriginFromLngLat,
    previewTransformedPoints,
    commitPreviewPoints,
  } = usePointImportStore();
  const [csvText, setCsvText] = useState("");

  async function loadFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    parseCsvText(text);
  }

  return (
    <section className="panel-section">
      <h2>4. Import field points (optional)</h2>
      {!selectedParcel ? (
        <EmptyState
          title="Choose the parcel first"
          body="Once the parcel is selected, you can import local field points and place them on the exhibit."
        />
      ) : (
        <>
          <p className="muted">
            Import local planning points using one map origin, units, rotation, and scale factor. This workflow is for exhibits and planning, not survey-grade control.
          </p>
          <InlineNotice tone="warning">
            Imported points are display aids tied to a chosen map origin. Verify against field control before using them for survey, staking, or construction.
          </InlineNotice>
          <div className="toolbar-grid compact-grid two-column-grid">
            <button
              className="secondary-button"
              disabled={!selectedParcel?.centroid}
              onClick={() => {
                if (selectedParcel?.centroid) {
                  setOriginFromLngLat(
                    selectedParcel.centroid[0],
                    selectedParcel.centroid[1],
                    selectedParcel.address || selectedParcel.headline || "Parcel centroid",
                  );
                }
              }}
              type="button"
            >
              Use parcel centroid
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                setOriginFromLngLat(mapView.center[0], mapView.center[1], "Map center")
              }
              type="button"
            >
              Use map center
            </button>
          </div>

          <div className="toolbar-grid compact-grid two-column-grid">
            <label className="field-label" htmlFor="point-units">
              Units
              <select
                className="search-input"
                id="point-units"
                value={transform.units}
                onChange={(event) =>
                  setTransform({
                    units: event.target.value === "meters" ? "meters" : "feet",
                  })
                }
              >
                <option value="feet">Local XY (feet)</option>
                <option value="meters">Local XY (meters)</option>
              </select>
            </label>
            <label className="field-label" htmlFor="point-rotation">
              Rotation (deg clockwise)
              <input
                className="search-input"
                id="point-rotation"
                type="number"
                value={transform.rotationDegrees}
                onChange={(event) =>
                  setTransform({ rotationDegrees: Number(event.target.value) || 0 })
                }
              />
            </label>
          </div>

          <div className="toolbar-grid compact-grid two-column-grid">
            <label className="field-label" htmlFor="point-scale">
              Scale factor
              <input
                className="search-input"
                id="point-scale"
                type="number"
                step="0.000001"
                value={transform.scaleFactor}
                onChange={(event) =>
                  setTransform({ scaleFactor: Number(event.target.value) || 1 })
                }
              />
            </label>
            <label className="field-label" htmlFor="point-origin-label">
              Origin label
              <input
                className="search-input"
                id="point-origin-label"
                value={transform.origin?.label || ""}
                onChange={(event) =>
                  setTransform({
                    origin: transform.origin
                      ? { ...transform.origin, label: event.target.value }
                      : null,
                  })
                }
                placeholder="Origin label"
              />
            </label>
          </div>

          <div className="toolbar-grid compact-grid two-column-grid">
            <label className="field-label" htmlFor="point-origin-lng">
              Origin longitude
              <input
                className="search-input"
                id="point-origin-lng"
                type="number"
                step="0.000001"
                value={transform.origin?.lng ?? ""}
                onChange={(event) => {
                  const lng = Number(event.target.value);
                  setTransform({
                    origin:
                      transform.origin && Number.isFinite(lng)
                        ? { ...transform.origin, lng }
                        : transform.origin,
                  });
                }}
              />
            </label>
            <label className="field-label" htmlFor="point-origin-lat">
              Origin latitude
              <input
                className="search-input"
                id="point-origin-lat"
                type="number"
                step="0.000001"
                value={transform.origin?.lat ?? ""}
                onChange={(event) => {
                  const lat = Number(event.target.value);
                  setTransform({
                    origin:
                      transform.origin && Number.isFinite(lat)
                        ? { ...transform.origin, lat }
                        : transform.origin,
                  });
                }}
              />
            </label>
          </div>

          <label className="field-label" htmlFor="point-csv-file">
            CSV file
            <input
              id="point-csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void loadFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <label className="field-label" htmlFor="point-csv-text">
            CSV text
            <textarea
              className="search-input textarea-input"
              id="point-csv-text"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder="Paste point,name,northing,easting,elevation,code,note CSV here"
            />
          </label>

          {importError ? <InlineNotice tone="warning">{importError}</InlineNotice> : null}
          <div className="toolbar-grid compact-grid two-column-grid">
            <button className="secondary-button" onClick={() => parseCsvText(csvText)} type="button">
              Parse CSV
            </button>
            <button className="secondary-button" onClick={previewTransformedPoints} type="button">
              Preview points
            </button>
            <button
              className="primary-button"
              disabled={!previewPoints.length}
              onClick={commitPreviewPoints}
              type="button"
            >
              Save imported points
            </button>
          </div>
          <p className="muted">
            Parsed rows: {previewRows.length} | Preview points: {previewPoints.length} | Saved points: {importedPoints.length}
          </p>
        </>
      )}
    </section>
  );
}
