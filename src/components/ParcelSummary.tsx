import { useQuickSiteStore } from "../state/quickSiteStore";
import { EmptyState } from "./EmptyState";

export function ParcelSummary() {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  const neighbors = useQuickSiteStore((state) => state.neighbors);

  return (
    <section className="panel-section">
      <h2>Parcel summary</h2>
      {!parcel ? (
        <EmptyState
          title="No parcel confirmed"
          body="Search for the property and confirm the parcel to see the plan details here."
        />
      ) : (
        <>
          <div className="property-card">
            <strong>{parcel.address || parcel.headline || "Selected parcel"}</strong>
            <p className="muted">
              {parcel.apn ? `APN ${parcel.apn}` : "Parcel selected"}
              {parcel.county || parcel.state
                ? ` | ${[parcel.county, parcel.state].filter(Boolean).join(", ")}`
                : ""}
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
            <dt>APN</dt>
            <dd>{parcel.apn || "-"}</dd>
            <dt>Area</dt>
            <dd>{parcel.areaAcres ? `${parcel.areaAcres.toFixed(2)} acres` : "-"}</dd>
            <dt>Adjoining parcels</dt>
            <dd>{neighbors.length}</dd>
          </dl>
          <details className="result-details">
            <summary>More details</summary>
            <dl className="summary-grid">
              <dt>Address</dt>
              <dd>{parcel.address || parcel.headline}</dd>
              <dt>Owner</dt>
              <dd>{parcel.ownerName || "-"}</dd>
              <dt>Zoning</dt>
              <dd>{parcel.zoning || "-"}</dd>
              <dt>County</dt>
              <dd>{parcel.county || "-"}</dd>
              <dt>Source</dt>
              <dd>
                {parcel.sourceKey ||
                  String(parcel.fields?.sourceKey ?? parcel.fields?.legacyProvider ?? "manual")}
              </dd>
              <dt>Flood zone</dt>
              <dd>{parcel.floodZone || "-"}</dd>
            </dl>
          </details>
        </>
      )}
    </section>
  );
}
