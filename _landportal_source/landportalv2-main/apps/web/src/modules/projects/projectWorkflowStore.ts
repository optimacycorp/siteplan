import { create } from "zustand";
import { persist } from "zustand/middleware";

import { overlayRegistry } from "@landportal/map-core";

export type DesignConsoleTab = "parcel" | "subdivision" | "site" | "overlays" | "block" | "sheet";

type ProjectWorkflowSelection = {
  parcelId?: string;
  recentParcelIds?: string[];
  layoutId?: string;
  compareLayoutId?: string;
  scenarioId?: string;
  compareScenarioId?: string;
  activeTab?: DesignConsoleTab;
  searchQuery?: string;
  minorInterval?: number;
  majorEvery?: number;
  showContourLabels?: boolean;
  contoursGenerated?: boolean;
  overlaySettings?: Record<string, { visible: boolean; opacity: number }>;
};

type ProjectWorkflowState = {
  selections: Record<string, ProjectWorkflowSelection>;
  setParcelId: (projectId: string, parcelId?: string) => void;
  pushRecentParcelId: (projectId: string, parcelId: string) => void;
  setLayoutId: (projectId: string, layoutId?: string) => void;
  setCompareLayoutId: (projectId: string, layoutId?: string) => void;
  setScenarioId: (projectId: string, scenarioId?: string) => void;
  setCompareScenarioId: (projectId: string, scenarioId?: string) => void;
  setActiveTab: (projectId: string, tab: DesignConsoleTab) => void;
  setSearchQuery: (projectId: string, query: string) => void;
  setMinorInterval: (projectId: string, value: number) => void;
  setMajorEvery: (projectId: string, value: number) => void;
  setShowContourLabels: (projectId: string, value: boolean) => void;
  setContoursGenerated: (projectId: string, value: boolean) => void;
  setOverlayVisible: (projectId: string, key: string, visible: boolean) => void;
  setOverlayOpacity: (projectId: string, key: string, opacity: number) => void;
  clearProject: (projectId: string) => void;
};

function updateSelection(
  selections: Record<string, ProjectWorkflowSelection>,
  projectId: string,
  patch: Partial<ProjectWorkflowSelection>,
) {
  return {
    ...selections,
    [projectId]: {
      ...defaultProjectConsoleSelection(),
      ...selections[projectId],
      ...patch,
    },
  };
}

function defaultProjectConsoleSelection(): ProjectWorkflowSelection {
  return {
    activeTab: "parcel",
    contoursGenerated: false,
    majorEvery: 5,
    minorInterval: 2,
    overlaySettings: Object.fromEntries(
      overlayRegistry.map((overlay) => [overlay.key, { visible: overlay.defaultVisible, opacity: overlay.defaultOpacity }]),
    ),
    searchQuery: "",
    showContourLabels: true,
  };
}

function resolveOverlaySetting(
  current: ProjectWorkflowSelection,
  key: string,
): { visible: boolean; opacity: number } {
  const fallback = overlayRegistry.find((overlay) => overlay.key === key);
  return current.overlaySettings?.[key] ?? {
    visible: fallback?.defaultVisible ?? true,
    opacity: fallback?.defaultOpacity ?? 1,
  };
}

export const useProjectWorkflowStore = create<ProjectWorkflowState>()(
  persist(
    (set) => ({
      selections: {},
      setParcelId: (projectId, parcelId) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { parcelId }),
        })),
      pushRecentParcelId: (projectId, parcelId) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultProjectConsoleSelection();
          const recentParcelIds = [
            parcelId,
            ...(current.recentParcelIds ?? []).filter((entry) => entry !== parcelId),
          ].slice(0, 6);

          return {
            selections: updateSelection(state.selections, projectId, { recentParcelIds }),
          };
        }),
      setLayoutId: (projectId, layoutId) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { layoutId }),
        })),
      setCompareLayoutId: (projectId, compareLayoutId) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { compareLayoutId }),
        })),
      setScenarioId: (projectId, scenarioId) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { scenarioId }),
        })),
      setCompareScenarioId: (projectId, compareScenarioId) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { compareScenarioId }),
        })),
      setActiveTab: (projectId, activeTab) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { activeTab }),
        })),
      setSearchQuery: (projectId, searchQuery) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { searchQuery }),
        })),
      setMinorInterval: (projectId, minorInterval) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { minorInterval }),
        })),
      setMajorEvery: (projectId, majorEvery) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { majorEvery }),
        })),
      setShowContourLabels: (projectId, showContourLabels) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { showContourLabels }),
        })),
      setContoursGenerated: (projectId, contoursGenerated) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { contoursGenerated }),
        })),
      setOverlayVisible: (projectId, key, visible) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultProjectConsoleSelection();
          const existing = resolveOverlaySetting(current, key);
          return {
            selections: updateSelection(state.selections, projectId, {
              overlaySettings: {
                ...current.overlaySettings,
                [key]: { visible, opacity: existing.opacity },
              },
            }),
          };
        }),
      setOverlayOpacity: (projectId, key, opacity) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultProjectConsoleSelection();
          const existing = resolveOverlaySetting(current, key);
          return {
            selections: updateSelection(state.selections, projectId, {
              overlaySettings: {
                ...current.overlaySettings,
                [key]: { visible: existing.visible, opacity },
              },
            }),
          };
        }),
      clearProject: (projectId) =>
        set((state) => {
          const next = { ...state.selections };
          delete next[projectId];
          return { selections: next };
        }),
    }),
    {
      name: "landportal-project-workflow",
      partialize: (state) => ({ selections: state.selections }),
    },
  ),
);
