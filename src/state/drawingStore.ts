import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DrawingFeature, DrawingFeatureType, DrawingMode, LngLatPoint } from "../types/drawing";
import { summarizeDrawingFeature } from "../map/mapUtils";

type DrawingState = {
  mode: DrawingMode;
  activePoints: LngLatPoint[];
  drawings: DrawingFeature[];
  selectedDrawingId: string | null;
  selectedVertex: { drawingId: string; pointIndex: number } | null;
  validationMessage: string;
  setMode: (mode: DrawingMode) => void;
  addPoint: (point: LngLatPoint) => void;
  setActivePoints: (points: LngLatPoint[]) => void;
  completeActiveFeature: () => void;
  undoActivePoint: () => void;
  clearActiveFeature: () => void;
  deleteSelected: () => void;
  deleteDrawingById: (id: string) => void;
  duplicateDrawingById: (id: string) => void;
  renameDrawingById: (id: string, label: string) => void;
  selectDrawing: (id: string | null) => void;
  renameSelected: (label: string) => void;
  selectVertex: (vertex: { drawingId: string; pointIndex: number } | null) => void;
  updateDrawingPoint: (drawingId: string, pointIndex: number, point: LngLatPoint) => void;
  insertDrawingPoint: (drawingId: string, pointIndex: number, point: LngLatPoint) => void;
  deleteSelectedVertex: () => void;
  setValidationMessage: (message: string) => void;
  resetSession: () => void;
  hydrateExportSession: (payload: { drawings: DrawingFeature[] }) => void;
};

