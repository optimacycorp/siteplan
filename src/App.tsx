import { AddressSearch } from "./components/AddressSearch";
import { AppShell } from "./components/AppShell";
import { DrawingToolbar } from "./components/DrawingToolbar";
import { LayerPanel } from "./components/LayerPanel";
import { ParcelSummary } from "./components/ParcelSummary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { QuickMapCanvas } from "./map/QuickMapCanvas";

export function App() {
  return (
    <AppShell
      left={
        <>
          <AddressSearch />
          <DrawingToolbar />
          <LayerPanel />
        </>
      }
      map={<QuickMapCanvas />}
      right={
        <>
          <ParcelSummary />
          <PropertiesPanel />
        </>
      }
    />
  );
}
