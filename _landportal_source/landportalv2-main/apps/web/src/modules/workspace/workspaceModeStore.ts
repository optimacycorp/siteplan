import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceMode = "developer" | "acquisition" | "builder" | "surveyor";

export const workspaceModeMeta: Record<WorkspaceMode, { label: string; description: string; defaultPath: string; badge: string }> = {
  developer: {
    label: "Land Developer",
    description: "Lead with subdivision concepts, lot counts, and open-space tradeoffs.",
    defaultPath: "/app/subdivision",
    badge: "Designer-first",
  },
  acquisition: {
    label: "Land Acquisition",
    description: "Start from parcel risk, yield potential, and decision-ready diligence.",
    defaultPath: "/app/yield",
    badge: "Yield-first",
  },
  builder: {
    label: "Builder / GC",
    description: "Focus on site planning, circulation, utilities, and printable plan output.",
    defaultPath: "/app/site-planner",
    badge: "Plan-first",
  },
  surveyor: {
    label: "Surveyor",
    description: "Keep precision mapping and traverse tools available in Advanced Survey.",
    defaultPath: "/app/advanced/survey",
    badge: "Advanced mode",
  },
};

type WorkspaceModeState = {
  mode: WorkspaceMode | null;
  chooserOpen: boolean;
  setMode: (mode: WorkspaceMode) => void;
  openChooser: () => void;
  closeChooser: () => void;
};

export const useWorkspaceModeStore = create<WorkspaceModeState>()(
  persist(
    (set) => ({
      mode: null,
      chooserOpen: false,
      setMode: (mode) => set({ mode, chooserOpen: false }),
      openChooser: () => set({ chooserOpen: true }),
      closeChooser: () => set({ chooserOpen: false }),
    }),
    {
      name: "landportal-workspace-mode",
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
