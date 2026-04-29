import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { BasemapKey } from "./mapProviderRegistry";

type SharedMapSelection = {
  basemap: BasemapKey;
  fitNonce: number;
  hillshadeEnabled: boolean;
  terrainEnabled: boolean;
  visibility: Record<string, boolean>;
};

type SharedMapState = {
  selections: Record<string, SharedMapSelection>;
  setBasemap: (scope: string, basemap: BasemapKey) => void;
  toggleLayer: (scope: string, key: string) => void;
  setLayerVisible: (scope: string, key: string, visible: boolean) => void;
  toggleTerrain: (scope: string) => void;
  toggleHillshade: (scope: string) => void;
  triggerFit: (scope: string) => void;
};

function defaultSelection(): SharedMapSelection {
  return {
    basemap: "streets",
    fitNonce: 0,
    hillshadeEnabled: false,
    terrainEnabled: false,
    visibility: {
      points: true,
      linework: true,
      parcels: true,
      survey: true,
      constraints: true,
      labels: true,
      frontage: true,
      buildable: true,
    },
  };
}

function mergeSelection(
  selections: Record<string, SharedMapSelection>,
  scope: string,
  patch: Partial<SharedMapSelection>,
) {
  return {
    ...selections,
    [scope]: {
      ...defaultSelection(),
      ...selections[scope],
      ...patch,
    },
  };
}

export const useSharedMapStateStore = create<SharedMapState>()(
  persist(
    (set) => ({
      selections: {},
      setBasemap: (scope, basemap) =>
        set((state) => ({
          selections: mergeSelection(state.selections, scope, { basemap }),
        })),
      toggleLayer: (scope, key) =>
        set((state) => {
          const current = state.selections[scope] ?? defaultSelection();
          return {
            selections: mergeSelection(state.selections, scope, {
              visibility: {
                ...current.visibility,
                [key]: !current.visibility[key],
              },
            }),
          };
        }),
      setLayerVisible: (scope, key, visible) =>
        set((state) => {
          const current = state.selections[scope] ?? defaultSelection();
          return {
            selections: mergeSelection(state.selections, scope, {
              visibility: {
                ...current.visibility,
                [key]: visible,
              },
            }),
          };
        }),
      toggleTerrain: (scope) =>
        set((state) => {
          const current = state.selections[scope] ?? defaultSelection();
          return {
            selections: mergeSelection(state.selections, scope, {
              terrainEnabled: !current.terrainEnabled,
            }),
          };
        }),
      toggleHillshade: (scope) =>
        set((state) => {
          const current = state.selections[scope] ?? defaultSelection();
          return {
            selections: mergeSelection(state.selections, scope, {
              hillshadeEnabled: !current.hillshadeEnabled,
            }),
          };
        }),
      triggerFit: (scope) =>
        set((state) => {
          const current = state.selections[scope] ?? defaultSelection();
          return {
            selections: mergeSelection(state.selections, scope, { fitNonce: current.fitNonce + 1 }),
          };
        }),
    }),
    {
      name: "landportal-shared-map-state",
      partialize: (state) => ({ selections: state.selections }),
    },
  ),
);

export function useSharedMapState(scope: string) {
  const selection = useSharedMapStateStore((state) => state.selections[scope]);
  const setBasemap = useSharedMapStateStore((state) => state.setBasemap);
  const toggleLayer = useSharedMapStateStore((state) => state.toggleLayer);
  const toggleTerrain = useSharedMapStateStore((state) => state.toggleTerrain);
  const toggleHillshade = useSharedMapStateStore((state) => state.toggleHillshade);
  const triggerFit = useSharedMapStateStore((state) => state.triggerFit);

  const resolved = selection ?? defaultSelection();

  return {
    basemap: resolved.basemap,
    fitNonce: resolved.fitNonce,
    hillshadeEnabled: resolved.hillshadeEnabled,
    terrainEnabled: resolved.terrainEnabled,
    visibility: resolved.visibility,
    setBasemap: (basemap: BasemapKey) => setBasemap(scope, basemap),
    toggleHillshade: () => toggleHillshade(scope),
    toggleLayer: (key: string) => toggleLayer(scope, key),
    toggleTerrain: () => toggleTerrain(scope),
    triggerFit: () => triggerFit(scope),
  };
}
