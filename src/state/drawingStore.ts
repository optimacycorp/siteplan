import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DrawingFeature, DrawingFeatureType, DrawingMode, LngLatPoint } from "../types/drawing";

type DrawingState = {
  mode: DrawingMode;
  activePoints: LngLatPoint[];
  drawings: DrawingFeature[];
  selectedDrawingId: string | null;
  selectedVertex: { drawingId: string; pointIndex: number } | null;
  setMode: (mode: DrawingMode) => void;
  addPoint: (point: LngLatPoint) => void;
  setActivePoints: (points: LngLatPoint[]) => void;
  completeActiveFeature: () => void;
  undoActivePoint: () => void;
  clearActiveFeature: () => void;
  deleteSelected: () => void;
  selectDrawing: (id: string | null) => void;
  renameSelected: (label: string) => void;
  selectVertex: (vertex: { drawingId: string; pointIndex: number } | null) => void;
  updateDrawingPoint: (drawingId: string, pointIndex: number, point: LngLatPoint) => void;
  insertDrawingPoint: (drawingId: string, pointIndex: number, point: LngLatPoint) => void;
  deleteSelectedVertex: () => void;
};

const canComplete = (mode: DrawingMode, points: LngLatPoint[]) => {
  if (mode === "label-point") return points.length >= 1;
  if (mode === "structure-polygon") return points.length >= 3;
  return points.length >= 2;
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
      setMode: (mode) => set({ mode, activePoints: [], selectedVertex: null }),
      addPoint: (point) => {
        const { mode, activePoints } = get();
        if (mode === "select") return;
        set({ activePoints: [...activePoints, point] });
      },
      setActivePoints: (activePoints) => set({ activePoints }),
      completeActiveFeature: () => {
        const { mode, activePoints, drawings } = get();
        if (mode === "select" || !canComplete(mode, activePoints)) return;
        const nextIndex = drawings.filter((drawing) => drawing.type === mode).length + 1;
        const feature: DrawingFeature = {
          id: crypto.randomUUID(),
          type: mode,
          label: createDefaultLabel(mode, nextIndex),
          points: activePoints,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          drawings: [...state.drawings, feature],
          activePoints: [],
          selectedDrawingId: feature.id,
        }));
      },
      undoActivePoint: () => set((state) => ({ activePoints: state.activePoints.slice(0, -1) })),
      clearActiveFeature: () => set({ activePoints: [] }),
      deleteSelected: () =>
        set((state) => ({
          drawings: state.drawings.filter((drawing) => drawing.id !== state.selectedDrawingId),
          selectedDrawingId: null,
          selectedVertex: null,
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
        }));
      },
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
