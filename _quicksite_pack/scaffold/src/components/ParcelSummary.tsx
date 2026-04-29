import { useQuickSiteStore } from "../state/quickSiteStore";

export function ParcelSummary() {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  return (
    <section className="panel-section">
      <h2>Parcel summary</h2>
      {!parcel ? <p className="muted">Select a parcel to see details.</p> : (
        <dl>
          <dt>Address</dt><dd>{parcel.address || parcel.headline}</dd>
          <dt>APN</dt><dd>{parcel.apn || "—"}</dd>
          <dt>Area</dt><dd>{parcel.areaAcres ? `${parcel.areaAcres.toFixed(2)} acres` : "—"}</dd>
          <dt>Zoning</dt><dd>{parcel.zoning || "—"}</dd>
          <dt>County</dt><dd>{parcel.county || "—"}</dd>
        </dl>
      )}
    </section>
  );
}
