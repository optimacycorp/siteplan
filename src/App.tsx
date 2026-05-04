import { AddressSearch } from "./components/AddressSearch";
import { AppShell } from "./components/AppShell";
import { DevStatusPanel } from "./components/DevStatusPanel";
import { DrawingToolbar } from "./components/DrawingToolbar";
import { ExportSheetPanel } from "./components/ExportSheetPanel";
import { ExportOnlyApp } from "./components/ExportOnlyApp";
import { LayerPanel } from "./components/LayerPanel";
import { ParcelSummary } from "./components/ParcelSummary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { PrintPlanSheet } from "./components/PrintPlanSheet";
import { SelectedParcelCard } from "./components/SelectedParcelCard";
import { WorkflowSteps } from "./components/WorkflowSteps";
import { QuickMapCanvas } from "./map/QuickMapCanvas";
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
  const exportReady = Boolean(selectedParcel) && drawingCount > 0;
  const subtitle = !selectedParcel
    ? "Search for a property to begin."
    : drawingCount > 0
      ? "Ready to preview or export."
      : "Draw the proposed improvement or add a label.";

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
        </>
      }
      map={
        <>
          <QuickMapCanvas />
          <PrintPlanSheet />
        </>
      }
      right={
        <>
          <ParcelSummary />
          <ExportSheetPanel />
          <PropertiesPanel />
          <DevStatusPanel />
        </>
      }
    />
  );
}
