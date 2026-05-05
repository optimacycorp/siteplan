import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import type { BasemapKey } from "../map/basemapRegistry";
import type { DrawingFeature } from "../types/drawing";
import type { ParcelDetail, ParcelNeighbor } from "../types/parcel";

const EXPORT_SESSION_KEY = "optimacy-quicksite-export-session";

export type ExportSessionPayload = {
  basemap: string;
  selectedParcel: ParcelDetail | null;
  neighbors: ParcelNeighbor[];
  mapView: { center: [number, number]; zoom: number };
  terrainSettings: {
    contourOpacity: number;
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
  drawings: DrawingFeature[];
};

export function createExportSessionPayload(options?: { basemap?: BasemapKey }): ExportSessionPayload {
  const quickSiteState = useQuickSiteStore.getState();
  const drawingState = useDrawingStore.getState();

  return {
    basemap: options?.basemap ?? quickSiteState.basemap,
    selectedParcel: quickSiteState.selectedParcel,
    neighbors: quickSiteState.neighbors,
    mapView: quickSiteState.mapView,
    terrainSettings: quickSiteState.terrainSettings,
    exportMeta: quickSiteState.exportMeta,
    layerVisibility: quickSiteState.layerVisibility,
    drawings: drawingState.drawings,
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