function createDefaultLabel(type: DrawingFeatureType, index: number) {
  const names: Record<DrawingFeatureType, string> = {
    "structure-polygon": "Proposed structure",
    "driveway-line": "Driveway",
    "easement-line": "Easement",
    "dimension-line": "Dimension",
    "label-point": "Label",
  };
  return `${names[type]} ${index}`;
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      mode: "select",
      activePoints: [],
      drawings: [],
      selectedDrawingId: null,
      selectedVertex: null,
      validationMessage: "",
      setMode: (mode) => set({ mode, activePoints: [], selectedVertex: null, validationMessage: "" }),
      addPoint: (point) => {
        const { mode, activePoints } = get();
        if (mode === "select") return;
        set({ activePoints: [...activePoints, point], validationMessage: "" });
      },
      setActivePoints: (activePoints) => set({ activePoints, validationMessage: "" }),
      completeActiveFeature: () => {
        const { mode, activePoints, drawings } = get();
        if (mode === "select") return;
        const nextIndex = drawings.filter((drawing) => drawing.type === mode).length + 1;
        const feature: DrawingFeature = {
          id: crypto.randomUUID(),
          type: mode,
          label: createDefaultLabel(mode, nextIndex),
          points: activePoints,
          createdAt: new Date().toISOString(),
        };
        const summary = summarizeDrawingFeature(feature);
        if (!summary.isValid) {
          set({ validationMessage: summary.warning || "Finish the feature before completing it." });
          return;
        }
        set((state) => ({
          drawings: [...state.drawings, feature],
          activePoints: [],
          selectedDrawingId: feature.id,
          selectedVertex: null,
          validationMessage: "",
        }));
      },
      undoActivePoint: () => set((state) => ({ activePoints: state.activePoints.slice(0, -1), validationMessage: "" })),
      clearActiveFeature: () => set({ activePoints: [], validationMessage: "" }),
      deleteSelected: () =>
        set((state) => ({
          drawings: state.drawings.filter((drawing) => drawing.id !== state.selectedDrawingId),
          selectedDrawingId: null,
          selectedVertex: null,
          validationMessage: "",
        })),
      deleteDrawingById: (id) =>
        set((state) => ({
          drawings: state.drawings.filter((drawing) => drawing.id !== id),
          selectedDrawingId: state.selectedDrawingId === id ? null : state.selectedDrawingId,
          selectedVertex: state.selectedVertex?.drawingId === id ? null : state.selectedVertex,
        })),
      duplicateDrawingById: (id) =>
        set((state) => {
          const source = state.drawings.find((drawing) => drawing.id === id);
          if (!source) return state;
          const typeCount = state.drawings.filter((drawing) => drawing.type === source.type).length + 1;
          const duplicate: DrawingFeature = {
            ...source,
            id: crypto.randomUUID(),
            label: `${createDefaultLabel(source.type, typeCount)} copy`,
            points: source.points.map((point) => ({ ...point })),
            createdAt: new Date().toISOString(),
          };
          return {
            ...state,
            drawings: [...state.drawings, duplicate],
            selectedDrawingId: duplicate.id,
            selectedVertex: null,
          };
        }),
      renameDrawingById: (id, label) =>
        set((state) => ({
          drawings: state.drawings.map((drawing) =>
            drawing.id === id ? { ...drawing, label: label.trim() || drawing.label } : drawing,
          ),
        })),
      selectDrawing: (selectedDrawingId) =>
        set((state) => ({
          selectedDrawingId,
          selectedVertex:
            state.selectedVertex?.drawingId === selectedDrawingId ? state.selectedVertex : null,
        })),
      renameSelected: (label) =>
        set((state) => ({
          drawings: state.drawings.map((drawing) =>
            drawing.id === state.selectedDrawingId
              ? { ...drawing, label: label.trim() || drawing.label }
              : drawing,
          ),
        })),
      selectVertex: (selectedVertex) => set({ selectedVertex }),
      updateDrawingPoint: (drawingId, pointIndex, point) =>
        set((state) => ({
          drawings: state.drawings.map((drawing) =>
            drawing.id !== drawingId
              ? drawing
              : {
                  ...drawing,
                  points: drawing.points.map((existingPoint, index) =>
                    index === pointIndex ? point : existingPoint,
                  ),
                },
          ),
          validationMessage: "",
        })),
      insertDrawingPoint: (drawingId, pointIndex, point) =>
        set((state) => ({
          drawings: state.drawings.map((drawing) =>
            drawing.id !== drawingId
              ? drawing
              : {
                  ...drawing,
                  points: [
                    ...drawing.points.slice(0, pointIndex),
                    point,
                    ...drawing.points.slice(pointIndex),
                  ],
                },
          ),
          selectedDrawingId: drawingId,
          selectedVertex: { drawingId, pointIndex },
          validationMessage: "",
        })),
      deleteSelectedVertex: () => {
        const { selectedVertex, drawings } = get();
        if (!selectedVertex) return;
        const drawing = drawings.find((entry) => entry.id === selectedVertex.drawingId);
        if (!drawing) return;

        const minimumPoints =
          drawing.type === "structure-polygon"
            ? 3
            : drawing.type === "label-point"
              ? 1
              : 2;

        if (drawing.points.length <= minimumPoints) return;

        set((state) => ({
          drawings: state.drawings.map((entry) =>
            entry.id !== selectedVertex.drawingId
              ? entry
              : {
                  ...entry,
                  points: entry.points.filter((_, index) => index !== selectedVertex.pointIndex),
                },
          ),
          selectedVertex: null,
          validationMessage: "",
        }));
      },
      setValidationMessage: (validationMessage) => set({ validationMessage }),
      resetSession: () =>
        set({
          mode: "select",
          activePoints: [],
          drawings: [],
          selectedDrawingId: null,
          selectedVertex: null,
          validationMessage: "",
        }),
      hydrateExportSession: (payload) =>
        set({
          mode: "select",
          activePoints: [],
          drawings: payload.drawings,
          selectedDrawingId: null,
          selectedVertex: null,
          validationMessage: "",
        }),
    }),
    {
      name: "optimacy-quicksite-drawings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        drawings: state.drawings,
        selectedDrawingId: state.selectedDrawingId,
      }),
    },
  ),
);
