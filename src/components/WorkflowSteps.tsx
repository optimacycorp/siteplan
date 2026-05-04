import { rampartNeighborFixtures, rampartParcelFixture, rampartParcelSearchResults } from "../fixtures/rampartParcelFixture";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";

type StepStatus = "done" | "current" | "locked";

type StepDefinition = {
  label: string;
  status: StepStatus;
  helper: string;
};

function buildSteps(selectedParcel: boolean, drawingCount: number): StepDefinition[] {
  return [
    {
      label: "Find property",
      status: selectedParcel ? "done" : "current",
      helper: selectedParcel
        ? "Property search completed."
        : "Search by address or open the sample parcel to begin.",
    },
    {
      label: "Confirm parcel",
      status: selectedParcel ? (drawingCount > 0 ? "done" : "current") : "locked",
      helper: selectedParcel
        ? "Parcel selected. You can change it any time."
        : "Select the parcel boundary before drawing.",
    },
    {
      label: "Draw plan",
      status: !selectedParcel ? "locked" : drawingCount > 0 ? "done" : "current",
      helper: !selectedParcel
        ? "Drawing tools unlock after parcel confirmation."
        : drawingCount > 0
          ? "Plan features added. Review and refine as needed."
          : "Add the structure, driveway, easement, dimension, or labels.",
    },
    {
      label: "Export exhibit",
      status: selectedParcel && drawingCount > 0 ? "current" : "locked",
      helper:
        selectedParcel && drawingCount > 0
          ? "Preview the exhibit, choose letter or tabloid, then print or save PDF."
          : "Export becomes available after you add at least one plan feature.",
    },
  ];
}

export function WorkflowSteps() {
  const fixtureMode = String(import.meta.env.VITE_USE_PARCEL_FIXTURES || "").toLowerCase() === "true";
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const searchError = useQuickSiteStore((state) => state.searchError);
  const drawingCount = useDrawingStore((state) => state.drawings.length);
  const setSelectedParcel = useQuickSiteStore((state) => state.setSelectedParcel);
  const setNeighbors = useQuickSiteStore((state) => state.setNeighbors);
  const setSearchResults = useQuickSiteStore((state) => state.setSearchResults);
  const setSearchText = useQuickSiteStore((state) => state.setSearchText);
  const setSearchError = useQuickSiteStore((state) => state.setSearchError);
  const resetQuickSite = useQuickSiteStore((state) => state.resetSession);
  const resetDrawings = useDrawingStore((state) => state.resetSession);

  const steps = buildSteps(Boolean(selectedParcel), drawingCount);

  const handleUseSampleParcel = () => {
    setSearchText(rampartParcelFixture.address);
    setSearchResults(rampartParcelSearchResults);
    setSelectedParcel(rampartParcelFixture);
    setNeighbors(rampartNeighborFixtures);
    setSearchError("");
  };

  const handleStartOver = () => {
    resetQuickSite();
    resetDrawings();
  };

  const currentStep = steps.find((step) => step.status === "current") ?? steps[0];

  return (
    <section className="panel-section">
      <h2>Workflow</h2>
      <p className="muted">{currentStep.helper}</p>
      {searchError ? <p className="status-message error-text">{searchError}</p> : null}
      <div className="workflow-steps">
        {steps.map((step, index) => (
          <div className={`workflow-step workflow-step-${step.status}`} key={step.label}>
            <span className="workflow-step-index">{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <p className="muted">{step.helper}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card-actions">
        {fixtureMode ? (
          <button className="secondary-button" onClick={handleUseSampleParcel} type="button">
            Use sample parcel
          </button>
        ) : null}
        <button className="secondary-button" onClick={handleStartOver} type="button">
          Start over
        </button>
      </div>
    </section>
  );
}
