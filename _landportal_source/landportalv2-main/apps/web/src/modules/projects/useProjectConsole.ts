import { useMemo } from "react";

import { overlayRegistry, type OverlayCategory, type OverlayDefinition } from "@landportal/map-core";

import { useProjectWorkflowStore, type DesignConsoleTab } from "./projectWorkflowStore";

export type ProjectConsoleOverlaySettings = Record<string, { visible: boolean; opacity: number }>;
export type GroupedConsoleOverlays = Record<OverlayCategory, OverlayDefinition[]>;

function defaultOverlaySettings(): ProjectConsoleOverlaySettings {
  return Object.fromEntries(
    overlayRegistry.map((overlay) => [overlay.key, { visible: overlay.defaultVisible, opacity: overlay.defaultOpacity }]),
  );
}

function groupedOverlays(): GroupedConsoleOverlays {
  return overlayRegistry.reduce<GroupedConsoleOverlays>((acc, overlay) => {
    acc[overlay.category] = [...acc[overlay.category], overlay];
    return acc;
  }, { parcel: [], constraint: [], site: [], survey: [] });
}

export function useProjectConsole(projectId: string) {
  const selection = useProjectWorkflowStore((state) => state.selections[projectId]);
  const setActiveTab = useProjectWorkflowStore((state) => state.setActiveTab);
  const setSearchQuery = useProjectWorkflowStore((state) => state.setSearchQuery);
  const setMinorInterval = useProjectWorkflowStore((state) => state.setMinorInterval);
  const setMajorEvery = useProjectWorkflowStore((state) => state.setMajorEvery);
  const setShowContourLabels = useProjectWorkflowStore((state) => state.setShowContourLabels);
  const setContoursGenerated = useProjectWorkflowStore((state) => state.setContoursGenerated);
  const setOverlayVisible = useProjectWorkflowStore((state) => state.setOverlayVisible);
  const setOverlayOpacity = useProjectWorkflowStore((state) => state.setOverlayOpacity);

  return useMemo(() => ({
    activeTab: selection?.activeTab ?? "parcel",
    contoursGenerated: selection?.contoursGenerated ?? false,
    grouped: groupedOverlays(),
    majorEvery: selection?.majorEvery ?? 5,
    minorInterval: selection?.minorInterval ?? 2,
    overlaySettings: selection?.overlaySettings ?? defaultOverlaySettings(),
    searchQuery: selection?.searchQuery ?? "",
    setActiveTab: (tab: DesignConsoleTab) => setActiveTab(projectId, tab),
    setContoursGenerated: (value: boolean) => setContoursGenerated(projectId, value),
    setMajorEvery: (value: number) => setMajorEvery(projectId, value),
    setMinorInterval: (value: number) => setMinorInterval(projectId, value),
    setOverlayOpacity: (key: string, opacity: number) => setOverlayOpacity(projectId, key, opacity),
    setOverlayVisible: (key: string, visible: boolean) => setOverlayVisible(projectId, key, visible),
    setSearchQuery: (query: string) => setSearchQuery(projectId, query),
    setShowContourLabels: (value: boolean) => setShowContourLabels(projectId, value),
    showContourLabels: selection?.showContourLabels ?? true,
    toggleOverlay: (key: string) => setOverlayVisible(projectId, key, !(selection?.overlaySettings ?? defaultOverlaySettings())[key]?.visible),
  }), [
    projectId,
    selection?.activeTab,
    selection?.contoursGenerated,
    selection?.majorEvery,
    selection?.minorInterval,
    selection?.overlaySettings,
    selection?.searchQuery,
    selection?.showContourLabels,
    setActiveTab,
    setContoursGenerated,
    setMajorEvery,
    setMinorInterval,
    setOverlayOpacity,
    setOverlayVisible,
    setSearchQuery,
    setShowContourLabels,
  ]);
}
