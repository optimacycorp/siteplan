import { useQuickSiteStore } from "../state/quickSiteStore";
import { useDrawingStore } from "../state/drawingStore";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

export function SelectedParcelCard() {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  const clearSelectedParcel = useQuickSiteStore((state) => state.clearSelectedParcel);
  const resetDrawings = useDrawingStore((state) => state.resetSession);

  const handleChangeParcel = () => {
    clearSelectedParcel();
    resetDrawings();
  };

  if (!parcel) {
    return (
      <section className="panel-section">
        <h2>Confirm parcel</h2>
        <EmptyState
          title="No parcel selected yet"
          body="Search for the property first. If the map doesn't select it automatically, click the parcel boundary on the map."
        />
      </section>
    );
  }

  return (
    <section className="panel-section">
      <h2>Confirm parcel</h2>
      <div className="property-card">
        <strong>{parcel.address || parcel.headline || "Selected parcel"}</strong>
        <p className="muted">
          {parcel.apn ? `APN ${parcel.apn}` : "Parcel selected"}
          {parcel.areaAcres ? ` | ${parcel.areaAcres.toFixed(2)} acres` : ""}
        </p>
        <InlineNotice tone="success">This parcel is currently selected for the plan.</InlineNotice>
        <div className="card-actions">
          <button className="primary-button" disabled type="button">
            Parcel confirmed
          </button>
          <button className="secondary-button" onClick={handleChangeParcel} type="button">
            Change parcel
          </button>
        </div>
      </div>
    </section>
  );
}
