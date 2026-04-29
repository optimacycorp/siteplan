import { create } from "zustand";
import type { DrawingFeature, DrawingMode, LngLatPoint } from "../types/drawing";

type DrawingState = {
  mode: DrawingMode;
  activePoints: LngLatPoint[];
  drawings: DrawingFeature[];
  selectedDrawingId: string | null;
  setMode: (mode: DrawingMode) => void;
  addPoint: (point: LngLatPoint) => void;
  completeActiveFeature: () => void;
  deleteSelected: () => void;
  selectDrawing: (id: string | null) => void;
};

const canComplete = (mode: DrawingMode, points: LngLatPoint[]) => {
  if (mode === "label-point") return points.length >= 1;
  if (mode === "structure-polygon") return points.length >= 3;
  return points.length >= 2;
};

export const useDrawingStore = create<DrawingState>((set, get) => ({
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
  completeActiveFeature: () => {
    const { mode, activePoints } = get();
    if (!canComplete(mode, activePoints)) return;
    const feature: DrawingFeature = {
      id: crypto.randomUUID(),
      type: mode,
      label: mode.replace("-", " "),
      points: activePoints,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ drawings: [...state.drawings, feature], activePoints: [], selectedDrawingId: feature.id }));
  },
  deleteSelected: () => set((state) => ({ drawings: state.drawings.filter((d) => d.id !== state.selectedDrawingId), selectedDrawingId: null })),
  selectDrawing: (selectedDrawingId) => set({ selectedDrawingId }),
}));
