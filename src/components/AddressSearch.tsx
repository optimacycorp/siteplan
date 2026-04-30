import { fetchParcelByUuid, fetchParcelNeighbors, searchParcels } from "../services/regridParcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";
import type { ParcelDetail, ParcelSearchResult } from "../types/parcel";

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
      const message = err instanceof Error ? err.message : "Search failed";
      if (/rate-limiting/i.test(message)) {
        setSearchError("Parcel provider is rate-limiting requests. Please wait a minute and try again.");
      } else {
        setSearchError(message);
      }
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectParcel(llUuid: string) {
    setSelectedParcelLoading(true);
    setSearchError("");
    try {
      const result = searchResults.find((entry) => entry.llUuid === llUuid);
      if (result?.kind === "geocode") {
        const fallbackParcel = buildGeocodePlaceholder(result);
        setSelectedParcel(fallbackParcel);
        setNeighbors([]);
        setSearchError("No direct parcel match from the parcel provider. The map is centered on the address, so click the parcel manually.");
        return;
      }

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

  function buildGeocodePlaceholder(result: ParcelSearchResult): ParcelDetail {
    const [lng, lat] = result.coordinates ?? [0, 0];
    return {
      llUuid: result.llUuid,
      headline: result.address || "Geocoded address",
      address: result.address || "Geocoded address",
      apn: "",
      zoning: "",
      floodZone: "",
      areaAcres: 0,
      areaSqft: 0,
      county: "",
      state: "",
      path: result.path,
      geometry: null,
      centroid: result.coordinates ? [lng, lat] : null,
      fields: {},
    };
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
          {result.kind === "geocode" ? (
            <p className="muted">Geocoded location. Click to center map and select a parcel manually.</p>
          ) : null}
          <span className="result-meta">{result.llUuid}</span>
        </button>
      ))}
      {selectedParcelLoading ? (
        <p className="muted">Loading parcel boundary and adjoining parcels...</p>
      ) : null}
    </section>
  );
}
