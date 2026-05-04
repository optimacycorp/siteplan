import { useMemo } from "react";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { PrintScaleBar } from "./PrintScaleBar";

function formatFeatureLabel(type: string, count: number) {
  const labels: Record<string, string> = {
    "structure-polygon": "Structure",
    "driveway-line": "Driveway",
    "easement-line": "Easement",
    "dimension-line": "Dimension",
    "label-point": "Label",
  };
  return `${labels[type] ?? type} (${count})`;
}

export function PrintPlanSheet() {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  const drawings = useDrawingStore((state) => state.drawings);

  const drawingSummary = useMemo(() => {
    const counts = drawings.reduce<Record<string, number>>((acc, drawing) => {
      acc[drawing.type] = (acc[drawing.type] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([type, count]) => formatFeatureLabel(type, count));
  }, [drawings]);

  const printedAt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  return (
    <div className="print-sheet">
      <div className="print-card print-card-header">
        <div>
          <div className="print-kicker">Optimacy QuickSite</div>
          <h1>Conceptual Site Plan Exhibit</h1>
          <p>{parcel?.address || parcel?.headline || "Selected parcel"}</p>
        </div>
        <div className="print-card-header-tools">
          <PrintScaleBar />
          <div className="print-north-arrow" aria-label="North arrow">
            <span>N</span>
          </div>
        </div>
      </div>

      <div className="print-card print-card-metadata">
        <div className="print-meta-grid">
          <div>
            <span>APN</span>
            <strong>{parcel?.apn || "-"}</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong>{parcel?.ownerName || "-"}</strong>
          </div>
          <div>
            <span>Area</span>
            <strong>{parcel?.areaAcres ? `${parcel.areaAcres.toFixed(2)} acres` : "-"}</strong>
          </div>
          <div>
            <span>County / State</span>
            <strong>{[parcel?.county, parcel?.state].filter(Boolean).join(", ") || "-"}</strong>
          </div>
          <div>
            <span>Zoning</span>
            <strong>{parcel?.zoning || "-"}</strong>
          </div>
          <div>
            <span>Printed</span>
            <strong>{printedAt}</strong>
          </div>
        </div>
      </div>

      <div className="print-card print-card-footer">
        <div>
          <div className="print-section-title">Plan Features</div>
          <p>{drawingSummary.length ? drawingSummary.join(" | ") : "No plan features added."}</p>
        </div>
        <div>
          <div className="print-section-title">Exhibit Notes</div>
          <p>Conceptual planning exhibit only. Not a boundary survey, legal description, or construction staking document.</p>
        </div>
        <div>
          <div className="print-section-title">Source</div>
          <p>{parcel?.sourceKey || "local parcel cache"}{parcel?.sourceUrl ? " | county record available" : ""}</p>
        </div>
      </div>
    </div>
  );
}
