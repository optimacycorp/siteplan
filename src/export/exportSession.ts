import { useDrawingStore } from "../state/drawingStore";
import { useGisLayerStore } from "../state/gisLayerStore";
import { usePointImportStore } from "../state/pointImportStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import type { BasemapKey } from "../map/basemapRegistry";
import type { PlotMode, PlotPageSize, PlotScaleFeetPerInch } from "./plotSheet";
import type { DrawingFeature } from "../types/drawing";
import type { ImportedPoint, LocalPointTransform } from "../types/fieldPoint";
import type { GisLayer } from "../types/gisLayer";
import type { ParcelDetail, ParcelNeighbor } from "../types/parcel";

const EXPORT_SESSION_KEY = "optimacy-quicksite-export-session";

export type ExportSessionPayload = {
  basemap: string;
  exportMode?: "default" | "streets-context" | "streets-detail" | "satellite";
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
    pageSize: PlotPageSize;
    plotMode: PlotMode;
    plotScaleFeetPerInch: PlotScaleFeetPerInch;
  };
  layerVisibility: Record<string, boolean>;
  drawings: DrawingFeature[];
  gisLayers: GisLayer[];
  selectedGisLayerId: string | null;
  importedPoints: ImportedPoint[];
  selectedPointId: string | null;
  pointTransform: LocalPointTransform;
};

export function createExportSessionPayload(options?: {
  basemap?: BasemapKey;
  exportMode?: ExportSessionPayload["exportMode"];
}): ExportSessionPayload {
  const quickSiteState = useQuickSiteStore.getState();
  const drawingState = useDrawingStore.getState();
  const pointImportState = usePointImportStore.getState();
  const gisLayerState = useGisLayerStore.getState();

  return {
    basemap: options?.basemap ?? quickSiteState.basemap,
    exportMode: options?.exportMode ?? "default",
    selectedParcel: quickSiteState.selectedParcel,
    neighbors: quickSiteState.neighbors,
    mapView: quickSiteState.mapView,
    terrainSettings: quickSiteState.terrainSettings,
    exportMeta: quickSiteState.exportMeta,
    layerVisibility: quickSiteState.layerVisibility,
    drawings: drawingState.drawings,
    gisLayers: gisLayerState.layers,
    selectedGisLayerId: gisLayerState.selectedLayerId,
    importedPoints: pointImportState.importedPoints,
    selectedPointId: pointImportState.selectedPointId,
    pointTransform: pointImportState.transform,
  };
}

export function saveExportSession(payload: ExportSessionPayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EXPORT_SESSION_KEY, JSON.stringify(payload));
}

export function readExportSession(): ExportSessionPayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(EXPORT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExportSessionPayload;
  } catch {
    return null;
  }
}
