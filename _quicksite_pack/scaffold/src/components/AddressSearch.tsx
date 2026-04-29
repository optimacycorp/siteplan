import { useState } from "react";
import { fetchParcelByUuid, fetchParcelNeighbors, searchParcels } from "../services/regridParcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";

export function AddressSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { searchText, searchResults, setSearchText, setSearchResults, setSelectedParcel, setNeighbors } = useQuickSiteStore();

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      setSearchResults(await searchParcels(searchText));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function selectParcel(llUuid: string) {
    setLoading(true);
    setError("");
    try {
      const detail = await fetchParcelByUuid(llUuid);
      setSelectedParcel(detail);
      if (detail?.centroid) {
        setNeighbors(await fetchParcelNeighbors({ lng: detail.centroid[0], lat: detail.centroid[1], excludeLlUuid: detail.llUuid }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parcel selection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel-section">
      <h2>1. Find property</h2>
      <input className="search-input" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Enter address" />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="primary-button" onClick={runSearch} disabled={loading}>{loading ? "Searching..." : "Search"}</button>
      </div>
      {error ? <p className="muted">{error}</p> : null}
      {searchResults.map((result) => (
        <button className="result-card" key={result.llUuid} onClick={() => selectParcel(result.llUuid)}>
          <strong>{result.address || result.llUuid}</strong>
          <p className="muted">{result.context}</p>
        </button>
      ))}
    </section>
  );
}
