import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { buildExportPlan, buildSheetPreviewModel, buildSubdivisionBriefModel, buildSurveyReviewMemoModel, buildTitleReviewMemoModel, buildYieldSummaryModel, renderSheetPreviewHtml, renderTextExport, type ExportSheetType } from "@landportal/core-documents";

import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { useProjectWorkflow } from "@/modules/projects/useProjectWorkflow";
import { useProjects } from "@/modules/projects/useProjects";
import { useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjectSurvey } from "@/modules/projects/useProjectSurvey";
import { buildSurveyReviewSummary, generateDraftLegalDescription, renderSurveyAuditTrail, renderSurveyReviewSummary } from "@landportal/core-survey";
import { useTitleWorkspace } from "@/modules/title/useTitleCommitments";

import styles from "./ProjectDocuments.module.css";

export function ProjectPlatPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const workflow = useProjectWorkflow(projectId);

  if (isLoading) return <LoadingState message="Loading site plan preview..." />;
  if (error || !development) return <div className={styles.page}><div className={styles.previewPanel}>Unable to load planning data. {error?.message}</div></div>;

  const parcel = development.parcels.find((entry) => entry.id === workflow.parcelId) ?? development.parcels[0];
  const layout = development.layouts.find((entry) => entry.id === workflow.layoutId) ?? development.layouts[0];
  const scenario = development.scenarios.find((entry) => entry.id === workflow.scenarioId) ?? development.scenarios[0];
  const sheetPreview = buildSheetPreviewModel({
    projectName: project?.name ?? "Planning concept",
    parcelName: parcel?.name,
    layoutName: layout?.name,
    scenarioName: scenario?.title,
    lotCount: layout?.lotCount ?? 0,
    buildableAcres: parcel?.intelligence?.buildableAreaAcres ?? parcel?.buildableAcres ?? 0,
    documentCount: development.documents.length,
  });
  const platBlockers = [
    !parcel?.intelligence ? "Parcel intelligence is required before this preview should be treated as trusted output." : null,
    !layout ? "No subdivision layout is pinned for the sheet preview." : null,
  ].filter(Boolean) as string[];
  const platWarnings = [
    !scenario ? "No saved scenario is attached to this sheet preview yet." : null,
  ].filter(Boolean) as string[];
  const platTone = platBlockers.length ? "blocked" : platWarnings.length ? "attention" : "ready";
  const sheetHtml = renderSheetPreviewHtml(sheetPreview);

  function downloadFile(filename: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <ProjectWorkspaceShell
      currentStep="site-planner"
      description={<p>Printable planning output now derives from stored parcel and subdivision data instead of seeded document fixtures.</p>}
      eyebrow="Sheet preview"
      headerActions={
        <>
          <Button onClick={() => window.print()} variant="secondary">Print preview</Button>
          <Button onClick={() => downloadFile(`${(project?.name ?? "concept-sheet").replaceAll(" ", "-").toLowerCase()}.html`, sheetHtml, "text/html")}>Export sheet package</Button>
        </>
      }
      layoutReady={Boolean(layout)}
      parcelReady={Boolean(parcel?.intelligence)}
      projectId={projectId}
      scenarioReady={Boolean(scenario)}
      title={project?.name ?? "Site plan preview"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/documents`}><Button variant="secondary">Open documents</Button></Link>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Back to site plan</Button></Link>
            </>
          }
          blockers={platBlockers}
          checks={sheetPreview.notes}
          summary="This is the first printable proof step. Use it to verify that the active parcel, layout, and scenario read cleanly before formal PDF export."
          title="Sheet preview readiness"
          tone={platTone}
          warnings={platWarnings}
        />
      }
    >

      <section className={styles.layout}>
        <div className={styles.previewPanel}>
          <strong>Planning sheet preview</strong>
          <div className={styles.sheet}>
            <svg className={styles.sheetSvg} viewBox="0 0 800 560">
              <rect fill="none" height="520" stroke="#232831" strokeWidth="2" width="760" x="20" y="20" />
              {parcel ? <polygon fill="rgba(84,118,194,0.12)" points={parcel.polygon.map((point) => `${120 + point.x * 5},${70 + point.y * 4.5}`).join(" ")} stroke="#233252" strokeWidth="3" /> : null}
              {layout?.lots.map((lot) => (
                <polygon key={lot.id} fill="rgba(255,255,255,0.85)" points={lot.polygon.map((point) => `${120 + point.x * 5},${70 + point.y * 4.5}`).join(" ")} stroke="#2e4f97" strokeWidth="1.5" />
              ))}
              <text fontSize="22" x="55" y="70">{sheetPreview.title}</text>
              <text fill="#58606d" fontSize="15" x="55" y="96">{sheetPreview.subtitle}</text>
              <text fontSize="14" x="620" y="70">N</text>
              <path d="M620 78 L620 130" stroke="#1d2330" strokeWidth="2" />
              <path d="M620 78 L611 92 L629 92 Z" fill="#1d2330" />
            </svg>
            <div className={styles.titleBlock}>
              <strong>{sheetPreview.title}</strong>
              {sheetPreview.stats.map((stat) => (
                <div className={styles.row} key={stat.label}><span>{stat.label}</span><span>{stat.value}</span></div>
              ))}
              <div className={styles.muted}>{sheetPreview.notes[0]}</div>
            </div>
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <strong>Sheet controls</strong>
          <div className={styles.docCard}>
            <strong>Source data</strong>
            <div className={styles.row}><span>Parcel snapshots</span><span>{development.parcels.length}</span></div>
            <div className={styles.row}><span>Subdivision concepts</span><span>{development.layouts.length}</span></div>
            <div className={styles.row}><span>Documents</span><span>{development.documents.length}</span></div>
          </div>
          <div className={styles.docCard}>
            <strong>Next routes</strong>
            <Link to={`/app/projects/${projectId}/documents`}><Button variant="secondary">Open documents</Button></Link>
            <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="ghost">Open subdivision</Button></Link>
          </div>
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}

export function ProjectDocumentsPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const {
    data: parcelSelection,
    error: parcelSelectionError,
    isLoading: parcelSelectionLoading,
  } = useProjectParcelSelection(projectId);
  const {
    data: titleWorkspace,
    error: titleWorkspaceError,
    isLoading: titleWorkspaceLoading,
  } = useTitleWorkspace(projectId);
  const workflow = useProjectWorkflow(projectId);
  const surveyState = useProjectSurvey(projectId);

  if (isLoading || parcelSelectionLoading || titleWorkspaceLoading) return <LoadingState message="Loading document history..." />;
  if (error || parcelSelectionError || titleWorkspaceError || !development) {
    return (
      <div className={styles.page}>
        <div className={styles.previewPanel}>
          Unable to load documents. {error?.message ?? parcelSelectionError?.message ?? titleWorkspaceError?.message}
        </div>
      </div>
    );
  }

  const activeParcel = development.parcels.find((entry) => entry.id === workflow.parcelId) ?? development.parcels[0] ?? null;
  const activeLayout = development.layouts.find((entry) => entry.id === workflow.layoutId) ?? development.layouts[0] ?? null;
  const activeScenario = development.scenarios.find((entry) => entry.id === workflow.scenarioId) ?? development.scenarios[0] ?? null;
  const exportPlan = buildExportPlan({
    projectName: project?.name ?? "Project documents",
    parcelCount: development.parcels.length,
    analyzedParcelCount: development.parcels.filter((entry) => Boolean(entry.intelligence)).length,
    layoutCount: development.layouts.length,
    scenarioCount: development.scenarios.length,
    sitePlanCount: development.sitePlans.length,
    readyDocumentCount: development.documents.filter((document) => document.status === "ready").length,
    buildableAcres: activeParcel?.intelligence?.buildableAreaAcres ?? activeParcel?.buildableAcres ?? 0,
    bestUnitCount: development.scenarios.reduce((best, scenario) => Math.max(best, scenario.units), 0),
    parcelAnchorAttached: Boolean(parcelSelection),
    titleCommitmentCount: titleWorkspace?.commitments.length ?? 0,
    titleReferenceCount: titleWorkspace?.references.length ?? 0,
    visitedTitleReferenceCount: (titleWorkspace?.references ?? []).filter((entry) => entry.visitStatus === "visited" || Boolean(entry.visitedProjectDocumentId)).length,
    surveyParcelPromoted: Boolean(surveyState.activeSurveyParcelId || surveyState.parcels[0]?.id),
    surveyIssueCount: surveyState.issues.length,
  });
  const blockedExports = exportPlan.filter((item) => item.readiness === "blocked").flatMap((item) => item.blockers);
  const exportWarnings = exportPlan.filter((item) => item.readiness === "attention").map((item) => `${item.title} still needs review.`);
  const exportChecks = exportPlan.map((item) => `${item.title}: ${item.highlights[0] ?? item.description}`);
  const [activePreview, setActivePreview] = useState<ExportSheetType>("yield_summary");
  const titleCommitments = titleWorkspace?.commitments ?? [];
  const orderedCommitments = [...titleCommitments].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
  const activeCommitment = orderedCommitments.find((entry) => entry.isPrimary) ?? orderedCommitments[0] ?? null;
  const activeCommitmentReferences = activeCommitment
    ? (titleWorkspace?.references ?? []).filter((entry) => entry.titleCommitmentId === activeCommitment.id)
    : [];
  const visitedReferenceCount = activeCommitmentReferences.filter((entry) => entry.visitStatus === "visited" || Boolean(entry.visitedProjectDocumentId)).length;
  const missingReferenceCount = Math.max(0, activeCommitmentReferences.length - visitedReferenceCount);
  const titleReviewCount = activeCommitmentReferences.filter((entry) => entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review").length;
  const linkedDocumentCount = activeCommitment
    ? (titleWorkspace?.linkedDocuments ?? []).filter((entry) => entry.titleCommitmentId === activeCommitment.id).length
    : 0;
  const yieldSummary = buildYieldSummaryModel({
    projectName: project?.name ?? "Project",
    parcelName: activeParcel?.name,
    buildableAcres: activeParcel?.intelligence?.buildableAreaAcres ?? activeParcel?.buildableAcres ?? 0,
    frontageFt: activeParcel?.intelligence?.frontageFt ?? activeParcel?.frontageFeet ?? 0,
    unitRange: development.scenarios.length
      ? `${Math.min(...development.scenarios.map((scenario) => scenario.units))}-${Math.max(...development.scenarios.map((scenario) => scenario.units))}`
      : "not modeled",
    recommendedStrategy: activeParcel?.intelligence?.bestSubdivisionStrategy,
    scenarioCount: development.scenarios.length,
  });
  const subdivisionBrief = buildSubdivisionBriefModel({
    projectName: project?.name ?? "Project",
    parcelName: activeParcel?.name,
    layoutName: activeLayout?.name,
    lotCount: activeLayout?.lotCount ?? 0,
    yieldUnits: activeLayout?.yieldUnits ?? 0,
    invalidLotCount: activeLayout?.warnings.length ?? 0,
    openSpacePercent: undefined,
    warnings: activeLayout?.warnings ?? [],
  });
  const activeSurveyParcel = surveyState.parcels.find((entry: (typeof surveyState.parcels)[number]) => entry.id === surveyState.activeSurveyParcelId) ?? surveyState.parcels[0] ?? null;
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
  const reviewQueue = [
    ...(activeParcel?.intelligence?.warnings.map((warning) => ({
      id: `parcel-${warning.code}-${warning.message}`,
      label: warning.message,
      source: "parcel intelligence",
    })) ?? []),
    ...surveyState.issues.map((issue) => ({
      id: `survey-${issue.id}`,
      label: issue.message,
      source: "survey review",
    })),
    ...(
      surveyCompare && !surveyCompare.withinTolerance
        ? [{
          id: "survey-compare",
          label: `Survey compare delta is ${surveyCompare.areaDelta.toFixed(2)} ac (${surveyCompare.areaDeltaPercent.toFixed(1)}%).`,
          source: "survey compare",
        }]
        : []
    ),
    ...activeCommitmentReferences
      .filter((entry) => !entry.visitedProjectDocumentId || entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review")
      .map((entry) => ({
        id: `title-${entry.id}`,
        label: !entry.visitedProjectDocumentId
          ? `Missing stored document for ${entry.referenceText || entry.referenceKey || "title reference"}.`
          : entry.fetchStatus === "manual_review"
            ? `${entry.referenceText || entry.referenceKey || "Title reference"} needs manual review.`
            : `${entry.referenceText || entry.referenceKey || "Title reference"} failed fetch and should be retried.`,
        source: "title review",
      })),
  ];
  const surveyLegalDescription = useMemo(
    () => activeSurveyParcel ? generateDraftLegalDescription(activeSurveyParcel.id, activeSurveyParcel.boundary) : "",
    [activeSurveyParcel],
  );
  const surveyAuditText = useMemo(() => renderSurveyAuditTrail(surveyState.auditTrail), [surveyState.auditTrail]);
  const surveyReviewSummaryText = useMemo(() => {
    if (!activeSurveyParcel) return "No active survey parcel is available yet.";
    const reviewPoints = activeSurveyParcel.boundary.map((point, index) => ({
      id: `survey-point-${index + 1}`,
      label: index === 0 ? "POB" : `PT-${index}`,
      x: point.x,
      y: point.y,
    }));
    return renderSurveyReviewSummary(
      buildSurveyReviewSummary(
        activeSurveyParcel.id,
        {
          points: reviewPoints,
          parsedCallCount: activeSurveyParcel.bearings.length,
          ignoredLineCount: 0,
          closure: activeSurveyParcel.closure,
        },
        surveyState.issues,
      ),
    );
  }, [activeSurveyParcel, surveyState.issues]);
  const titleReviewMemo = buildTitleReviewMemoModel({
    projectName: project?.name ?? "Project",
    parcelLabel: activeParcel?.name ?? parcelSelection?.parcelName ?? parcelSelection?.address,
    parcelAnchorAttached: Boolean(parcelSelection),
    titleCommitmentTitle: activeCommitment?.title,
    titleCommitmentCount: titleCommitments.length,
    expectedReferenceCount: activeCommitmentReferences.length,
    visitedReferenceCount,
    linkedDocumentCount,
  });
  const surveyReviewMemo = buildSurveyReviewMemoModel({
    projectName: project?.name ?? "Project",
    parcelLabel: activeParcel?.name ?? parcelSelection?.parcelName ?? parcelSelection?.address,
    surveyParcelId: activeSurveyParcel?.id,
    sourceLabel: activeSurveyParcel?.source?.replaceAll("_", " "),
    closureWithinTolerance: activeSurveyParcel?.closure.withinTolerance ?? false,
    issueCount: surveyState.issues.length,
    auditEntryCount: surveyState.auditTrail.length,
    legalDescriptionReady: Boolean(surveyLegalDescription),
  });
  const previewModels = {
    yield_summary: yieldSummary,
    subdivision_brief: subdivisionBrief,
    title_review_memo: titleReviewMemo,
    survey_review_memo: surveyReviewMemo,
  } as const;
  const currentPreviewModel = previewModels[activePreview as keyof typeof previewModels] ?? yieldSummary;
  const activePreviewText = useMemo(() => renderTextExport(currentPreviewModel), [currentPreviewModel]);
  const additionalBlockedExports = [
    !parcelSelection ? "No parcel anchor is attached to the project." : null,
    !activeCommitment ? "No primary title commitment is assigned." : null,
    missingReferenceCount ? `${missingReferenceCount} title reference${missingReferenceCount === 1 ? "" : "s"} still need stored documents.` : null,
    surveyCompare && !surveyCompare.withinTolerance ? "Survey compare is outside tolerance and should be reviewed before final export." : null,
  ].filter(Boolean) as string[];
  const additionalExportWarnings = [
    titleReviewCount ? `${titleReviewCount} title reference${titleReviewCount === 1 ? "" : "s"} still need manual review or retry.` : null,
    surveyState.issues.length ? `${surveyState.issues.length} survey issue${surveyState.issues.length === 1 ? "" : "s"} remain open in the canonical review state.` : null,
  ].filter(Boolean) as string[];
  blockedExports.push(...additionalBlockedExports);
  exportWarnings.push(...additionalExportWarnings);
  const exportTone = blockedExports.length ? "blocked" : exportWarnings.length ? "attention" : "ready";
  const handoffSummary = useMemo(() => {
    return [
      `Project: ${project?.name ?? "Project documents"}`,
      `Parcel anchor: ${parcelSelection?.parcelName ?? parcelSelection?.providerParcelId ?? "Missing"}`,
      `Analyzed parcels: ${development.parcels.filter((entry) => Boolean(entry.intelligence)).length}/${development.parcels.length}`,
      `Primary title commitment: ${activeCommitment?.title ?? "Missing"}`,
      `Visited title references: ${visitedReferenceCount}/${activeCommitmentReferences.length}`,
      `Title references needing review: ${titleReviewCount}`,
      `Survey parcel: ${activeSurveyParcel?.id ?? "Not promoted"}`,
      `Survey issues: ${surveyState.issues.length}`,
      `Survey compare: ${surveyCompare ? (surveyCompare.withinTolerance ? "Within tolerance" : `${surveyCompare.areaDelta.toFixed(2)} ac delta`) : "Unavailable"}`,
      `Layouts: ${development.layouts.length}`,
      `Scenarios: ${development.scenarios.length}`,
      `Export readiness: ${exportTone}`,
      blockedExports.length ? `Blocked by: ${blockedExports.join(" | ")}` : "No export blockers currently detected.",
    ].join("\n");
  }, [
    activeCommitment?.title,
    activeCommitmentReferences.length,
    activeSurveyParcel?.id,
    blockedExports,
    development.layouts.length,
    development.parcels,
    development.scenarios.length,
    exportTone,
    parcelSelection?.parcelName,
    parcelSelection?.providerParcelId,
    project?.name,
    surveyCompare,
    surveyState.issues.length,
    titleReviewCount,
    visitedReferenceCount,
  ]);

  function previewFilename(preview: ExportSheetType) {
    switch (preview) {
      case "yield_summary":
        return "yield-summary.txt";
      case "subdivision_brief":
        return "subdivision-brief.txt";
      case "title_review_memo":
        return "title-review-memo.txt";
      case "survey_review_memo":
        return "survey-review-memo.txt";
      case "concept_plan":
        return "concept-plan.txt";
      default:
        return "export.txt";
    }
  }

  function downloadFile(filename: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <ProjectWorkspaceShell
      currentStep="site-planner"
      description={<p>Documents and exports now load from project records so the planning story can be reviewed outside the modeling tools.</p>}
      eyebrow="Documents and exports"
      headerActions={
        <>
          <Link to={`/app/projects/${projectId}/plat`}><Button variant="secondary">Open site plan preview</Button></Link>
          <Link to={`/app/projects/${projectId}/title`}><Button variant="ghost">Open title intake</Button></Link>
          <Button onClick={() => downloadFile(previewFilename(activePreview), activePreviewText, "text/plain")}>Download active export</Button>
          <Button onClick={() => downloadFile("project-handoff-summary.txt", handoffSummary, "text/plain")} variant="ghost">Download handoff summary</Button>
        </>
      }
      layoutReady={Boolean(development.layouts.length)}
      parcelReady={Boolean(development.parcels.some((entry) => Boolean(entry.intelligence)))}
      projectId={projectId}
      scenarioReady={Boolean(development.scenarios.length)}
      title={project?.name ?? "Documents"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/plat`}><Button variant="secondary">Open concept sheet</Button></Link>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Back to site plan</Button></Link>
            </>
          }
          blockers={blockedExports}
          checks={exportChecks}
          summary="Documents is now the export-planning layer. Use it to see which deliverables are actually ready, what is blocked, and which output should be generated next."
          title="Export readiness"
          tone={exportTone}
          warnings={exportWarnings}
        />
      }
    >

      <section className={styles.layout}>
        <div className={styles.previewPanel}>
          <div className={styles.docCard}>
            <div className={styles.cardHeader}>
              <strong>Handoff summary</strong>
              <span className={`${styles.badge} ${exportTone === "blocked" ? styles.badgeBlocked : exportTone === "attention" ? styles.badgeAttention : ""}`}>{exportTone}</span>
            </div>
            <span className={styles.muted}>Use this quick summary when you need one readable status export before choosing a full memo or sheet output.</span>
            <pre className={styles.preformatted}>{handoffSummary}</pre>
            <div className={styles.actionRow}>
              <Button onClick={() => downloadFile("project-handoff-summary.txt", handoffSummary, "text/plain")} variant="secondary">Download summary</Button>
              <Button onClick={() => navigator.clipboard?.writeText(handoffSummary)} variant="ghost">Copy summary</Button>
            </div>
          </div>

          <strong>Export planner</strong>
          <div className={styles.docList}>
            {exportPlan.map((item) => (
              <div className={styles.docCard} key={item.exportType}>
                <div className={styles.cardHeader}>
                  <strong>{item.title}</strong>
                  <span className={`${styles.badge} ${item.readiness === "blocked" ? styles.badgeBlocked : item.readiness === "attention" ? styles.badgeAttention : ""}`}>{item.readiness}</span>
                </div>
                <span className={styles.muted}>{item.description}</span>
                {item.blockers.length ? item.blockers.map((blocker) => (
                  <div className={styles.row} key={blocker}><span>Needs</span><span>{blocker}</span></div>
                )) : null}
                {item.highlights.map((highlight) => (
                  <div className={styles.row} key={highlight}><span>Signal</span><span>{highlight}</span></div>
                ))}
              </div>
            ))}
          </div>

          <strong>Generated export previews</strong>
          <div className={styles.previewSwitchRow}>
            <button
              className={`${styles.previewSwitch} ${activePreview === "yield_summary" ? styles.previewSwitchActive : ""}`}
              onClick={() => setActivePreview("yield_summary")}
              type="button"
            >
              Yield summary
            </button>
            <button
              className={`${styles.previewSwitch} ${activePreview === "subdivision_brief" ? styles.previewSwitchActive : ""}`}
              onClick={() => setActivePreview("subdivision_brief")}
              type="button"
            >
              Subdivision brief
            </button>
            <button
              className={`${styles.previewSwitch} ${activePreview === "title_review_memo" ? styles.previewSwitchActive : ""}`}
              onClick={() => setActivePreview("title_review_memo")}
              type="button"
            >
              Title memo
            </button>
            <button
              className={`${styles.previewSwitch} ${activePreview === "survey_review_memo" ? styles.previewSwitchActive : ""}`}
              onClick={() => setActivePreview("survey_review_memo")}
              type="button"
            >
              Survey memo
            </button>
          </div>
          <div className={styles.docList}>
            <div className={styles.docCard}>
              <div className={styles.cardHeader}>
                <strong>{currentPreviewModel.title}</strong>
                <span className={styles.badge}>preview</span>
              </div>
              <span className={styles.muted}>{currentPreviewModel.summary}</span>
              {currentPreviewModel.bullets.map((bullet) => (
                <div className={styles.row} key={bullet}><span>Point</span><span>{bullet}</span></div>
              ))}
              <div className={styles.actionRow}>
                <Button
                  onClick={() => downloadFile(
                    previewFilename(activePreview),
                    activePreviewText,
                    "text/plain",
                  )}
                  variant="secondary"
                >
                  Download text
                </Button>
                <Button onClick={() => navigator.clipboard?.writeText(activePreviewText)} variant="ghost">
                  Copy text
                </Button>
              </div>
            </div>
          </div>

          <strong>Project documents</strong>
          <div className={styles.docList}>
            {development.documents.length ? development.documents.map((document) => (
              <div className={styles.docCard} key={document.id}>
                <strong>{document.title}</strong>
                <span className={styles.badge}>{document.status}</span>
                <div className={styles.row}><span>Type</span><span>{document.type}</span></div>
                <div className={styles.row}><span>Updated</span><span>{document.updatedAt}</span></div>
                <div className={styles.row}><span>Owner</span><span>{document.owner}</span></div>
              </div>
            )) : (
              <div className={styles.docCard}>
                <strong>No project documents yet</strong>
                <span className={styles.muted}>Upload a title commitment, generate a planning export, or save a sheet preview to start the document stack.</span>
              </div>
            )}
          </div>

          <strong>Parcel-title-survey review</strong>
          <div className={styles.docList}>
            <div className={styles.docCard}>
              <div className={styles.cardHeader}>
                <strong>Spatial review status</strong>
                <span className={`${styles.badge} ${surveyState.issues.length ? styles.badgeAttention : ""}`}>
                  {surveyState.issues.length ? "review" : "aligned"}
                </span>
              </div>
              <div className={styles.row}><span>Parcel anchor</span><span>{parcelSelection ? "Attached" : "Missing"}</span></div>
              <div className={styles.row}><span>Primary title</span><span>{activeCommitment?.title ?? "Missing"}</span></div>
              <div className={styles.row}><span>Visited refs</span><span>{visitedReferenceCount}/{activeCommitmentReferences.length}</span></div>
              <div className={styles.row}><span>Needs title review</span><span>{titleReviewCount}</span></div>
              <div className={styles.row}><span>Survey parcel</span><span>{activeSurveyParcel?.id ?? "Not promoted"}</span></div>
              <div className={styles.row}><span>Survey issues</span><span>{surveyState.issues.length}</span></div>
              <div className={styles.row}><span>Survey compare</span><span>{surveyCompare ? (surveyCompare.withinTolerance ? "Within tolerance" : "Needs review") : "Unavailable"}</span></div>
            </div>
            <div className={styles.docCard}>
              <div className={styles.cardHeader}>
                <strong>Review queue</strong>
                <span className={`${styles.badge} ${reviewQueue.length ? styles.badgeAttention : ""}`}>{reviewQueue.length ? `${reviewQueue.length} open` : "clear"}</span>
              </div>
              {reviewQueue.length ? reviewQueue.slice(0, 8).map((item) => (
                <div className={styles.row} key={item.id}><span>{item.source}</span><span>{item.label}</span></div>
              )) : (
                <div className={styles.muted}>Parcel, title, and survey reviews are aligned well enough for export prep.</div>
              )}
            </div>
            <div className={styles.docCard}>
              <div className={styles.cardHeader}>
                <strong>Review memo tools</strong>
                <span className={styles.badge}>new</span>
              </div>
              <div className={styles.actionRow}>
                <Button onClick={() => {
                  setActivePreview("title_review_memo");
                  downloadFile("title-review-memo.txt", renderTextExport(titleReviewMemo), "text/plain");
                }} variant="secondary">
                  Export title memo
                </Button>
                <Button onClick={() => {
                  setActivePreview("survey_review_memo");
                  downloadFile("survey-review-memo.txt", renderTextExport(surveyReviewMemo), "text/plain");
                }} variant="ghost">
                  Export survey memo
                </Button>
              </div>
              <div className={styles.muted}>These memos package parcel anchor, title evidence, and survey review signals into handoff-friendly text exports.</div>
            </div>
            <div className={styles.docCard}>
              <div className={styles.cardHeader}>
                <strong>Survey review snapshot</strong>
                <span className={styles.badge}>text</span>
              </div>
              <pre className={styles.preformatted}>{surveyReviewSummaryText}</pre>
            </div>
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <strong>Planning export queue</strong>
          <div className={styles.docCard}>
            <strong>Pipeline</strong>
            <div className={styles.row}><span>Yield scenarios</span><span>{development.scenarios.length}</span></div>
            <div className={styles.row}><span>Subdivision concepts</span><span>{development.layouts.length}</span></div>
            <div className={styles.row}><span>Ready docs</span><span>{development.documents.filter((document) => document.status === "ready").length}</span></div>
            <div className={styles.row}><span>Blocked exports</span><span>{blockedExports.length}</span></div>
          </div>
          <div className={styles.docCard}>
            <strong>Document actions</strong>
            <Button onClick={() => {
              setActivePreview("yield_summary");
              downloadFile("yield-summary.txt", renderTextExport(yieldSummary), "text/plain");
            }} variant="secondary">Generate yield summary</Button>
            <Button onClick={() => {
              setActivePreview("subdivision_brief");
              downloadFile("subdivision-brief.txt", renderTextExport(subdivisionBrief), "text/plain");
            }} variant="ghost">Generate subdivision brief</Button>
            {activeScenario ? <div className={styles.muted}>Active scenario: {activeScenario.title}</div> : null}
          </div>
          <div className={styles.docCard}>
            <strong>Survey exports</strong>
            <div className={styles.row}><span>Survey parcel</span><span>{activeSurveyParcel?.id ?? "Not promoted"}</span></div>
            <div className={styles.row}><span>Issues</span><span>{surveyState.issues.length}</span></div>
            <div className={styles.row}><span>Audit entries</span><span>{surveyState.auditTrail.length}</span></div>
            <Button
              onClick={() => downloadFile("survey-legal-description.txt", surveyLegalDescription || "No active survey parcel is available yet.", "text/plain")}
              variant="secondary"
            >
              Export survey legal
            </Button>
            <Button
              onClick={() => downloadFile("survey-audit-trail.txt", surveyAuditText, "text/plain")}
              variant="ghost"
            >
              Export survey audit
            </Button>
          </div>
          <div className={styles.docCard}>
            <strong>Title exports</strong>
            <div className={styles.row}><span>Primary commitment</span><span>{activeCommitment ? "Ready" : "Missing"}</span></div>
            <div className={styles.row}><span>Linked docs</span><span>{linkedDocumentCount}</span></div>
            <div className={styles.row}><span>Visited refs</span><span>{visitedReferenceCount}/{activeCommitmentReferences.length}</span></div>
            <Button
              onClick={() => downloadFile("title-review-memo.txt", renderTextExport(titleReviewMemo), "text/plain")}
              variant="secondary"
            >
              Export title memo
            </Button>
            {!activeCommitment ? <div className={styles.muted}>Upload and confirm one primary title commitment before treating title exports as final.</div> : null}
          </div>
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}
