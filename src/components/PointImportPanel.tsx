import { useMemo, useState } from "react";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { usePointImportStore } from "../state/pointImportStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

type WizardStep = "load" | "origin" | "preview" | "saved";

const pointSteps: Array<{ key: WizardStep; label: string; helper: string }> = [
  { key: "load", label: "Load CSV", helper: "Upload or paste your local point CSV." },
  { key: "origin", label: "Set origin", helper: "Choose the map anchor, units, and rotation." },
  { key: "preview", label: "Preview", helper: "Check the transformed points before saving them." },
  { key: "saved", label: "Saved", helper: "Imported points are now part of the exhibit." },
];

export function PointImportPanel() {
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const mapView = useQuickSiteStore((state) => state.mapView);
  const {
    transform,
    previewRows,
    previewPoints,
    importedPoints,
    importError,
    wizardStep,
    setWizardStep,
    parseCsvText,
    setTransform,
    setOriginFromLngLat,
    previewTransformedPoints,
    commitPreviewPoints,
  } = usePointImportStore();
  const [csvText, setCsvText] = useState("");

  const loadStepNotice = useMemo(() => {
    if (importError) {
      return importError;
    }
    if (!csvText.trim()) {
      return "Load a CSV file or paste CSV text to begin the import.";
    }
    if (!previewRows.length) {
      return "No usable point rows have been parsed yet. Check the header names and required northing/easting values.";
    }
    return "";
  }, [csvText, importError, previewRows.length]);

  const originStepChecks = useMemo(
    () => [
      {
        label: "CSV rows parsed",
        ok: previewRows.length > 0,
      },
      {
        label: "Map origin selected",
        ok: Boolean(transform.origin),
      },
      {
        label: "Scale factor is positive",
        ok: Number.isFinite(transform.scaleFactor) && transform.scaleFactor > 0,
      },
    ],
    [previewRows.length, transform.origin, transform.scaleFactor],
  );

  const previewStepNotice = useMemo(() => {
    if (importError) {
      return importError;
    }
    if (!previewPoints.length) {
      return "Preview the transformed points before saving them into the exhibit.";
    }
    return "";
  }, [importError, previewPoints.length]);

  const canAdvanceFromLoad = previewRows.length > 0;
  const canPreviewPoints = originStepChecks.every((check) => check.ok);
  const canSavePreview = previewPoints.length > 0;

  async function loadFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    parseCsvText(text);
  }

  const currentStepIndex = pointSteps.findIndex((step) => step.key === wizardStep);
  const currentStep = pointSteps[currentStepIndex] ?? pointSteps[0];

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
          <p className="muted">{currentStep.helper}</p>
          <InlineNotice tone="warning">
            Imported points are display aids tied to a chosen map origin. Verify against field control before using them for survey, staking, or construction.
          </InlineNotice>

          <div className="workflow-steps">
            {pointSteps.map((step, index) => {
              const status =
                index < currentStepIndex
                  ? "done"
                  : index === currentStepIndex
                    ? "current"
                    : "locked";
              return (
                <div className={`workflow-step workflow-step-${status}`} key={step.key}>
                  <span className="workflow-step-index">{index + 1}</span>
                  <div>
                    <strong>{step.label}</strong>
                    <p className="muted">{step.helper}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {wizardStep === "load" ? (
            <>
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

              <InlineNotice tone={canAdvanceFromLoad ? "success" : "warning"}>
                {loadStepNotice || `Parsed rows ready: ${previewRows.length}`}
              </InlineNotice>
              <div className="toolbar-grid compact-grid two-column-grid">
                <button className="primary-button" onClick={() => parseCsvText(csvText)} type="button">
                  Load CSV
                </button>
                <button
                  className="secondary-button"
                  disabled={!canAdvanceFromLoad}
                  onClick={() => setWizardStep("origin")}
                  type="button"
                >
                  Next: Set origin
                </button>
              </div>
              <p className="muted">Parsed rows ready: {previewRows.length}</p>
            </>
          ) : null}

          {wizardStep === "origin" ? (
            <>
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

              <InlineNotice tone={canPreviewPoints ? "success" : "warning"}>
                {canPreviewPoints
                  ? "Origin setup looks good. Preview the transformed points when you're ready."
                  : "Finish the required setup items below before previewing points."}
              </InlineNotice>
              <div className="result-list">
                {originStepChecks.map((check) => (
                  <div className="result-card" key={check.label}>
                    <strong>{check.label}</strong>
                    <p className="muted">{check.ok ? "Ready" : "Still needed"}</p>
                  </div>
                ))}
              </div>
              <div className="toolbar-grid compact-grid two-column-grid">
                <button className="secondary-button" onClick={() => setWizardStep("load")} type="button">
                  Back
                </button>
                <button
                  className="primary-button"
                  disabled={!canPreviewPoints}
                  onClick={previewTransformedPoints}
                  type="button"
                >
                  Preview points
                </button>
              </div>
              <p className="muted">Rows ready to transform: {previewRows.length}</p>
            </>
          ) : null}

          {wizardStep === "preview" ? (
            <>
              <p className="muted">
                Preview looks good? Save these transformed points into the exhibit and they will persist after refresh.
              </p>
              <InlineNotice tone={canSavePreview ? "success" : "warning"}>
                {previewStepNotice || `Preview points ready: ${previewPoints.length}`}
              </InlineNotice>
              <div className="result-list">
                {previewPoints.slice(0, 5).map((point) => (
                  <div className="result-card" key={point.id}>
                    <strong>{[point.pointNumber, point.name].filter(Boolean).join(" ")}</strong>
                    <p className="muted">
                      {point.code || "Point"}
                      {point.elevation !== undefined ? ` | Elev ${point.elevation}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <div className="toolbar-grid compact-grid two-column-grid">
                <button className="secondary-button" onClick={() => setWizardStep("origin")} type="button">
                  Back
                </button>
                <button
                  className="primary-button"
                  disabled={!canSavePreview}
                  onClick={commitPreviewPoints}
                  type="button"
                >
                  Save imported points
                </button>
              </div>
              <p className="muted">Preview points ready: {previewPoints.length}</p>
            </>
          ) : null}

          {wizardStep === "saved" ? (
            <>
              <InlineNotice tone="success">
                Imported points saved. They are now part of the plan and will appear in the map and export preview.
              </InlineNotice>
              <div className="toolbar-grid compact-grid two-column-grid">
                <button className="primary-button" onClick={() => setWizardStep("load")} type="button">
                  Import another CSV
                </button>
                <button className="secondary-button" onClick={() => setWizardStep("preview")} type="button">
                  Review saved import
                </button>
              </div>
              <p className="muted">Saved points in this plan: {importedPoints.length}</p>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
