import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";

type StepStatus = "done" | "current" | "locked";

function getStepStatus(index: number, selectedParcel: boolean, drawingCount: number): StepStatus {
  if (index === 0) return selectedParcel ? "done" : "current";
  if (index === 1) return selectedParcel ? (drawingCount > 0 ? "done" : "current") : "locked";
  if (index === 2) return !selectedParcel ? "locked" : drawingCount > 0 ? "done" : "current";
  return selectedParcel && drawingCount > 0 ? "current" : "locked";
}

const labels = ["Find property", "Confirm parcel", "Draw plan", "Export PDF"];

export function WorkflowSteps() {
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const drawingCount = useDrawingStore((state) => state.drawings.length);

  return (
    <section className="panel-section">
      <h2>Workflow</h2>
      <div className="workflow-steps">
        {labels.map((label, index) => {
          const status = getStepStatus(index, Boolean(selectedParcel), drawingCount);
          return (
            <div className={`workflow-step workflow-step-${status}`} key={label}>
              <span className="workflow-step-index">{index + 1}</span>
              <div>
                <strong>{label}</strong>
                <p className="muted">
                  {status === "done" ? "Done" : status === "current" ? "Current step" : "Locked"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
