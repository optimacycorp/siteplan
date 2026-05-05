import {
  describeParcelSource,
  fetchParcelByUuid,
  fetchParcelNeighbors,
  geocodeAddressCandidates,
  searchParcels,
} from "../services/parcelService";
import { useQuickSiteStore } from "../state/quickSiteStore";
import type { ParcelDetail, ParcelSearchResult } from "../types/parcel";
import { EmptyState } from "./EmptyState";
import { InlineNotice } from "./InlineNotice";

function looksLikeParcelIdentifier(query: string) {
  const normalized = query.trim().replace(/\s+/g, "");
  if (!normalized) return false;
  if (/^(apn|parcel|pin)[:#\s-]/i.test(query.trim())) return true;
  const compact = normalized.replace(/[-.]/g, "");
  return /^\d{6,}$/.test(compact);
}

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
    clearSelectedParcel,
    setNeighbors,
    focusMapPoint,
  } = useQuickSiteStore();

  async function runSearch() {
    setSearchLoading(true);
    setSearchError("");
    try {
      const query = searchText.trim();
      const results = looksLikeParcelIdentifier(query)
        ? await searchParcels(query)
        : await geocodeAddressCandidates(query);
      setSearchResults(results);
      if (!results.length) {
        setSearchError(
          looksLikeParcelIdentifier(query)
            ? "No parcels matched that parcel number or APN."
            : "No mapped address was found. Try a fuller USPS-style street address with city and ZIP.",
        );
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
        clearSelectedParcel();
        setNeighbors([]);
        if (result.coordinates) {
          focusMapPoint(result.coordinates, 18);
        }
        setSearchError("");
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

  function describeResult(result: ParcelSearchResult) {
    if (result.kind === "geocode") {
      return "Center map and click parcel";
    }
    if (result.matchType === "contains") return "Best match";
    if (result.matchType === "near") return "Nearby parcel";
    return "Parcel candidate";
  }

  return (
    <section className="panel-section">
      <h2>1. Find property</h2>
      <p className="muted">
        Enter a USPS-style address to center the map near the property, then click the parcel on the map.
        You can still paste a parcel number or APN for direct parcel search.
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
            <p className="muted">
              {describeParcelSource(result.sourceKey || result.providerId || result.provider, result.sourceLabel)}
            </p>
          </details>
        </div>
      ))}
      {selectedParcelLoading ? (
        <p className="muted">Loading parcel boundary and adjoining parcels...</p>
      ) : null}
    </section>
  );
}
