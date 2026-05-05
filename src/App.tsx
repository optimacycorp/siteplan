import { AddressSearch } from "./components/AddressSearch";
import { AppShell } from "./components/AppShell";
import { DevStatusPanel } from "./components/DevStatusPanel";
import { DrawingToolbar } from "./components/DrawingToolbar";
import { ExportSheetPanel } from "./components/ExportSheetPanel";
import { ExportOnlyApp } from "./components/ExportOnlyApp";
import { FeatureListPanel } from "./components/FeatureListPanel";
import { LayerPanel } from "./components/LayerPanel";
import { ParcelSummary } from "./components/ParcelSummary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { SelectedParcelCard } from "./components/SelectedParcelCard";
import { TerrainSummary } from "./components/TerrainSummary";
import { WorkflowSteps } from "./components/WorkflowSteps";
import { QuickMapCanvas } from "./map/QuickMapCanvas";
import { useEffect } from "react";
import { useQuickSiteStore } from "./state/quickSiteStore";
import { useDrawingStore } from "./state/drawingStore";

export function App() {
  const isExportView =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("export") === "1";

  if (isExportView) {
    return <ExportOnlyApp />;
  }

  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const drawingCount = useDrawingStore((state) => state.drawings.length);
  const selectedDrawingId = useDrawingStore((state) => state.selectedDrawingId);
  const clearActiveFeature = useDrawingStore((state) => state.clearActiveFeature);
  const completeActiveFeature = useDrawingStore((state) => state.completeActiveFeature);
  const deleteSelected = useDrawingStore((state) => state.deleteSelected);
  const deleteSelectedVertex = useDrawingStore((state) => state.deleteSelectedVertex);
  const selectDrawing = useDrawingStore((state) => state.selectDrawing);
  const selectVertex = useDrawingStore((state) => state.selectVertex);
  const selectedVertex = useDrawingStore((state) => state.selectedVertex);
  const clearSelectedParcel = useQuickSiteStore((state) => state.clearSelectedParcel);
  const exportReady = Boolean(selectedParcel) && drawingCount > 0;
  const subtitle = !selectedParcel
    ? "Search for a property to begin."
    : drawingCount > 0
      ? "Ready to preview or export."
      : "Draw the proposed improvement or add a label.";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        clearActiveFeature();
        selectDrawing(null);
        selectVertex(null);
        return;
      }

      if (event.key === "Enter") {
        completeActiveFeature();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedVertex) {
          deleteSelectedVertex();
        } else if (selectedDrawingId) {
          deleteSelected();
        } else if (selectedParcel) {
          clearSelectedParcel();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clearActiveFeature,
    clearSelectedParcel,
    completeActiveFeature,
    deleteSelected,
    deleteSelectedVertex,
    selectedDrawingId,
    selectedParcel,
    selectedVertex,
    selectDrawing,
    selectVertex,
  ]);

  return (
    <AppShell
      subtitle={subtitle}
      exportReady={exportReady}
      left={
        <>
          <WorkflowSteps />
          <AddressSearch />
          <SelectedParcelCard />
          <DrawingToolbar />
          <LayerPanel />
          <TerrainSummary />
        </>
      }
      map={
        <>
          <QuickMapCanvas />
        </>
      }
      right={
        <>
          {selectedParcel ? <ParcelSummary /> : null}
          {selectedParcel ? <FeatureListPanel /> : null}
          {exportReady ? <ExportSheetPanel /> : null}
          {selectedDrawingId ? <PropertiesPanel /> : null}
          <DevStatusPanel />
        </>
      }
    />
  );
}
