import { create } from "zustand";
import type { BasemapKey } from "../map/basemapRegistry";
import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../types/parcel";

type QuickSiteState = {
  basemap: BasemapKey;
  searchText: string;
  searchResults: ParcelSearchResult[];
  searchLoading: boolean;
  searchError: string;
  selectedParcelLoading: boolean;
  selectedParcel: ParcelDetail | null;
  neighbors: ParcelNeighbor[];
  layerVisibility: Record<string, boolean>;
  setBasemap: (basemap: BasemapKey) => void;
  setSearchText: (searchText: string) => void;
  setSearchResults: (results: ParcelSearchResult[]) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchError: (message: string) => void;
  setSelectedParcelLoading: (loading: boolean) => void;
  setSelectedParcel: (parcel: ParcelDetail | null) => void;
  setNeighbors: (neighbors: ParcelNeighbor[]) => void;
  toggleLayer: (layer: string) => void;
};

export const useQuickSiteStore = create<QuickSiteState>((set) => ({
  basemap: "satellite",
  searchText: "",
  searchResults: [],
  searchLoading: false,
  searchError: "",
  selectedParcelLoading: false,
  selectedParcel: null,
  neighbors: [],
  layerVisibility: {
    parcel: true,
    neighbors: true,
    drawings: true,
    labels: true,
    contours: false,
    buildings: false,
  },
  setBasemap: (basemap) => set({ basemap }),
  setSearchText: (searchText) => set({ searchText }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchLoading: (searchLoading) => set({ searchLoading }),
  setSearchError: (searchError) => set({ searchError }),
  setSelectedParcelLoading: (selectedParcelLoading) => set({ selectedParcelLoading }),
  setSelectedParcel: (selectedParcel) => set({ selectedParcel }),
  setNeighbors: (neighbors) => set({ neighbors }),
  toggleLayer: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),
}));
