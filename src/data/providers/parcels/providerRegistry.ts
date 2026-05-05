import * as fixtureParcelService from "../../../services/fixtureParcelService";
import * as openParcelService from "../../../services/openParcelService";
import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../../../types/parcel";
import { fultonCountyProvider } from "./fultonCountyProvider";
import {
  type ParcelNeighborsInput,
  type ParcelPointInput,
  type ParcelProvider,
  withDetailSource,
  withSearchResultSource,
} from "./types";

const useFixtures = String(import.meta.env.VITE_USE_PARCEL_FIXTURES || "").toLowerCase() === "true";
const defaultProviderPreference = String(import.meta.env.VITE_DEFAULT_PARCEL_PROVIDER || "auto").trim().toLowerCase();

function createServiceAdapterProvider(
  id: string,
  label: string,
  implementation: {
    searchParcels: (query: string) => Promise<ParcelSearchResult[]>;
    fetchParcelByUuid: (llUuid: string) => Promise<ParcelDetail | null>;
    fetchParcelAtPoint: (input: ParcelPointInput) => Promise<ParcelDetail | null>;
    fetchParcelCandidatesAtPoint: (input: ParcelPointInput) => Promise<ParcelDetail[]>;
    fetchParcelNeighbors: (input?: ParcelNeighborsInput) => Promise<ParcelNeighbor[]>;
  },
): ParcelProvider {
  return {
    id,
    label,
    async searchParcels(query) {
      const results = await implementation.searchParcels(query);
      return results.map((result) => withSearchResultSource(result, { id, label }));
    },
    async fetchParcelByUuid(llUuid) {
      const detail = await implementation.fetchParcelByUuid(llUuid);
      return detail ? withDetailSource(detail, { id, label }) : null;
    },
    async fetchParcelAtPoint(input) {
      const detail = await implementation.fetchParcelAtPoint(input);
      return detail ? withDetailSource(detail, { id, label }) : null;
    },
    async fetchParcelCandidatesAtPoint(input) {
      const details = await implementation.fetchParcelCandidatesAtPoint(input);
      return details.map((detail) => withDetailSource(detail, { id, label }));
    },
    fetchParcelNeighbors: implementation.fetchParcelNeighbors,
  };
}

const fixtureProvider = createServiceAdapterProvider("fixture", "Fixture sample parcel", fixtureParcelService);
const proxyProvider = createServiceAdapterProvider("open-parcel-proxy", "County parcel proxy", openParcelService);

const providerMap = new Map<string, ParcelProvider>([
  [fixtureProvider.id, fixtureProvider],
  [proxyProvider.id, proxyProvider],
  [fultonCountyProvider.id, fultonCountyProvider],
]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeFultonSearch(query: string) {
  return fultonCountyProvider.supportsQuery?.(query) ?? false;
}

function getProviderById(id: string | undefined | null) {
  if (!id) return null;
  return providerMap.get(id.toLowerCase()) ?? null;
}

function getPreferredInteractiveProvider() {
  if (useFixtures) return fixtureProvider;
  const configured = getProviderById(defaultProviderPreference);
  if (configured) return configured;
  return proxyProvider;
}

export function listParcelProviders() {
  return [...providerMap.values()];
}

export function resolveSearchProvider(query: string) {
  if (useFixtures) return fixtureProvider;
  const trimmed = query.trim();
  if (!trimmed) return getPreferredInteractiveProvider();
  if (/^fulton:/i.test(trimmed) || looksLikeFultonSearch(trimmed)) {
    return fultonCountyProvider;
  }
  if (defaultProviderPreference !== "auto") {
    const configured = getProviderById(defaultProviderPreference);
    if (configured) return configured;
  }
  return proxyProvider;
}

export function resolveProviderForParcelId(llUuid: string) {
  if (/^fulton:/i.test(llUuid)) return fultonCountyProvider;
  if (/^fixture-/i.test(llUuid) || /^geocode:/i.test(llUuid) && useFixtures) return fixtureProvider;
  return getPreferredInteractiveProvider();
}

export async function searchParcelsViaRegistry(query: string) {
  const provider = resolveSearchProvider(query);
  return provider.searchParcels(query);
}

export async function fetchParcelByUuidViaRegistry(llUuid: string) {
  const provider = resolveProviderForParcelId(llUuid);
  return provider.fetchParcelByUuid(llUuid);
}

export async function fetchParcelAtPointViaRegistry(input: ParcelPointInput) {
  return getPreferredInteractiveProvider().fetchParcelAtPoint(input);
}

export async function fetchParcelCandidatesAtPointViaRegistry(input: ParcelPointInput) {
  return getPreferredInteractiveProvider().fetchParcelCandidatesAtPoint(input);
}

export async function fetchParcelNeighborsViaRegistry(input?: ParcelNeighborsInput) {
  return getPreferredInteractiveProvider().fetchParcelNeighbors(input);
}

export function describeParcelSource(sourceKey?: string | null, sourceLabel?: string | null) {
  if (sourceLabel) return sourceLabel;
  const normalized = normalizeText(sourceKey || "");
  switch (normalized) {
    case "fixture":
      return "Fixture sample parcel";
    case "open parcel proxy":
    case "open parcel proxy".replace(/\s+/g, "-"):
    case "open parcel proxy".replace(/\s+/g, ""):
    case "open-parcel-proxy":
    case "co el paso county parcels":
    case "co-el-paso-county-parcels":
      return "El Paso County parcel cache";
    case "fulton county ga":
    case "fulton county gis":
    case "fulton-county-ga":
      return "Fulton County GIS";
    default:
      return sourceKey || "Parcel provider";
  }
}
