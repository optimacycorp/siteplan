import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ImportedPoint, LocalPointTransform, ParsedFieldPointRow } from "../types/fieldPoint";
import { parseFieldPointCsv } from "../utils/fieldPointCsv";
import { transformLocalRows } from "../utils/localCoordinateTransform";

type PointImportState = {
  transform: LocalPointTransform;
  previewRows: ParsedFieldPointRow[];
  previewPoints: ImportedPoint[];
  importedPoints: ImportedPoint[];
  importError: string;
  selectedPointId: string | null;
  parseCsvText: (text: string) => void;
  setTransform: (patch: Partial<LocalPointTransform>) => void;
  setOriginFromLngLat: (lng: number, lat: number, label?: string) => void;
  previewTransformedPoints: () => void;
  commitPreviewPoints: () => void;
  deletePoint: (id: string) => void;
  clearPoints: () => void;
  selectPoint: (id: string | null) => void;
  hydrateExportSession: (payload: {
    importedPoints: ImportedPoint[];
    transform: LocalPointTransform;
  }) => void;
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

const defaultTransform: LocalPointTransform = {
  mode: "local-xy",
  units: "feet",
  origin: null,
  rotationDegrees: 0,
  scaleFactor: 1,
};

function toImportedPoint(
  row: ParsedFieldPointRow,
  transformed: { lng: number; lat: number },
): ImportedPoint {
  return {
    id: crypto.randomUUID(),
    pointNumber: row.pointNumber,
    name: row.name,
    code: row.code,
    note: row.note,
    northing: row.northing,
    easting: row.easting,
    elevation: row.elevation,
    lng: transformed.lng,
    lat: transformed.lat,
    source: "local-csv",
    createdAt: new Date().toISOString(),
  };
}

export const usePointImportStore = create<PointImportState>()(
  persist(
    (set, get) => ({
      transform: defaultTransform,
      previewRows: [],
      previewPoints: [],
      importedPoints: [],
      importError: "",
      selectedPointId: null,
      parseCsvText: (text) => {
        const parsed = parseFieldPointCsv(text);
        set({
          previewRows: parsed.rows,
          previewPoints: [],
          importError: parsed.errors.join(" "),
        });
      },
      setTransform: (patch) =>
        set((state) => ({
          transform: {
            ...state.transform,
            ...patch,
            origin: patch.origin === undefined ? state.transform.origin : patch.origin,
          },
          importError: "",
        })),
      setOriginFromLngLat: (lng, lat, label = "Map origin") =>
        set((state) => ({
          transform: {
            ...state.transform,
            origin: { lng, lat, label },
          },
          importError: "",
        })),
      previewTransformedPoints: () => {
        const { previewRows, transform } = get();
        if (!transform.origin) {
          set({ importError: "Choose an origin before previewing imported points." });
          return;
        }
        if (!previewRows.length) {
          set({ importError: "Paste or load a CSV before previewing points." });
          return;
        }

        const transformed = transformLocalRows(previewRows, transform);
        set({
          previewPoints: transformed.map(({ row, lng, lat }) => toImportedPoint(row, { lng, lat })),
          importError: "",
        });
      },
      commitPreviewPoints: () => {
        const { previewPoints } = get();
        if (!previewPoints.length) {
          set({ importError: "Preview points first before saving them to the plan." });
          return;
        }
        set((state) => ({
          importedPoints: [...state.importedPoints, ...state.previewPoints],
          previewPoints: [],
          previewRows: [],
          importError: "",
          selectedPointId: state.previewPoints[0]?.id ?? state.selectedPointId,
        }));
      },
      deletePoint: (id) =>
        set((state) => ({
          importedPoints: state.importedPoints.filter((point) => point.id !== id),
          selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
        })),
      clearPoints: () =>
        set({
          previewRows: [],
          previewPoints: [],
          importedPoints: [],
          importError: "",
          selectedPointId: null,
        }),
      selectPoint: (selectedPointId) => set({ selectedPointId }),
      hydrateExportSession: (payload) =>
        set({
          importedPoints: payload.importedPoints,
          transform: payload.transform,
          previewRows: [],
          previewPoints: [],
          importError: "",
          selectedPointId: null,
        }),
      resetSession: () =>
        set({
          transform: defaultTransform,
          previewRows: [],
          previewPoints: [],
          importedPoints: [],
          importError: "",
          selectedPointId: null,
        }),
    }),
    {
      name: "optimacy-quicksite-field-points",
      storage: createJSONStorage(safeStorage),
      partialize: (state) => ({
        transform: state.transform,
        importedPoints: state.importedPoints,
        selectedPointId: state.selectedPointId,
      }),
    },
  ),
);
