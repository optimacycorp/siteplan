import { create } from "zustand";
import type { BasemapKey } from "../map/basemapRegistry";
import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../types/parcel";

type QuickSiteState = {
  basemap: BasemapKey;
  searchText: string;
  searchResults: ParcelSearchResult[];
  selectedParcel: ParcelDetail | null;
  neighbors: ParcelNeighbor[];
  layerVisibility: Record<string, boolean>;
  setBasemap: (basemap: BasemapKey) => void;
  setSearchText: (searchText: string) => void;
  setSearchResults: (results: ParcelSearchResult[]) => void;
  setSelectedParcel: (parcel: ParcelDetail | null) => void;
  setNeighbors: (neighbors: ParcelNeighbor[]) => void;
  toggleLayer: (layer: string) => void;
};

export const useQuickSiteStore = create<QuickSiteState>((set) => ({
  basemap: "satellite",
  searchText: "",
  searchResults: [],
  selectedParcel: null,
  neighbors: [],
  layerVisibility: { parcel: true, neighbors: true, drawings: true, labels: true, contours: false, buildings: false },
  setBasemap: (basemap) => set({ basemap }),
  setSearchText: (searchText) => set({ searchText }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSelectedParcel: (selectedParcel) => set({ selectedParcel }),
  setNeighbors: (neighbors) => set({ neighbors }),
  toggleLayer: (layer) => set((state) => ({ layerVisibility: { ...state.layerVisibility, [layer]: !state.layerVisibility[layer] } })),
}));
