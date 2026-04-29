import { useMemo } from "react";
import { buildProjectMapCollections } from "@landportal/map-core";

import { useProjectWorkspace } from "@/modules/projects/useProjectWorkspace";

export function useProjectMap(projectId: string) {
  const workspaceQuery = useProjectWorkspace(projectId);
  const workspace = workspaceQuery.data;
  const collections = useMemo(
    () =>
      workspace
        ? buildProjectMapCollections(
          workspace.points,
          workspace.segments,
          workspace.anchor,
          workspace.spatialReference,
        )
        : null,
    [workspace],
  );

  return {
    ...workspaceQuery,
    workspace,
    collections,
  };
}
