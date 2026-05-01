import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DrawingFeature, DrawingFeatureType, DrawingMode, LngLatPoint } from "../types/drawing";

type DrawingState = {
  mode: DrawingMode;
  activePoints: LngLatPoint[];
  drawings: DrawingFeature[];
  selectedDrawingId: string | null;
  setMode: (mode: DrawingMode) => void;
  addPoint: (point: LngLatPoint) => void;
  setActivePoints: (points: LngLatPoint[]) => void;
  completeActiveFeature: () => void;
  undoActivePoint: () => void;
  clearActiveFeature: () => void;
  deleteSelected: () => void;
  selectDrawing: (id: string | null) => void;
  renameSelected: (label: string) => void;
  updateDrawingPoint: (drawingId: string, pointIndex: number, point: LngLatPoint) => void;
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
      setMode: (mode) => set({ mode, activePoints: [] }),
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
        })),
      selectDrawing: (selectedDrawingId) => set({ selectedDrawingId }),
      renameSelected: (label) =>
        set((state) => ({
          drawings: state.drawings.map((drawing) =>
            drawing.id === state.selectedDrawingId
              ? { ...drawing, label: label.trim() || drawing.label }
              : drawing,
          ),
        })),
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
