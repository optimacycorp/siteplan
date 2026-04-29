import { useQuery } from "@tanstack/react-query";

import { assertRegridConfigured, hasRegridProxyEnv } from "@/lib/regrid";

import {
  fetchRegridParcelByPoint,
  fetchRegridParcelByUuid,
  fetchRegridParcelNeighbors,
  fetchRegridParcelTileConfig,
  searchRegridParcels,
} from "./regridParcelService";

export function useRegridParcelTileConfig() {
  return useQuery({
    queryKey: ["regrid", "tiles", "parcels"],
    queryFn: async () => {
      assertRegridConfigured();
      return fetchRegridParcelTileConfig();
    },
    enabled: hasRegridProxyEnv,
    staleTime: 1000 * 60 * 60,
  });
}

export function useRegridParcelSearch(query: string) {
  return useQuery({
    queryKey: ["regrid", "parcels", "search", query],
    queryFn: async () => {
      assertRegridConfigured();
      return searchRegridParcels(query);
    },
    enabled: hasRegridProxyEnv && query.trim().length >= 3,
    staleTime: 30_000,
  });
}

export function useRegridParcelDetail(llUuid?: string | null) {
  return useQuery({
    queryKey: ["regrid", "parcels", "detail", llUuid],
    queryFn: async () => {
      assertRegridConfigured();
      return fetchRegridParcelByUuid(llUuid ?? "");
    },
    enabled: hasRegridProxyEnv && Boolean(llUuid),
    staleTime: 60_000,
  });
}

export function useRegridParcelPointLookup(coordinate?: { lng: number; lat: number } | null) {
  return useQuery({
    queryKey: ["regrid", "parcels", "point", coordinate?.lng, coordinate?.lat],
    queryFn: async () => {
      assertRegridConfigured();
      return fetchRegridParcelByPoint(coordinate ?? { lng: 0, lat: 0 });
    },
    enabled: hasRegridProxyEnv && Boolean(coordinate),
    staleTime: 15_000,
  });
}

export function useRegridParcelNeighbors(input?: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  excludeLlUuid?: string | null;
} | null) {
  return useQuery({
    queryKey: ["regrid", "parcels", "neighbors", input?.lat, input?.lng, input?.radius, input?.limit, input?.excludeLlUuid],
    queryFn: async () => {
      assertRegridConfigured();
      return fetchRegridParcelNeighbors(input ?? { lat: 0, lng: 0 });
    },
    enabled: hasRegridProxyEnv && Boolean(input),
    staleTime: 30_000,
  });
}
