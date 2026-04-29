import { useMemo } from "react";

import { useWorkspaceModeStore, workspaceModeMeta, type WorkspaceMode } from "./workspaceModeStore";

const fallbackMode: WorkspaceMode = "developer";

const workflowHeadlines: Record<WorkspaceMode, string> = {
  developer: "Move from parcel intelligence into layout and yield decisions.",
  acquisition: "Lead with parcel risk, upside range, and decision-ready next steps.",
  builder: "Start from buildable land, circulation, and site-plan readiness.",
  surveyor: "Keep geometry confidence high while development teams work in simplified flows.",
};

export function useWorkspace() {
  const mode = useWorkspaceModeStore((state) => state.mode) ?? fallbackMode;

  return useMemo(() => {
    const meta = workspaceModeMeta[mode];
    return {
      mode,
      meta,
      headline: workflowHeadlines[mode],
      isDeveloper: mode === "developer",
      isAcquisition: mode === "acquisition",
      isBuilder: mode === "builder",
      isSurveyor: mode === "surveyor",
    };
  }, [mode]);
}
