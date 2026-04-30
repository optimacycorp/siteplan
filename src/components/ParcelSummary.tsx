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
        <>
          <div className="property-card">
            <strong>{parcel.address || parcel.headline || "Selected parcel"}</strong>
            <p className="muted">
              {parcel.apn ? `APN ${parcel.apn}` : "Parcel selected"}
              {parcel.county || parcel.state ? ` • ${[parcel.county, parcel.state].filter(Boolean).join(", ")}` : ""}
            </p>
            {parcel.sourceUrl ? (
              <p className="muted">
                <a href={parcel.sourceUrl} rel="noreferrer" target="_blank">
                  Open county property record
                </a>
              </p>
            ) : null}
          </div>
          <dl className="summary-grid">
            <dt>Address</dt>
            <dd>{parcel.address || parcel.headline}</dd>
            <dt>APN</dt>
            <dd>{parcel.apn || "-"}</dd>
            <dt>Owner</dt>
            <dd>{parcel.ownerName || "-"}</dd>
            <dt>Area</dt>
            <dd>{parcel.areaAcres ? `${parcel.areaAcres.toFixed(2)} acres` : "-"}</dd>
            <dt>Zoning</dt>
            <dd>{parcel.zoning || "-"}</dd>
            <dt>County</dt>
            <dd>{parcel.county || "-"}</dd>
            <dt>Source</dt>
            <dd>{parcel.sourceKey || String(parcel.fields?.sourceKey ?? parcel.fields?.legacyProvider ?? "manual")}</dd>
            <dt>Flood zone</dt>
            <dd>{parcel.floodZone || "-"}</dd>
            <dt>Adjoining parcels</dt>
            <dd>{neighbors.length}</dd>
          </dl>
        </>
      )}
    </section>
  );
}
