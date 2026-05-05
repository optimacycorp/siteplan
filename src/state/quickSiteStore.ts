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
  terrainSettings: {
    contourOpacity: number;
    contourUnits: "feet" | "meters";
    hillshade: boolean;
    sourceStatus: "idle" | "loading" | "ready" | "error";
    sourceMessage: string;
  };
  exportMeta: {
    projectTitle: string;
    projectNumber: string;
    preparedFor: string;
    preparedBy: string;
    sheetNumber: string;
    revision: string;
    notes: string;
    pageSize: "letter" | "tabloid";
  };
  layerVisibility: Record<string, boolean>;
  mapFocusRequest: { key: string; bounds: [[number, number], [number, number]]; maxZoom?: number } | null;
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
  setTerrainSettings: (
    patch: Partial<{
      contourOpacity: number;
      contourUnits: "feet" | "meters";
      hillshade: boolean;
      sourceStatus: "idle" | "loading" | "ready" | "error";
      sourceMessage: string;
    }>,
  ) => void;
  focusMapBounds: (bounds: [[number, number], [number, number]], maxZoom?: number) => void;
  clearMapFocusRequest: () => void;
  setExportMeta: (
    patch: Partial<{
      projectTitle: string;
      projectNumber: string;
      preparedFor: string;
      preparedBy: string;
      sheetNumber: string;
      revision: string;
      notes: string;
      pageSize: "letter" | "tabloid";
    }>,
  ) => void;
  hydrateExportSession: (payload: {
    basemap: BasemapKey;
    selectedParcel: ParcelDetail | null;
    neighbors: ParcelNeighbor[];
    mapView: { center: [number, number]; zoom: number };
    terrainSettings?: {
      contourOpacity: number;
      contourUnits: "feet" | "meters";
      hillshade: boolean;
      sourceStatus: "idle" | "loading" | "ready" | "error";
      sourceMessage: string;
    };
    exportMeta: {
      projectTitle: string;
      projectNumber: string;
      preparedFor: string;
      preparedBy: string;
      sheetNumber: string;
      revision: string;
      notes: string;
      pageSize: "letter" | "tabloid";
    };
    layerVisibility: Record<string, boolean>;
  }) => void;
  resetSession: () => void;
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
  mapFocusRequest: null,
  terrainSettings: {
    contourOpacity: 0.65,
    contourUnits: "feet",
    hillshade: false,
    sourceStatus: "idle",
    sourceMessage: "Contours off.",
  },
  exportMeta: {
    projectTitle: "Conceptual Site Plan Exhibit",
    projectNumber: "",
    preparedFor: "",
    preparedBy: "Optimacy QuickSite",
    sheetNumber: "Sheet 1",
    revision: "A",
    notes:
      "Conceptual planning exhibit only. This drawing is not a boundary survey, improvement survey plat, legal description, or construction document. Parcel data, imagery, contours, and public records should be independently verified before design, permitting, construction, or conveyance use.",
    pageSize: "letter",
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
  setTerrainSettings: (patch) =>
    set((state) => ({
      terrainSettings: {
        ...state.terrainSettings,
        ...patch,
      },
    })),
  focusMapBounds: (bounds, maxZoom) =>
    set({
      mapFocusRequest: {
        key: crypto.randomUUID(),
        bounds,
        maxZoom,
      },
    }),
  clearMapFocusRequest: () => set({ mapFocusRequest: null }),
  setExportMeta: (patch) =>
    set((state) => ({
      exportMeta: {
        ...state.exportMeta,
        ...patch,
      },
    })),
  hydrateExportSession: (payload) =>
    set((state) => ({
      basemap: payload.basemap,
      selectedParcel: payload.selectedParcel,
      neighbors: payload.neighbors,
      mapView: payload.mapView,
      terrainSettings: {
        ...state.terrainSettings,
        ...(payload.terrainSettings ?? {}),
      },
      exportMeta: {
        ...state.exportMeta,
        ...payload.exportMeta,
      },
      layerVisibility: {
        ...state.layerVisibility,
        ...payload.layerVisibility,
      },
    })),
  resetSession: () =>
    set((state) => ({
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
      mapFocusRequest: null,
      terrainSettings: {
        contourOpacity: 0.65,
        contourUnits: "feet",
        hillshade: false,
        sourceStatus: "idle",
        sourceMessage: "Contours off.",
      },
      exportMeta: {
        ...state.exportMeta,
        projectTitle: "Conceptual Site Plan Exhibit",
        projectNumber: "",
        preparedFor: "",
        preparedBy: "Optimacy QuickSite",
        sheetNumber: "Sheet 1",
        revision: "A",
        notes:
          "Conceptual planning exhibit only. This drawing is not a boundary survey, improvement survey plat, legal description, or construction document. Parcel data, imagery, contours, and public records should be independently verified before design, permitting, construction, or conveyance use.",
        pageSize: "letter",
      },
      layerVisibility: {
        parcel: true,
        neighbors: true,
        drawings: true,
        labels: true,
        contours: false,
        buildings: false,
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
