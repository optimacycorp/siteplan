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
  mapView: { center: [number, number]; zoom: number };
  exportMeta: {
    projectTitle: string;
    projectNumber: string;
    preparedFor: string;
    preparedBy: string;
    sheetNumber: string;
    revision: string;
    notes: string;
  };
  layerVisibility: Record<string, boolean>;
  setBasemap: (basemap: BasemapKey) => void;
  setSearchText: (searchText: string) => void;
  setSearchResults: (results: ParcelSearchResult[]) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchError: (message: string) => void;
  setSelectedParcelLoading: (loading: boolean) => void;
  setSelectedParcel: (parcel: ParcelDetail | null) => void;
  clearSelectedParcel: () => void;
  setNeighbors: (neighbors: ParcelNeighbor[]) => void;
  setMapView: (mapView: { center: [number, number]; zoom: number }) => void;
  setExportMeta: (
    patch: Partial<{
      projectTitle: string;
      projectNumber: string;
      preparedFor: string;
      preparedBy: string;
      sheetNumber: string;
      revision: string;
      notes: string;
    }>,
  ) => void;
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
  mapView: {
    center: [-104.897322, 38.87837],
    zoom: 17,
  },
  exportMeta: {
    projectTitle: "Conceptual Site Plan Exhibit",
    projectNumber: "",
    preparedFor: "",
    preparedBy: "Optimacy QuickSite",
    sheetNumber: "Sheet 1",
    revision: "A",
    notes:
      "Conceptual planning exhibit only. Not a boundary survey, legal description, or construction staking document.",
  },
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
  clearSelectedParcel: () => set({ selectedParcel: null, neighbors: [] }),
  setNeighbors: (neighbors) => set({ neighbors }),
  setMapView: (mapView) => set({ mapView }),
  setExportMeta: (patch) =>
    set((state) => ({
      exportMeta: {
        ...state.exportMeta,
        ...patch,
      },
    })),
  toggleLayer: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),
}));
