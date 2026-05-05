import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../../../types/parcel";

export type ParcelPointInput = {
  lat: number;
  lng: number;
  providerId?: string | null;
};

export type ParcelNeighborsInput = ParcelPointInput & {
  excludeLlUuid?: string | null;
};

export type ParcelProviderContext = {
  query?: string;
};

export type ParcelProvider = {
  id: string;
  label: string;
  jurisdiction?: string;
  supportsQuery?: (query: string) => boolean;
  searchParcels: (query: string) => Promise<ParcelSearchResult[]>;
  fetchParcelByUuid: (llUuid: string) => Promise<ParcelDetail | null>;
  fetchParcelAtPoint: (input: ParcelPointInput) => Promise<ParcelDetail | null>;
  fetchParcelCandidatesAtPoint: (input: ParcelPointInput) => Promise<ParcelDetail[]>;
  fetchParcelNeighbors: (input?: ParcelNeighborsInput) => Promise<ParcelNeighbor[]>;
};

export class ParcelProviderError extends Error {
  providerId: string;

  constructor(providerId: string, message: string) {
    super(message);
    this.name = "ParcelProviderError";
    this.providerId = providerId;
  }
}

export class ParcelProviderUnavailableError extends ParcelProviderError {
  constructor(providerId: string, message: string) {
    super(providerId, message);
    this.name = "ParcelProviderUnavailableError";
  }
}

export class ParcelProviderGeometryError extends ParcelProviderError {
  constructor(providerId: string, message: string) {
    super(providerId, message);
    this.name = "ParcelProviderGeometryError";
  }
}

export function withSearchResultSource(
  result: ParcelSearchResult,
  provider: Pick<ParcelProvider, "id" | "label">,
): ParcelSearchResult {
  return {
    ...result,
    providerId: result.providerId || provider.id,
    sourceLabel: result.sourceLabel || provider.label,
    sourceKey: result.sourceKey || provider.id,
  };
}

export function withDetailSource(
  detail: ParcelDetail,
  provider: Pick<ParcelProvider, "id" | "label">,
): ParcelDetail {
  return {
    ...detail,
    providerId: detail.providerId || provider.id,
    sourceLabel: detail.sourceLabel || provider.label,
    sourceKey: detail.sourceKey || provider.id,
    fields: {
      ...detail.fields,
      sourceKey: detail.sourceKey || provider.id,
      sourceLabel: detail.sourceLabel || provider.label,
    },
  };
}
