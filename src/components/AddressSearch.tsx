import { fetchParcelByUuid, fetchParcelNeighbors, searchParcels } from "../services/regridParcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";

export function AddressSearch() {
  const {
    searchText,
    searchResults,
    searchLoading,
    searchError,
    selectedParcelLoading,
    setSearchText,
    setSearchResults,
    setSearchLoading,
    setSearchError,
    setSelectedParcelLoading,
    setSelectedParcel,
    setNeighbors,
  } = useQuickSiteStore();

  async function runSearch() {
    setSearchLoading(true);
    setSearchError("");
    try {
      const results = await searchParcels(searchText);
      setSearchResults(results);
      if (!results.length) {
        setSearchError("No parcels matched that address. Try a fuller street address or ZIP code.");
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectParcel(llUuid: string) {
    setSelectedParcelLoading(true);
    setSearchError("");
    try {
      const detail = await fetchParcelByUuid(llUuid);
      setSelectedParcel(detail);
      setNeighbors([]);
      if (detail?.centroid) {
        setNeighbors(
          await fetchParcelNeighbors({
            lng: detail.centroid[0],
            lat: detail.centroid[1],
            excludeLlUuid: detail.llUuid,
          }),
        );
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Parcel selection failed");
    } finally {
      setSelectedParcelLoading(false);
    }
  }

  return (
    <section className="panel-section">
      <h2>1. Find property</h2>
      <p className="muted">
        Search by street address, city, and ZIP. Example: 3245 Rampart Range Road, 80919,
        Colorado Springs, Colorado
      </p>
      <input
        className="search-input"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !searchLoading) {
            void runSearch();
          }
        }}
        placeholder="Enter address"
      />
      <div className="panel-actions">
        <button
          className="primary-button"
          onClick={() => void runSearch()}
          disabled={searchLoading || !searchText.trim()}
          type="button"
        >
          {searchLoading ? "Searching..." : "Search"}
        </button>
      </div>
      {searchError ? <p className="status-message error-text">{searchError}</p> : null}
      {!searchError && searchResults.length > 0 ? (
        <p className="muted">{searchResults.length} parcel candidate(s)</p>
      ) : null}
      {searchResults.map((result) => (
        <button
          className="result-card"
          key={result.llUuid}
          onClick={() => void selectParcel(result.llUuid)}
          disabled={selectedParcelLoading}
          type="button"
        >
          <strong>{result.address || result.llUuid}</strong>
          <p className="muted">{result.context || result.path || "Parcel search result"}</p>
          <span className="result-meta">{result.llUuid}</span>
        </button>
      ))}
      {selectedParcelLoading ? (
        <p className="muted">Loading parcel boundary and adjoining parcels...</p>
      ) : null}
    </section>
  );
}
