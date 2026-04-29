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
  const { mode, setMode, completeActiveFeature, deleteSelected } = useDrawingStore();
  return (
    <section className="panel-section">
      <h2>2. Draw exhibit</h2>
      <div className="toolbar-grid">
        {tools.map((tool) => <button className={mode === tool.mode ? "primary-button" : "secondary-button"} key={tool.mode} onClick={() => setMode(tool.mode)}>{tool.label}</button>)}
        <button className="secondary-button" onClick={completeActiveFeature}>Complete feature</button>
        <button className="secondary-button" onClick={deleteSelected}>Delete selected</button>
      </div>
    </section>
  );
}
