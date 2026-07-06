import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GisLayer } from "../types/gisLayer";

type GisLayerState = {
  layers: GisLayer[];
  selectedLayerId: string | null;
  addLayer: (layer: GisLayer) => void;
  removeLayer: (id: string) => void;
  clearLayers: () => void;
  toggleLayerVisibility: (id: string) => void;
  selectLayer: (id: string | null) => void;
  hydrateExportSession: (payload: { layers: GisLayer[]; selectedLayerId?: string | null }) => void;
  resetSession: () => void;
};

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function safeStorage() {
  if (typeof window === "undefined") {
    return memoryStorage;
  }
  return window.localStorage;
}

export const useGisLayerStore = create<GisLayerState>()(
  persist(
    (set) => ({
      layers: [],
      selectedLayerId: null,
      addLayer: (layer) =>
        set((state) => ({
          layers: [layer, ...state.layers],
          selectedLayerId: layer.id,
        })),
      removeLayer: (id) =>
        set((state) => ({
          layers: state.layers.filter((layer) => layer.id !== id),
          selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
        })),
      clearLayers: () => set({ layers: [], selectedLayerId: null }),
      toggleLayerVisibility: (id) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer,
          ),
        })),
      selectLayer: (selectedLayerId) => set({ selectedLayerId }),
      hydrateExportSession: (payload) =>
        set({
          layers: payload.layers,
          selectedLayerId: payload.selectedLayerId ?? null,
        }),
      resetSession: () => set({ layers: [], selectedLayerId: null }),
    }),
    {
      name: "optimacy-quicksite-gis-layers",
      storage: createJSONStorage(safeStorage),
      partialize: (state) => ({
        layers: state.layers,
        selectedLayerId: state.selectedLayerId,
      }),
    },
  ),
);
