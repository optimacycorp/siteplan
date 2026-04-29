import {
  fetchParcelTerrainSummary,
  fetchTerrainPointSample,
  fetchTerrainSourceMetadata,
} from "@landportal/api-client";
import { useQuery } from "@tanstack/react-query";

type TerrainCoordinate = {
  lng: number;
  lat: number;
};

type LocalPoint = {
  x: number;
  y: number;
};

export function useTerrainSourceMetadata() {
  return useQuery({
    queryKey: ["terrain-source-metadata"],
    queryFn: () => fetchTerrainSourceMetadata(),
    staleTime: 60_000,
  });
}

export function useTerrainPointSample(coordinate: TerrainCoordinate | null, enabled = true) {
  return useQuery({
    queryKey: ["terrain-point-sample", coordinate?.lng ?? null, coordinate?.lat ?? null],
    queryFn: () => {
      if (!coordinate) {
        throw new Error("coordinate is required");
      }
      return fetchTerrainPointSample(coordinate);
    },
    enabled: Boolean(coordinate) && enabled,
    staleTime: 15_000,
  });
}

export function useParcelTerrainSummary(
  input: { parcelId: string; polygon: LocalPoint[]; buildableAreaAcres?: number | null } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["parcel-terrain-summary", input?.parcelId ?? null],
    queryFn: () => {
      if (!input) {
        throw new Error("parcel terrain input is required");
      }
      return fetchParcelTerrainSummary(input);
    },
    enabled: Boolean(input?.parcelId) && Boolean(input?.polygon.length) && enabled,
    staleTime: 30_000,
  });
}
