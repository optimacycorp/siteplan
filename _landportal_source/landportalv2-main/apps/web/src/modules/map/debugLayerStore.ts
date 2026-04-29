import { create } from "zustand";

export type DebugLayerKey =
  | "rawBoundary"
  | "normalizedBoundary"
  | "constraints"
  | "buildableEnvelope"
  | "frontageEdges"
  | "selectedFrontage"
  | "strategyLabel"
  | "subdivisionLots"
  | "roadCorridor"
  | "parcelMetrics";

type DebugLayerState = {
  enabled: boolean;
  layers: Record<DebugLayerKey, boolean>;
  toggleEnabled: () => void;
  toggleLayer: (key: DebugLayerKey) => void;
};

const defaultLayers: Record<DebugLayerKey, boolean> = {
  rawBoundary: true,
  normalizedBoundary: false,
  constraints: true,
  buildableEnvelope: true,
  frontageEdges: true,
  selectedFrontage: true,
  strategyLabel: true,
  subdivisionLots: true,
  roadCorridor: true,
  parcelMetrics: true,
};

export const useDebugLayerStore = create<DebugLayerState>((set) => ({
  enabled: false,
  layers: defaultLayers,
  toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
  toggleLayer: (key) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [key]: !state.layers[key],
      },
    })),
}));
