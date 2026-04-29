import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { resolveActiveParcelId } from "@/modules/parcel/activeParcelAnchor";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { useRegridParcelNeighbors } from "@/modules/parcel/useRegridParcels";
import { useProjectConsole } from "@/modules/projects/useProjectConsole";
import { useProjectSurvey } from "@/modules/projects/useProjectSurvey";
import { WorkflowProgress } from "@/modules/projects/WorkflowProgress";
import { useProjectWorkflow } from "@/modules/projects/useProjectWorkflow";
import { useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjects } from "@/modules/projects/useProjects";
import { useTitleWorkspace } from "@/modules/title/useTitleCommitments";

import { DesignLeftPanel } from "./DesignLeftPanel";
import { DesignMapCanvas } from "./DesignMapCanvas";
import styles from "./DesignConsolePage.module.css";
import { DesignRightPanel } from "./DesignRightPanel";

function boundarySignature(parcelId: string, boundary: Array<{ x: number; y: number }>) {
  return `${parcelId}:${boundary.map((point) => `${point.x}:${point.y}`).join("|")}`;
}

type DesignReviewItem = {
  id: string;
  label: string;
  source: string;
  severity: "error" | "warning" | "info";
};

export function DesignConsolePage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const { data: titleWorkspace } = useTitleWorkspace(projectId);
  const workflow = useProjectWorkflow(projectId);
  const consoleState = useProjectConsole(projectId);
  const surveyState = useProjectSurvey(projectId);

  const parcels = development?.parcels ?? [];
  const activeParcelId = resolveActiveParcelId(parcelSelection, workflow.parcelId, parcels);
  const hasProviderOnlyAnchor = Boolean(parcelSelection?.providerParcelId && !parcelSelection?.parcelSnapshotId);
  const activeParcel =
    parcels.find((parcel) => parcel.id === activeParcelId)
    ?? (hasProviderOnlyAnchor ? null : parcels[0] ?? null);
  const parcelLayouts = useMemo(() => {
    if (!development?.layouts.length || !activeParcel) return [];
    return development.layouts.filter((layout) => !layout.parcelId || layout.parcelId === activeParcel.id);
  }, [development?.layouts, activeParcel]);
  const parcelScenarios = useMemo(() => {
    if (!development?.scenarios.length || !activeParcel) return [];
    return development.scenarios.filter((scenario) => !scenario.parcelId || scenario.parcelId === activeParcel.id);
  }, [development?.scenarios, activeParcel]);
  const selectedLayout = parcelLayouts.find((layout) => layout.id === workflow.layoutId) ?? parcelLayouts[0] ?? null;
  const sitePlan = development?.sitePlans[0] ?? null;
  const lastSurveySyncRef = useRef<string>("");
  const activeCommitment =
    titleWorkspace?.commitments.find((entry) => entry.isPrimary)
    ?? titleWorkspace?.commitments[0]
    ?? null;
  const activeCommitmentReferences = activeCommitment
    ? (titleWorkspace?.references ?? []).filter((entry) => entry.titleCommitmentId === activeCommitment.id)
    : [];
  const titleMissingCount = activeCommitmentReferences.filter((entry) => !entry.visitedProjectDocumentId).length;
  const titleReviewCount = activeCommitmentReferences.filter((entry) => entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review").length;
  const neighboringParcels = useRegridParcelNeighbors(
    parcelSelection?.centroid
      && typeof parcelSelection.centroid === "object"
      && typeof (parcelSelection.centroid as { lng?: unknown }).lng === "number"
      && typeof (parcelSelection.centroid as { lat?: unknown }).lat === "number"
      ? {
          lng: Number((parcelSelection.centroid as { lng: number }).lng),
          lat: Number((parcelSelection.centroid as { lat: number }).lat),
          radius: 350,
          limit: 20,
          excludeLlUuid: parcelSelection.providerParcelId,
        }
      : null,
  );

  useEffect(() => {
    if (activeParcelId && workflow.parcelId !== activeParcelId) {
      workflow.setParcelId(activeParcelId);
    }
  }, [activeParcelId, workflow]);

  useEffect(() => {
    if (!activeParcel?.id || !activeParcel.polygon.length) return;
    const signature = boundarySignature(activeParcel.id, activeParcel.polygon);
    if (lastSurveySyncRef.current !== signature) {
      lastSurveySyncRef.current = signature;
      surveyState.syncSurveyParcelFromBoundary(activeParcel.id, activeParcel.polygon);
    }
    if (!surveyState.activeSurveyParcelId) {
      surveyState.setActiveSurveyParcelId(activeParcel.id);
    }
  }, [
    activeParcel?.id,
    activeParcel?.polygon,
    surveyState.activeSurveyParcelId,
    surveyState.setActiveSurveyParcelId,
    surveyState.syncSurveyParcelFromBoundary,
  ]);

  const activeSurveyParcel =
    surveyState.parcels.find((parcel) => parcel.id === (surveyState.activeSurveyParcelId || activeParcel?.id || ""))
    ?? (activeParcel ? surveyState.parcels.find((parcel) => parcel.id === activeParcel.id) : null)
    ?? surveyState.parcels[0]
    ?? null;
  const surveyCompare = activeParcel && activeSurveyParcel
    ? (() => {
      const grossArea = activeParcel.areaAcres;
      const surveyAreaAcres = activeSurveyParcel.area / 43560;
      const areaDelta = Math.abs(grossArea - surveyAreaAcres);
      const areaDeltaPercent = grossArea > 0 ? (areaDelta / grossArea) * 100 : 0;
      return {
        areaDelta,
        areaDeltaPercent,
        withinTolerance: activeSurveyParcel.closure.withinTolerance,
      };
    })()
    : null;
  const openReviewItems: DesignReviewItem[] = [
    ...(activeParcel?.intelligence?.warnings.map<DesignReviewItem>((warning) => ({
      id: `parcel-${warning.code}-${warning.message}`,
      label: warning.message,
      source: "parcel intelligence",
      severity: warning.severity === "error" ? "error" : warning.severity === "warning" ? "warning" : "info",
    })) ?? []),
    ...surveyState.issues.map<DesignReviewItem>((issue) => ({
      id: `survey-${issue.id}`,
      label: issue.message,
      source: "survey review",
      severity: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warning" : "info",
    })),
    ...(
      surveyCompare && !surveyCompare.withinTolerance
        ? [{
          id: "survey-compare",
          label: `Survey compare delta is ${surveyCompare.areaDelta.toFixed(2)} ac (${surveyCompare.areaDeltaPercent.toFixed(1)}%).`,
          source: "survey compare",
          severity: "warning" as const,
        }]
        : []
    ),
    ...activeCommitmentReferences
      .filter((entry) => !entry.visitedProjectDocumentId || entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review")
      .map<DesignReviewItem>((entry) => ({
        id: `title-${entry.id}`,
        label: entry.referenceText || entry.referenceKey || "Title reference needs attention",
        source: "title review",
        severity: !entry.visitedProjectDocumentId ? "warning" as const : entry.fetchStatus === "manual_review" ? "info" as const : "warning" as const,
      })),
  ];
  const reviewSummary = {
    surveyIssueCount: surveyState.issues.length,
    titleMissingCount,
    titleReviewCount,
    surveyCompareStatus: surveyCompare ? (surveyCompare.withinTolerance ? "Within tolerance" : "Needs review") : "Unavailable",
  };

  if (isLoading) {
    return <LoadingState message="Loading design console..." />;
  }

  if (error || !development) {
    return <div className={styles.page}><div className={styles.section}>Unable to load the design console. {error?.message}</div></div>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <WorkflowProgress
        current="site-planner"
        layoutReady={Boolean(selectedLayout)}
        parcelReady={Boolean(activeParcel?.intelligence)}
        projectId={projectId}
        scenarioReady={Boolean(workflow.scenarioId || parcelScenarios[0]?.id)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong>{project?.name ?? "Design Console"}</strong>
          <div style={{ color: "var(--color-text-muted)" }}>Unified parcel-first workspace for overlays, subdivision setup, site planning, and sheet-ready outputs.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {(["view", "draw", "edit", "analyze", "export"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => surveyState.setMode(mode)}
                style={{
                  border: "1px solid var(--color-border)",
                  background: surveyState.mode === mode ? "var(--color-accent-soft)" : "#fff",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 700,
                  color: surveyState.mode === mode ? "var(--color-accent)" : "inherit",
                }}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/app/projects/${projectId}/workflow`}><Button variant="ghost">Back to workflow</Button></Link>
          <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Open subdivision</Button></Link>
          <Link to={`/app/projects/${projectId}/site-planner`}><Button>Open site planner</Button></Link>
        </div>
      </div>

      {hasProviderOnlyAnchor && !activeParcel ? (
        <div style={{ padding: "14px 16px", borderRadius: 18, background: "rgba(255,255,255,0.82)", border: "1px solid rgba(217, 222, 232, 0.85)", color: "var(--color-text-muted)" }}>
          A live provider parcel is currently focused as the project anchor. Import it from Property before expecting saved parcel metrics, subdivision layouts, or site-plan geometry to appear in the design console.
        </div>
      ) : null}

      <div className={styles.page}>
        <DesignLeftPanel
          activeParcelId={activeParcel?.id ?? ""}
          development={development}
          onParcelSelect={(parcelId) => workflow.setParcelId(parcelId)}
          onSearchChange={consoleState.setSearchQuery}
          onTabChange={consoleState.setActiveTab}
          searchQuery={consoleState.searchQuery}
        />
        <DesignMapCanvas
          adjoiningParcels={neighboringParcels.data ?? []}
          contourMajorEvery={consoleState.majorEvery}
          contourMinorInterval={consoleState.minorInterval}
          contoursGenerated={consoleState.contoursGenerated}
          overlaySettings={consoleState.overlaySettings}
          parcel={activeParcel}
          parcelSelection={parcelSelection}
          selectedLayout={selectedLayout}
          sitePlan={sitePlan}
        />
        <DesignRightPanel
          activeTab={consoleState.activeTab}
          majorEvery={consoleState.majorEvery}
          minorInterval={consoleState.minorInterval}
          openReviewItems={openReviewItems}
          onGenerateContours={() => {
            consoleState.setContoursGenerated(true);
            consoleState.setOverlayVisible("contours", true);
          }}
          onMajorEveryChange={consoleState.setMajorEvery}
          onMinorIntervalChange={consoleState.setMinorInterval}
          onOpacityChange={consoleState.setOverlayOpacity}
          onShowContourLabelsChange={consoleState.setShowContourLabels}
          onTabChange={consoleState.setActiveTab}
          onToggleOverlay={consoleState.toggleOverlay}
          overlayGroups={consoleState.grouped}
          overlaySettings={consoleState.overlaySettings}
          parcel={activeParcel}
          reviewSummary={reviewSummary}
          scenarios={parcelScenarios}
          selectedLayout={selectedLayout}
          showContourLabels={consoleState.showContourLabels}
          sitePlan={sitePlan}
        />
      </div>
      <div style={{ display: "grid", gap: 10, padding: "16px 18px", borderRadius: 20, background: "rgba(255,255,255,0.78)", border: "1px solid rgba(217, 222, 232, 0.85)" }}>
        <strong>Canonical survey state</strong>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "var(--color-text-muted)" }}>
          <span>{surveyState.parcels.length} survey parcel objects</span>
          <span>{surveyState.alignments.length} alignments</span>
          <span>{surveyState.controlPoints.length} control points</span>
          <span>Mode: {surveyState.mode}</span>
        </div>
        {surveyState.issues.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {surveyState.issues.map((issue) => (
              <span
                key={issue.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: issue.severity === "error"
                    ? "rgba(201, 79, 79, 0.06)"
                    : issue.severity === "warning"
                      ? "rgba(198, 122, 27, 0.08)"
                      : "rgba(59, 130, 246, 0.08)",
                  border: issue.severity === "error"
                    ? "1px solid rgba(201, 79, 79, 0.2)"
                    : issue.severity === "warning"
                      ? "1px solid rgba(198, 122, 27, 0.22)"
                      : "1px solid rgba(59, 130, 246, 0.18)",
                }}
              >
                {issue.message}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: "var(--color-text-muted)" }}>No survey-state validation issues are currently flagged.</span>
        )}
      </div>
    </div>
  );
}
