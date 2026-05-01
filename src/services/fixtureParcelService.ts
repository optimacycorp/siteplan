import {
  rampartNeighborFixtures,
  rampartParcelFixture,
  rampartParcelSearchResults,
  RAMPART_PARCEL_ID,
} from "../fixtures/rampartParcelFixture";
import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../types/parcel";

function pointInsideApproximateFixture(input: { lat: number; lng: number }) {
  return (
    input.lat >= 38.87795
    && input.lat <= 38.8789
    && input.lng >= -104.89805
    && input.lng <= -104.8959
  );
}

export async function searchParcels(query: string): Promise<ParcelSearchResult[]> {
  if (!query.trim()) return [];
  return rampartParcelSearchResults.filter((result) => {
    const haystack = [
      result.address,
      result.headline || "",
      result.parcelNumber || "",
      result.context,
    ].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }).length
    ? rampartParcelSearchResults
    : [rampartParcelSearchResults[1]];
}

export async function fetchParcelByUuid(llUuid: string): Promise<ParcelDetail | null> {
  if (llUuid === RAMPART_PARCEL_ID) {
    return rampartParcelFixture;
  }
  if (llUuid.startsWith("geocode:")) {
    return {
      ...rampartParcelFixture,
      llUuid,
      headline: "Geocoded address",
      address: "3245 Rampart Range Road, Colorado Springs, CO",
      geometry: null,
      sourceKey: "fixture",
    };
  }
  return null;
}

export async function fetchParcelAtPoint(input: { lat: number; lng: number }): Promise<ParcelDetail | null> {
  return pointInsideApproximateFixture(input) ? rampartParcelFixture : null;
}

export async function fetchParcelCandidatesAtPoint(input: { lat: number; lng: number }): Promise<ParcelDetail[]> {
  return pointInsideApproximateFixture(input) ? [rampartParcelFixture] : [];
}

export async function fetchParcelNeighbors(): Promise<ParcelNeighbor[]> {
  return rampartNeighborFixtures;
}
