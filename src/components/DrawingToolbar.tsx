import type { DrawingFeatureType, DrawingMode } from "../types/drawing";
import { summarizeDrawingFeature } from "../map/mapUtils";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

const wizardFeatures: Array<{
  type: DrawingFeatureType;
  label: string;
  description: string;
}> = [
  {
    type: "structure-polygon",
    label: "Structure",
    description: "Drop a building footprint, then review and save it.",
  },
  {
    type: "driveway-line",
    label: "Driveway",
    description: "Sketch the driveway path and confirm the alignment.",
  },
  {
    type: "dimension-line",
    label: "Dimension",
    description: "Place a dimension line and verify the measured span.",
  },
];

const advancedTools: Array<{ mode: DrawingMode; label: string }> = [
  { mode: "select", label: "Select / edit" },
  { mode: "easement-line", label: "Easement" },
  { mode: "label-point", label: "Label" },
];

function featureLabel(type: DrawingFeatureType | null) {
  return wizardFeatures.find((feature) => feature.type === type)?.label || "Feature";
}

function featureInstructions(type: DrawingFeatureType | null) {
  switch (type) {
    case "structure-polygon":
      return "Click-drag once for a rectangle, or click corners for a custom footprint. Use Enter when the footprint is ready.";
    case "driveway-line":
      return "Click along the driveway path to place points. Double-click or press Enter when the line is complete.";
    case "dimension-line":
      return "Click-drag from the first point to the second point to place the measurement in one motion.";
    default:
      return "Choose the type of plan feature you want to add next.";
  }
}

export function DrawingToolbar() {
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const {
    mode,
    activePoints,
    drawings,
    selectedDrawingId,
    validationMessage,
    wizard,
    setMode,
    undoActivePoint,
    clearActiveFeature,
    deleteSelected,
    startWizard,
    returnWizardToChoose,
    reviewWizardFeature,
    finishWizard,
    resumeWizardEditing,
  } = useDrawingStore();

  const selectedDrawing = drawings.find((drawing) => drawing.id === selectedDrawingId) ?? null;
  const selectedSummary = selectedDrawing ? summarizeDrawingFeature(selectedDrawing) : null;
  const activeFeatureName = featureLabel(wizard.featureType);
  const showWizard = selectedParcel;

  return (
    <section className="panel-section">
      <h2>3. Draw plan</h2>
      {!selectedParcel ? (
        <EmptyState
          title="Choose the parcel first"
          body="Once the parcel is selected, the drawing wizard will guide you through placing a structure, driveway, or dimension."
        />
      ) : null}

      {showWizard && !wizard.active ? (
        <>
          <p className="muted">
            Use the drawing wizard to add one feature at a time. You can still use the advanced tools below when needed.
          </p>
          <div className="panel-actions">
            <button className="primary-button" onClick={returnWizardToChoose} type="button">
              Start drawing wizard
            </button>
          </div>
        </>
      ) : null}

      {showWizard && wizard.active && wizard.step === "choose" ? (
        <>
          <p className="muted">Choose what you want to place on the parcel next.</p>
          <div className="result-list">
            {wizardFeatures.map((feature) => (
              <button
                className="result-card-button result-card"
                key={feature.type}
                onClick={() => startWizard(feature.type)}
                type="button"
              >
                <strong>{feature.label}</strong>
                <p className="muted">{feature.description}</p>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {showWizard && wizard.active && wizard.step === "draw" ? (
        <>
          <InlineNotice tone="info">Step 1 of 3: Draw {activeFeatureName}</InlineNotice>
          <p className="muted">{featureInstructions(wizard.featureType)}</p>
          {validationMessage ? <InlineNotice tone="warning">{validationMessage}</InlineNotice> : null}
          <div className="toolbar-grid">
            <button className="primary-button" onClick={reviewWizardFeature} type="button">
              Review {activeFeatureName}
            </button>
            <button className="secondary-button" onClick={undoActivePoint} type="button">
              Undo point
            </button>
            <button className="secondary-button" onClick={clearActiveFeature} type="button">
              Clear sketch
            </button>
            <button className="secondary-button" onClick={returnWizardToChoose} type="button">
              Back
            </button>
          </div>
          <p className="muted">
            Active sketch points: {activePoints.length}. Shortcuts: Enter completes, Escape clears, Delete removes the selected feature or vertex.
          </p>
        </>
      ) : null}

      {showWizard && wizard.active && wizard.step === "review" ? (
        <>
          <InlineNotice tone="success">Step 2 of 3: Review {activeFeatureName}</InlineNotice>
          <p className="muted">
            The feature is now placed on the map. Drag vertices in Select mode if you want to refine it, then save it to the plan.
          </p>
          {selectedDrawing ? (
            <div className="result-card">
              <strong>{selectedDrawing.label}</strong>
              <p className="muted">
                {selectedSummary?.areaAcres
                  ? `${selectedSummary.areaAcres.toFixed(2)} acres`
                  : selectedSummary?.areaSqft
                    ? `${selectedSummary.areaSqft.toFixed(0)} sq ft`
                    : selectedSummary?.lengthFeet
                      ? `${selectedSummary.lengthFeet.toFixed(1)} ft`
                      : `${selectedSummary?.vertexCount ?? 0} point(s)`}
              </p>
            </div>
          ) : null}
          <div className="toolbar-grid">
            <button className="primary-button" onClick={finishWizard} type="button">
              Save {activeFeatureName}
            </button>
            <button className="secondary-button" onClick={resumeWizardEditing} type="button">
              Keep editing
            </button>
            <button className="secondary-button" onClick={deleteSelected} type="button">
              Delete feature
            </button>
          </div>
        </>
      ) : null}

      {showWizard && wizard.active && wizard.step === "saved" ? (
        <>
          <InlineNotice tone="success">Step 3 of 3: {activeFeatureName} saved</InlineNotice>
          <p className="muted">
            Your feature has been added to the plan. Add another guided feature or switch to the advanced tools for easements and labels.
          </p>
          <div className="toolbar-grid">
            <button className="primary-button" onClick={returnWizardToChoose} type="button">
              Add another feature
            </button>
            <button className="secondary-button" onClick={() => setMode("select")} type="button">
              Stay in select mode
            </button>
          </div>
        </>
      ) : null}

      {showWizard ? (
        <>
          <h3>Advanced tools</h3>
          <p className="muted">
            Use these when you need extra flexibility beyond the guided structure, driveway, and dimension flow.
          </p>
          <div className="toolbar-grid">
            {advancedTools.map((tool) => (
              <button
                className={mode === tool.mode ? "primary-button" : "secondary-button"}
                key={tool.mode}
                onClick={() => setMode(tool.mode)}
                type="button"
              >
                {tool.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
