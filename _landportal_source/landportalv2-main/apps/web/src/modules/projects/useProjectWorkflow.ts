import { useMemo } from "react";

import { useProjectWorkflowStore } from "./projectWorkflowStore";

export function useProjectWorkflow(projectId: string) {
  const selection = useProjectWorkflowStore((state) => state.selections[projectId]);
  const pushRecentParcelId = useProjectWorkflowStore((state) => state.pushRecentParcelId);
  const setParcelId = useProjectWorkflowStore((state) => state.setParcelId);
  const setLayoutId = useProjectWorkflowStore((state) => state.setLayoutId);
  const setCompareLayoutId = useProjectWorkflowStore((state) => state.setCompareLayoutId);
  const setScenarioId = useProjectWorkflowStore((state) => state.setScenarioId);
  const setCompareScenarioId = useProjectWorkflowStore((state) => state.setCompareScenarioId);
  const clearProject = useProjectWorkflowStore((state) => state.clearProject);

  return useMemo(() => ({
    parcelId: selection?.parcelId ?? "",
    recentParcelIds: selection?.recentParcelIds ?? [],
    pushRecentParcelId: (parcelId: string) => pushRecentParcelId(projectId, parcelId),
    layoutId: selection?.layoutId ?? "",
    compareLayoutId: selection?.compareLayoutId ?? "",
    scenarioId: selection?.scenarioId ?? "",
    compareScenarioId: selection?.compareScenarioId ?? "",
    setParcelId: (parcelId?: string) => setParcelId(projectId, parcelId),
    setLayoutId: (layoutId?: string) => setLayoutId(projectId, layoutId),
    setCompareLayoutId: (layoutId?: string) => setCompareLayoutId(projectId, layoutId),
    setScenarioId: (scenarioId?: string) => setScenarioId(projectId, scenarioId),
    setCompareScenarioId: (scenarioId?: string) => setCompareScenarioId(projectId, scenarioId),
    clearProject: () => clearProject(projectId),
  }), [
    clearProject,
    projectId,
    pushRecentParcelId,
    selection?.compareLayoutId,
    selection?.compareScenarioId,
    selection?.layoutId,
    selection?.parcelId,
    selection?.recentParcelIds,
    selection?.scenarioId,
    setCompareLayoutId,
    setCompareScenarioId,
    setLayoutId,
    setParcelId,
    setScenarioId,
  ]);
}
