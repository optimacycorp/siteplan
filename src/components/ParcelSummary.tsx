import { useQuickSiteStore } from "../state/quickSiteStore";

export function ParcelSummary() {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  const neighbors = useQuickSiteStore((state) => state.neighbors);

  return (
    <section className="panel-section">
      <h2>Parcel summary</h2>
      {!parcel ? (
        <p className="muted">Select a parcel to see details.</p>
      ) : (
        <dl className="summary-grid">
          <dt>Address</dt>
          <dd>{parcel.address || parcel.headline}</dd>
          <dt>APN</dt>
          <dd>{parcel.apn || "-"}</dd>
          <dt>Area</dt>
          <dd>{parcel.areaAcres ? `${parcel.areaAcres.toFixed(2)} acres` : "-"}</dd>
          <dt>Zoning</dt>
          <dd>{parcel.zoning || "-"}</dd>
          <dt>County</dt>
          <dd>{parcel.county || "-"}</dd>
          <dt>Flood zone</dt>
          <dd>{parcel.floodZone || "-"}</dd>
          <dt>Adjoining parcels</dt>
          <dd>{neighbors.length}</dd>
        </dl>
      )}
    </section>
  );
}
