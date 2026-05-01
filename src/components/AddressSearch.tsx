import { fetchParcelByUuid, fetchParcelNeighbors, searchParcels } from "../services/parcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";
import type { ParcelDetail, ParcelSearchResult } from "../types/parcel";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

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
      ownerName: "",
      zoning: "",
      floodZone: "",
      areaAcres: 0,
      areaSqft: 0,
      county: "",
      state: "",
      path: result.path,
      sourceKey: "",
      sourceUrl: "",
      geometry: null,
      centroid: result.coordinates ? [lng, lat] : null,
      fields: {},
    };
  }

  function describeResult(result: ParcelSearchResult) {
    if (result.kind === "geocode") {
      return "Mapped address only";
    }
    if (result.matchType === "contains") return "Best match";
    if (result.matchType === "near") return "Nearby parcel";
    return "Parcel candidate";
  }

  return (
    <section className="panel-section">
      <h2>1. Find property</h2>
      <p className="muted">
        Start with the property address. If the parcel boundary is not selected automatically,
        click the parcel on the map.
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
      {!searchLoading && !searchError && !searchResults.length ? (
        <EmptyState
          title="Start with an address"
          body="Search for the property address to load parcel candidates or a mapped location."
        />
      ) : null}
      {searchResults.map((result) => (
        <div className="result-card" key={result.llUuid}>
          <button
            className="result-card-button"
            onClick={() => void selectParcel(result.llUuid)}
            disabled={selectedParcelLoading}
            type="button"
          >
            <strong>{result.headline || result.address || result.llUuid}</strong>
            <p className="muted">{result.parcelNumber ? `APN ${result.parcelNumber}` : result.context || "Parcel search result"}</p>
            {result.acreage ? <p className="muted">{result.acreage.toFixed(2)} acres</p> : null}
            <InlineNotice tone={result.kind === "geocode" ? "warning" : result.matchType === "contains" ? "success" : "info"}>
              {describeResult(result)}
            </InlineNotice>
          </button>
          <details className="result-details">
            <summary>More details</summary>
            <p className="muted">{result.context || result.path || "Parcel search result"}</p>
            <p className="muted">{result.sourceKey || result.provider || "parcel-provider"}</p>
          </details>
        </div>
      ))}
      {selectedParcelLoading ? (
        <p className="muted">Loading parcel boundary and adjoining parcels...</p>
      ) : null}
    </section>
  );
}
