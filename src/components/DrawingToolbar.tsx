import type { DrawingMode } from "../types/drawing";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

const tools: Array<{ mode: DrawingMode; label: string }> = [
  { mode: "select", label: "Select" },
  { mode: "structure-polygon", label: "Structure" },
  { mode: "driveway-line", label: "Driveway" },
  { mode: "easement-line", label: "Easement" },
  { mode: "dimension-line", label: "Dimension" },
  { mode: "label-point", label: "Label" },
];

export function DrawingToolbar() {
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const {
    mode,
    activePoints,
    validationMessage,
    setMode,
    completeActiveFeature,
    undoActivePoint,
    clearActiveFeature,
    deleteSelected,
  } = useDrawingStore();

  const toolHelp =
    mode === "select"
      ? "Select a drawn feature to rename it, zoom to it, duplicate it, or reshape it with vertices."
      : mode === "structure-polygon"
        ? "Click to place corners for a custom footprint, or click-drag once to place a rectangle."
        : mode === "dimension-line"
          ? "Click-drag from start to end to place a dimension line."
          : mode === "label-point"
            ? "Click the map to place a label anchor, then rename it in the feature list."
            : "Click to place points. Press Enter to complete, Escape to cancel, or Delete to remove the selected feature.";

  return (
    <section className="panel-section">
      <h2>3. Draw plan</h2>
      {!selectedParcel ? (
        <EmptyState
          title="Choose the parcel first"
          body="Once the parcel is selected, you can draw the proposed structure, driveway, easement, dimensions, or labels."
        />
      ) : null}
      {selectedParcel ? <p className="muted">{toolHelp}</p> : null}
      {selectedParcel && mode !== "select" ? (
        <InlineNotice tone="info">Current tool: {tools.find((tool) => tool.mode === mode)?.label || "Draw"}</InlineNotice>
      ) : null}
      {selectedParcel && validationMessage ? <InlineNotice tone="warning">{validationMessage}</InlineNotice> : null}
      <div className="toolbar-grid">
        {tools.map((tool) => (
          <button
            className={mode === tool.mode ? "primary-button" : "secondary-button"}
            key={tool.mode}
            onClick={() => setMode(tool.mode)}
            disabled={!selectedParcel && tool.mode !== "select"}
            type="button"
          >
            {tool.label}
          </button>
        ))}
        <button className="primary-button" disabled={!selectedParcel} onClick={completeActiveFeature} type="button">
          Complete feature
        </button>
        <button className="secondary-button" disabled={!selectedParcel} onClick={undoActivePoint} type="button">
          Undo vertex
        </button>
        <button className="secondary-button" disabled={!selectedParcel} onClick={clearActiveFeature} type="button">
          Clear sketch
        </button>
        <button className="secondary-button" disabled={!selectedParcel} onClick={deleteSelected} type="button">
          Delete selected
        </button>
      </div>
      {selectedParcel ? (
        <p className="muted">
          Active sketch points: {activePoints.length}. Shortcuts: Enter completes, Escape cancels,
          Delete removes the selected feature or vertex.
        </p>
      ) : null}
    </section>
  );
}
