import type { DrawingMode } from "../types/drawing";
import { useDrawingStore } from "../state/drawingStore";

const tools: Array<{ mode: DrawingMode; label: string }> = [
  { mode: "select", label: "Select" },
  { mode: "structure-polygon", label: "Structure" },
  { mode: "driveway-line", label: "Driveway" },
  { mode: "easement-line", label: "Easement" },
  { mode: "dimension-line", label: "Dimension" },
  { mode: "label-point", label: "Label" },
];

export function DrawingToolbar() {
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
      <h2>2. Draw exhibit</h2>
      <p className="muted">Click to place vertices. Double-click or use Complete to finish the current feature.</p>
      <div className="toolbar-grid">
        {tools.map((tool) => (
          <button
            className={mode === tool.mode ? "primary-button" : "secondary-button"}
            key={tool.mode}
            onClick={() => setMode(tool.mode)}
            type="button"
          >
            {tool.label}
          </button>
        ))}
        <button className="secondary-button" onClick={completeActiveFeature} type="button">
          Complete feature
        </button>
        <button className="secondary-button" onClick={undoActivePoint} type="button">
          Undo vertex
        </button>
        <button className="secondary-button" onClick={clearActiveFeature} type="button">
          Clear sketch
        </button>
        <button className="secondary-button" onClick={deleteSelected} type="button">
          Delete selected
        </button>
      </div>
      <p className="muted">Active sketch points: {activePoints.length}</p>
    </section>
  );
}
