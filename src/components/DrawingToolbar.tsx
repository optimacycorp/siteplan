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
    setMode,
    completeActiveFeature,
    undoActivePoint,
    clearActiveFeature,
    deleteSelected,
  } = useDrawingStore();

  return (
    <section className="panel-section">
      <h2>3. Draw plan</h2>
      {!selectedParcel ? (
        <EmptyState
          title="Choose the parcel first"
          body="Once the parcel is selected, you can draw the proposed structure, driveway, easement, dimensions, or labels."
        />
      ) : null}
      {selectedParcel ? (
        <p className="muted">
          Click to place points. Drag structures or dimension lines in one motion. In Select mode,
          drag blue vertices to refine existing geometry.
        </p>
      ) : null}
      {selectedParcel && mode !== "select" ? (
        <InlineNotice tone="info">Current tool: {tools.find((tool) => tool.mode === mode)?.label || "Draw"}</InlineNotice>
      ) : null}
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
      {selectedParcel ? <p className="muted">Active sketch points: {activePoints.length}</p> : null}
    </section>
  );
}
