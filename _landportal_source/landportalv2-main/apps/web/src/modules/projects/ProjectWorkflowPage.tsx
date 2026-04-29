import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { resolveActiveParcelId } from "@/modules/parcel/activeParcelAnchor";
import { LayoutComparisonTable } from "@/modules/comparison/LayoutComparisonTable";
import { RecommendationPanel } from "@/modules/recommendations/RecommendationPanel";
import { useProjectSurvey } from "@/modules/projects/useProjectSurvey";
import { useTitleWorkspace } from "@/modules/title/useTitleCommitments";
import { useWorkspace } from "@/modules/workspace/useWorkspace";
import { WorkspaceModeSwitcher } from "@/modules/workspace/WorkspaceModeSwitcher";

import { WorkflowProgress } from "./WorkflowProgress";
import { useProjectWorkflow } from "./useProjectWorkflow";
import { useProjectDevelopment } from "./useProjectDevelopment";
import { useProjects } from "./useProjects";
import styles from "./ProjectWorkflowPage.module.css";

function formatStrategy(strategy: string | null | undefined) {
  if (!strategy) return "Manual review";
  return strategy.replaceAll("_", " ");
}

function boundarySignature(parcelId: string, boundary: Array<{ x: number; y: number }>) {
  return `${parcelId}:${boundary.map((point) => `${point.x}:${point.y}`).join("|")}`;
}

export function ProjectWorkflowPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const { data: development } = useProjectDevelopment(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const { data: titleWorkspace } = useTitleWorkspace(projectId);
  const { meta, headline, isAcquisition, isBuilder } = useWorkspace();
  const workflow = useProjectWorkflow(projectId);
  const surveyState = useProjectSurvey(projectId);
  const project = projects.find((entry) => entry.id === projectId);

  const activeParcelId = development?.parcels.length
    ? resolveActiveParcelId(parcelSelection, workflow.parcelId, development.parcels)
    : "";
  const hasProviderOnlyAnchor = Boolean(parcelSelection?.providerParcelId && !parcelSelection?.parcelSnapshotId);
  const parcel =
    development?.parcels.find((entry) => entry.id === activeParcelId)
    ?? (hasProviderOnlyAnchor ? null : development?.parcels[0] ?? null);
  const titleDocumentCount = (development?.documents ?? []).filter((document) => document.type === "title_commitment" || /title|schedule a|schedule b/i.test(document.title)).length;
  const parcelLayouts = development?.layouts.filter((layout) => !parcel || !layout.parcelId || layout.parcelId === parcel.id) ?? [];
  const parcelScenarios = development?.scenarios.filter((scenario) => !parcel || !scenario.parcelId || scenario.parcelId === parcel.id) ?? [];
  const bestScenario = parcelScenarios.length
    ? parcelScenarios.reduce((best, scenario) => {
      if (!best || scenario.units > best.units) return scenario;
      return best;
    })
    : null;
  const bestLayout = parcelLayouts.length
    ? parcelLayouts.reduce((best, layout) => {
      if (!best || layout.yieldUnits > best.yieldUnits) return layout;
      return best;
    })
    : null;
  const selectedLayout = parcelLayouts.find((layout) => layout.id === workflow.layoutId) ?? bestLayout;
  const compareLayout = parcelLayouts.find((layout) => layout.id === workflow.compareLayoutId) ?? null;
  const selectedScenario = parcelScenarios.find((scenario) => scenario.id === workflow.scenarioId) ?? bestScenario;
  const compareScenario = parcelScenarios.find((scenario) => scenario.id === workflow.compareScenarioId) ?? null;
  const analysisWarnings = parcel?.intelligence?.warnings ?? [];
  const activeSurveyParcel = surveyState.parcels.find((entry) => entry.id === surveyState.activeSurveyParcelId) ?? surveyState.parcels[0] ?? null;
  const canonicalSurveyParcel = parcel ? surveyState.parcels.find((entry) => entry.id === parcel.id) ?? null : null;
  const reconstructedSurveyParcel = surveyState.parcels.find((entry) => entry.source === "title_reconstruction") ?? null;
  const titleCommitments = titleWorkspace?.commitments ?? [];
  const orderedCommitments = [...titleCommitments].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
  const activeCommitment =
    orderedCommitments.find((entry) => entry.isPrimary)
    ?? orderedCommitments[0]
    ?? null;
  const activeCommitmentReferences = activeCommitment
    ? (titleWorkspace?.references ?? []).filter((entry) => entry.titleCommitmentId === activeCommitment.id)
    : [];
  const visitedReferenceCount = activeCommitmentReferences.filter((entry) => entry.visitStatus === "visited" || Boolean(entry.visitedProjectDocumentId)).length;
  const missingReferenceCount = Math.max(0, activeCommitmentReferences.length - visitedReferenceCount);
  const recommendedActions = Array.isArray(parcel?.intelligence?.recommendations.recommendedNextActions)
    ? parcel?.intelligence?.recommendations.recommendedNextActions.map(String)
    : [];
  const scenarioRange = parcelScenarios.length
    ? `${Math.min(...parcelScenarios.map((scenario) => scenario.units))}-${Math.max(...parcelScenarios.map((scenario) => scenario.units))}`
    : "Not modeled";
  const currentStep = !parcel?.intelligence
    ? "Analyze parcel"
    : !selectedLayout
      ? "Generate layout"
      : !selectedScenario
        ? "Evaluate yield"
        : "Prepare site plan";
  const workflowReadiness = selectedLayout && selectedScenario
    ? "Ready for site planning and export review."
    : selectedLayout
      ? "Layout is selected. Lock a yield scenario next."
        : parcel?.intelligence
          ? "Parcel is analyzed. Generate or pin a layout next."
          : "Run parcel analysis first.";
  const riskLevel: "Low" | "Medium" | "High" = !parcel?.intelligence
    ? "Medium"
    : parcel.intelligence.riskScore >= 67
      ? "High"
      : parcel.intelligence.riskScore >= 34
        ? "Medium"
        : "Low";
  const recommendationNotes = [
    parcel?.intelligence ? `Buildable area currently reads ${(parcel.intelligence.buildableAreaAcres ?? 0).toFixed(2)} acres.` : "Parcel analysis has not been run yet.",
    compareLayout ? `${compareLayout.name} is pinned for comparison.` : "Pin a second layout to compare tradeoffs.",
  ];
  const spatialReviewBlockers = [
    !parcelSelection ? "Attach a primary parcel anchor from Property before pushing title and survey decisions downstream." : null,
    !activeCommitment ? "Upload or assign a primary title commitment so the record stack is tied to the parcel." : null,
    activeCommitment && !activeCommitment.parcelSnapshotId ? "Link the active title commitment to the anchored parcel snapshot." : null,
    activeCommitment && parcelSelection?.parcelSnapshotId && activeCommitment.parcelSnapshotId && activeCommitment.parcelSnapshotId !== parcelSelection.parcelSnapshotId
      ? "The primary title commitment is linked to a different parcel snapshot than the active parcel anchor."
      : null,
    activeCommitmentReferences.length && missingReferenceCount ? `${missingReferenceCount} expected title reference${missingReferenceCount === 1 ? "" : "s"} still need a visited document.` : null,
    !canonicalSurveyParcel ? "Sync the anchored parcel into canonical survey state before final review." : null,
    canonicalSurveyParcel && !canonicalSurveyParcel.closure.withinTolerance ? "The parcel-sourced survey boundary is outside closure tolerance and should be reviewed." : null,
    !reconstructedSurveyParcel ? "Promote a reconstructed description from Title Intake so record geometry can be compared against the parcel anchor." : null,
    reconstructedSurveyParcel && !reconstructedSurveyParcel.closure.withinTolerance ? "The promoted title reconstruction does not close within tolerance yet." : null,
  ].filter(Boolean) as string[];
  const spatialReviewSignals = [
    parcelSelection
      ? `Parcel anchor ${parcelSelection.providerParcelId} is attached from ${parcelSelection.parcelProvider}.`
      : "No parcel anchor is attached yet.",
    activeCommitment
      ? activeCommitmentReferences.length
        ? `${visitedReferenceCount}/${activeCommitmentReferences.length} title references have matching visited documents.`
        : "The primary title commitment is present, but expected references have not been logged yet."
      : "No primary title commitment is active yet.",
    reconstructedSurveyParcel
      ? `Survey comparison parcel is sourced from ${reconstructedSurveyParcel.source.replaceAll("_", " ")}.`
      : "Record geometry has not been promoted into survey review yet.",
  ];
  const layoutRows = parcelLayouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
    lots: layout.lotCount,
    efficiency: selectedParcelEfficiency(layout),
    units: layout.yieldUnits,
    roi: null,
    selected: layout.id === selectedLayout?.id,
  }));
  const lastSurveySyncRef = useRef<string>("");

  useEffect(() => {
    if (!parcel?.id || !parcel.polygon.length) return;
    const signature = boundarySignature(parcel.id, parcel.polygon);
    if (lastSurveySyncRef.current !== signature) {
      lastSurveySyncRef.current = signature;
      surveyState.syncSurveyParcelFromBoundary(parcel.id, parcel.polygon);
    }
    if (!surveyState.activeSurveyParcelId) {
      surveyState.setActiveSurveyParcelId(parcel.id);
    }
  }, [
    parcel?.id,
    parcel?.polygon,
    surveyState.activeSurveyParcelId,
    surveyState.setActiveSurveyParcelId,
    surveyState.syncSurveyParcelFromBoundary,
  ]);

  return (
    <div className={styles.page}>
      <WorkflowProgress
        current={selectedLayout && selectedScenario ? "site-planner" : selectedLayout ? "yield" : "parcel"}
        layoutReady={Boolean(selectedLayout)}
        parcelReady={Boolean(parcel?.intelligence)}
        projectId={projectId}
        scenarioReady={Boolean(selectedScenario)}
      />
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroText}>
            <div className={styles.inlineMeta}>
              <span className={styles.workspacePill}>{meta.label}</span>
              <span className={styles.workspacePill}>{meta.badge}</span>
            </div>
            <h2>{project?.name ?? "Project workflow"}</h2>
            <p>{headline} This flow now runs as Analyze / Decide / Generate / Evaluate / Iterate, using parcel intelligence as the starting truth.</p>
          </div>
          <div className={styles.heroActions}>
            <Link to={`/app/projects/${projectId}/title`}><Button variant="ghost">Open title intake</Button></Link>
            <Link to={`/app/projects/${projectId}/parcel`}><Button variant="secondary">Open property</Button></Link>
            <Link to={`/app/projects/${projectId}/subdivision`}><Button>Open live workflow</Button></Link>
            <Link to={`/app/projects/${projectId}/design`}><Button variant="ghost">Open design console</Button></Link>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span>Buildable Area</span>
            <strong>{parcel?.intelligence?.buildableAreaAcres?.toFixed(2) ?? parcel?.buildableAcres?.toFixed(2) ?? "0.00"} ac</strong>
          </div>
          <div className={styles.statCard}>
            <span>Recommended Strategy</span>
            <strong>{formatStrategy(parcel?.intelligence?.bestSubdivisionStrategy)}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Expected Yield</span>
            <strong>{scenarioRange} homes</strong>
          </div>
          <div className={styles.statCard}>
            <span>Title Docs</span>
            <strong>{titleDocumentCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Saved Concepts</span>
            <strong>{development?.layouts.length ?? 0}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Survey Issues</span>
            <strong>{surveyState.issues.length}</strong>
          </div>
        </div>
        <div className={styles.workflowBanner}>
          <div className={styles.workflowBannerBody}>
            <strong>Current workflow step: {currentStep}</strong>
            <span>{workflowReadiness}</span>
          </div>
          <div className={styles.heroActions}>
            <Link to={`/app/projects/${projectId}/yield`}><Button variant="secondary">Open yield</Button></Link>
            <Link to={`/app/projects/${projectId}/site-planner`}><Button>Open site plan</Button></Link>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.decisionGrid}>
          <WorkspaceModeSwitcher />
          <RecommendationPanel
            bestStrategy={formatStrategy(parcel?.intelligence?.bestSubdivisionStrategy)}
            expectedUnitRange={scenarioRange}
            nextAction={workflowReadiness}
            notes={recommendationNotes}
            riskLevel={riskLevel}
          />
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Spatial truth chain</strong>
            <p>The parcel anchor now drives title completeness and survey promotion so one authoritative geometry thread can feed design decisions.</p>
          </div>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Parcel anchor</strong>
              <p>
                {parcelSelection
                  ? `${parcelSelection.address || parcelSelection.parcelName || parcelSelection.providerParcelId} is attached as the active parcel anchor.`
                  : "No parcel anchor is attached yet. Start in Property and confirm a provider parcel first."}
              </p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Provider</span><span>{parcelSelection?.parcelProvider ?? "Pending"}</span></div>
              <div className={styles.kv}><span>Snapshot</span><span>{parcelSelection?.parcelSnapshotId ? "Saved" : "Not linked"}</span></div>
              <div className={styles.kv}><span>Status</span><span>{parcelSelection?.anchorStatus ?? "Missing"}</span></div>
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Title evidence</strong>
              <p>
                {activeCommitment
                  ? `${activeCommitment.title} is the current primary commitment for parcel-driven review.`
                  : "Upload a title commitment to begin parcel-linked title review."}
              </p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Primary commitment</span><span>{activeCommitment ? "Assigned" : "Missing"}</span></div>
              <div className={styles.kv}><span>Expected refs</span><span>{activeCommitmentReferences.length}</span></div>
              <div className={styles.kv}><span>Visited docs</span><span>{visitedReferenceCount}</span></div>
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Survey review</strong>
              <p>
                {canonicalSurveyParcel
                  ? `Canonical parcel ${canonicalSurveyParcel.id} is synced into survey state and closes ${canonicalSurveyParcel.closure.withinTolerance ? "within" : "outside"} tolerance.`
                  : "Parcel geometry has not been synchronized into survey state yet."}
              </p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Parcel sync</span><span>{canonicalSurveyParcel ? "Ready" : "Pending"}</span></div>
              <div className={styles.kv}><span>Record comparison</span><span>{reconstructedSurveyParcel ? "Promoted" : "Not promoted"}</span></div>
              <div className={styles.kv}><span>Open issues</span><span>{surveyState.issues.length}</span></div>
            </div>
          </article>
        </div>
        <div className={styles.insightGrid}>
          <article className={styles.insightCard}>
            <div className={styles.insightBody}>
              <strong>Readiness signals</strong>
              <div className={styles.warningList}>
                {spatialReviewSignals.map((signal) => (
                  <div className={styles.successItem} key={signal}>{signal}</div>
                ))}
              </div>
            </div>
          </article>
          <article className={styles.insightCard}>
            <div className={styles.insightBody}>
              <strong>Current blockers</strong>
              {spatialReviewBlockers.length ? (
                <div className={styles.warningList}>
                  {spatialReviewBlockers.map((item) => (
                    <div className={styles.warningItem} key={item}>{item}</div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>The parcel anchor, title stack, and survey review chain are aligned well enough to move into design and reporting.</p>
              )}
            </div>
          </article>
          <article className={styles.insightCard}>
            <div className={styles.insightBody}>
              <strong>Next review actions</strong>
              <p>
                Use Title Intake to finish linked evidence, then confirm the promoted reconstruction in Survey Tools before locking layouts or export outputs.
              </p>
              <div className={styles.ctaRow}>
                <Link to={`/app/projects/${projectId}/title`}><Button variant="secondary">Open title review</Button></Link>
                <Link to="/app/advanced/survey"><Button variant="ghost">Open survey tools</Button></Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Workflow context</strong>
            <p>Selections now carry across Property, Subdivision, Yield, and Site Planner so the team can stay in one decision thread.</p>
          </div>
        </div>
        <div className={styles.selectionGrid}>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Active parcel</strong>
            </div>
            <div className={styles.selectionList}>
              {(development?.parcels ?? []).map((entry) => (
                <button
                  className={`${styles.selectionButton} ${entry.id === parcel?.id ? styles.selectionButtonActive : ""}`}
                  key={entry.id}
                  onClick={() => {
                    workflow.setParcelId(entry.id);
                    workflow.setLayoutId("");
                    workflow.setCompareLayoutId("");
                    workflow.setScenarioId("");
                    workflow.setCompareScenarioId("");
                  }}
                  type="button"
                >
                  <strong>{entry.name}</strong>
                  <span className={styles.muted}>{(entry.intelligence?.buildableAreaAcres ?? entry.buildableAcres).toFixed(2)} buildable ac</span>
                </button>
              ))}
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Active layout</strong>
            </div>
            <div className={styles.selectionList}>
              <button
                className={`${styles.selectionButton} ${!workflow.layoutId ? styles.selectionButtonActive : ""}`}
                onClick={() => {
                  workflow.setLayoutId("");
                  workflow.setCompareLayoutId("");
                }}
                type="button"
              >
                <strong>Parcel only</strong>
                <span className={styles.muted}>No saved layout pinned</span>
              </button>
              {parcelLayouts.map((layout) => (
                <button
                  className={`${styles.selectionButton} ${layout.id === selectedLayout?.id ? styles.selectionButtonActive : ""}`}
                  key={layout.id}
                  onClick={() => workflow.setLayoutId(layout.id)}
                  type="button"
                >
                  <strong>{layout.name}</strong>
                  <span className={styles.muted}>{layout.lotCount} lots | {layout.yieldUnits} units</span>
                </button>
              ))}
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Active scenario</strong>
            </div>
            <div className={styles.selectionList}>
              <button
                className={`${styles.selectionButton} ${!workflow.scenarioId ? styles.selectionButtonActive : ""}`}
                onClick={() => {
                  workflow.setScenarioId("");
                  workflow.setCompareScenarioId("");
                }}
                type="button"
              >
                <strong>No scenario pinned</strong>
                <span className={styles.muted}>Use the current live yield view</span>
              </button>
              {parcelScenarios.map((scenario) => (
                <button
                  className={`${styles.selectionButton} ${scenario.id === selectedScenario?.id ? styles.selectionButtonActive : ""}`}
                  key={scenario.id}
                  onClick={() => workflow.setScenarioId(scenario.id)}
                  type="button"
                >
                  <strong>{scenario.title}</strong>
                  <span className={styles.muted}>{scenario.units} homes | {scenario.product}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Layout comparison</strong>
            <p>Choose the preferred concept here, then carry that decision into yield and site planning.</p>
          </div>
        </div>
        <LayoutComparisonTable rows={layoutRows} onSelect={(layoutId) => workflow.setLayoutId(layoutId)} />
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Comparison pins</strong>
            <p>Pin a second saved layout or saved scenario here, then open Yield to compare outcomes side by side.</p>
          </div>
        </div>
        <div className={styles.compareGrid}>
          <article className={styles.compareCard}>
            <strong>Layout comparison</strong>
            <div className={styles.kv}><span>Primary</span><span>{selectedLayout?.name ?? "Parcel only"}</span></div>
            <div className={styles.kv}><span>Compare</span><span>{compareLayout?.name ?? "None pinned"}</span></div>
            <div className={styles.selectionList}>
              <button className={`${styles.selectionButton} ${!workflow.compareLayoutId ? styles.selectionButtonActive : ""}`} onClick={() => workflow.setCompareLayoutId("")} type="button">
                <strong>No compare layout</strong>
              </button>
              {parcelLayouts.filter((layout) => layout.id !== selectedLayout?.id).map((layout) => (
                <button
                  className={`${styles.selectionButton} ${layout.id === compareLayout?.id ? styles.selectionButtonActive : ""}`}
                  key={`compare-layout-${layout.id}`}
                  onClick={() => workflow.setCompareLayoutId(layout.id)}
                  type="button"
                >
                  <strong>{layout.name}</strong>
                  <span className={styles.muted}>{layout.lotCount} lots | {layout.yieldUnits} units</span>
                </button>
              ))}
            </div>
          </article>
          <article className={styles.compareCard}>
            <strong>Scenario comparison</strong>
            <div className={styles.kv}><span>Primary</span><span>{selectedScenario?.title ?? "Live scenario"}</span></div>
            <div className={styles.kv}><span>Compare</span><span>{compareScenario?.title ?? "None pinned"}</span></div>
            <div className={styles.selectionList}>
              <button className={`${styles.selectionButton} ${!workflow.compareScenarioId ? styles.selectionButtonActive : ""}`} onClick={() => workflow.setCompareScenarioId("")} type="button">
                <strong>No compare scenario</strong>
              </button>
              {parcelScenarios.filter((scenario) => scenario.id !== selectedScenario?.id).map((scenario) => (
                <button
                  className={`${styles.selectionButton} ${scenario.id === compareScenario?.id ? styles.selectionButtonActive : ""}`}
                  key={`compare-scenario-${scenario.id}`}
                  onClick={() => workflow.setCompareScenarioId(scenario.id)}
                  type="button"
                >
                  <strong>{scenario.title}</strong>
                  <span className={styles.muted}>{scenario.units} homes | {scenario.product}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Master workflow</strong>
            <p>The product now guides the team from parcel understanding into a layout decision, then into yield and presentation.</p>
          </div>
          <span className={styles.statusPill}>Sprint 5 workflow</span>
        </div>
        <div className={styles.stepGrid}>
          <article className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>0</span>
              <span className={styles.badge}>Intake</span>
            </div>
            <div className={styles.stepBody}>
              <strong>Title-first record stack</strong>
              <p>Start with the title commitment and supporting records so survey reconstruction can be defended from source documents, not just geometry.</p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Title docs</span><span>{titleDocumentCount}</span></div>
              <div className={styles.kv}><span>Supporting docs</span><span>{development?.documents.length ?? 0}</span></div>
              <div className={styles.kv}><span>Next</span><span>{titleDocumentCount ? "Review title intake" : "Upload title package"}</span></div>
            </div>
            <div className={styles.ctaRow}>
              <Link to={`/app/projects/${projectId}/title`}><Button variant="secondary">Open title intake</Button></Link>
              <Link to={`/app/projects/${projectId}/documents`}><Button variant="ghost">Open documents</Button></Link>
            </div>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.badge}>Analyze</span>
            </div>
            <div className={styles.stepBody}>
              <strong>Parcel intelligence</strong>
              <p>Use the parcel record as truth for buildable land, frontage, risk, and recommended strategy.</p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Shape</span><span>{parcel?.intelligence?.shapeClassification?.replaceAll("_", " ") ?? "Run analysis"}</span></div>
              <div className={styles.kv}><span>Frontage</span><span>{parcel?.intelligence?.frontageFt?.toFixed(0) ?? parcel?.frontageFeet ?? 0} ft</span></div>
              <div className={styles.kv}><span>Constraint risk</span><span>{parcel?.intelligence ? `${parcel.intelligence.riskScore.toFixed(0)} / 100` : "Pending"}</span></div>
            </div>
            <div className={styles.ctaRow}>
              <Link to={`/app/projects/${projectId}/parcel`}><Button variant="secondary">Review parcel</Button></Link>
            </div>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.badge}>Generate</span>
            </div>
            <div className={styles.stepBody}>
              <strong>Guided layout generation</strong>
              <p>Start from the recommended strategy, then tune frontage, depth, density, and corridor assumptions live.</p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Best saved layout</span><span>{bestLayout?.name ?? "No saved layout"}</span></div>
              <div className={styles.kv}><span>Lots</span><span>{bestLayout?.lotCount ?? 0}</span></div>
              <div className={styles.kv}><span>Yield units</span><span>{bestLayout?.yieldUnits ?? 0}</span></div>
            </div>
            <div className={styles.ctaRow}>
              <Link to={`/app/projects/${projectId}/subdivision`}><Button>Generate layout</Button></Link>
            </div>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.badge}>Evaluate</span>
            </div>
            <div className={styles.stepBody}>
              <strong>Yield comparison</strong>
              <p>Turn layout outputs into business-ready scenarios so the team can compare upside before exporting or planning.</p>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kv}><span>Best scenario</span><span>{bestScenario?.title ?? "No saved scenario"}</span></div>
              <div className={styles.kv}><span>Units</span><span>{bestScenario?.units ?? 0}</span></div>
              <div className={styles.kv}><span>Product</span><span>{bestScenario?.product ?? "Not set"}</span></div>
            </div>
            <div className={styles.ctaRow}>
              <Link to={`/app/projects/${projectId}/yield`}><Button variant="secondary">Compare yield</Button></Link>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Open site plan</Button></Link>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Recommendation layer</strong>
            <p>The app now leads with suggested actions instead of raw geometry terms.</p>
          </div>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Best strategy</strong>
              <p>
                {parcel?.intelligence
                  ? `The current parcel most strongly supports ${formatStrategy(parcel.intelligence.bestSubdivisionStrategy)}.`
                  : "Run parcel analysis to recommend the next design move."}
              </p>
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Expected yield</strong>
              <p>
                {selectedScenario
                  ? `Saved concepts currently suggest ${scenarioRange} homes depending on layout and assumptions.`
                  : "No saved yield range yet. Start from the generated property recommendation."}
              </p>
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Workspace emphasis</strong>
              <p>
                {isAcquisition
                  ? "This workspace leads with risk, upside, and go / no-go clarity."
                  : isBuilder
                    ? "This workspace keeps circulation, overlays, and plan readiness front and center."
                    : `This ${meta.label.toLowerCase()} flow keeps the product focused on decisions, not survey jargon.`}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Survey readiness</strong>
            <p>The survey engine is now part of the same project workflow, so title review and parcel analysis can share one decision thread.</p>
          </div>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Canonical survey state</strong>
              <p>
                {activeSurveyParcel
                  ? `Active survey parcel ${activeSurveyParcel.id} is sourced from ${activeSurveyParcel.source.replaceAll("_", " ")} and closes ${activeSurveyParcel.closure.withinTolerance ? "within tolerance" : "outside tolerance"}.`
                  : "No survey parcel has been promoted yet. Use Title Intake to promote a reconstructed boundary into survey state."}
              </p>
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Reference metadata</strong>
              <p>
                Reference system: {surveyState.referenceSystem}. Measurement unit: {surveyState.measurementUnit.replaceAll("_", " ")}.
              </p>
            </div>
          </article>
          <article className={styles.summaryCard}>
            <div className={styles.summaryBody}>
              <strong>Survey workflow</strong>
              <p>
                {surveyState.auditTrail.length
                  ? `${surveyState.auditTrail.length} survey actions have been logged for this project.`
                  : "No survey audit actions logged yet. Start in Title Intake, save a review, then promote the description into survey state."}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Current signals</strong>
            <p>Warnings and next actions stay visible so teams can move quickly without hiding uncertainty.</p>
          </div>
        </div>
        <div className={styles.insightGrid}>
          <article className={styles.insightCard}>
            <div className={styles.insightBody}>
              <strong>Recommended next actions</strong>
              {recommendedActions.length ? (
                <div className={styles.warningList}>
                  {recommendedActions.map((step) => (
                    <div className={styles.successItem} key={step}>{step}</div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>Run parcel analysis to populate guided next actions.</p>
              )}
            </div>
          </article>
          <article className={styles.insightCard}>
            <div className={styles.insightBody}>
              <strong>Warnings</strong>
              {analysisWarnings.length ? (
                <div className={styles.warningList}>
                  {analysisWarnings.map((warning) => (
                    <div className={styles.warningItem} key={`${warning.code}-${warning.message}`}>{warning.message}</div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No current parcel warnings.</p>
              )}
            </div>
          </article>
          <article className={styles.insightCard}>
            <div className={styles.insightBody}>
              <strong>Presentation readiness</strong>
              <p>Use Site Planner and Reports after you choose a layout. The strongest demo path is Property / Subdivision / Yield / Site Plan / Reports.</p>
              <div className={styles.ctaRow}>
                <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="secondary">Open site plan</Button></Link>
                <Link to={`/app/projects/${projectId}/documents`}><Button variant="ghost">Open reports</Button></Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stepHeader}>
          <div className={styles.summaryBody}>
            <strong>Handoff readiness</strong>
            <p>The last Sprint 5 pass keeps the workflow honest about what is ready for site planning and presentation.</p>
          </div>
        </div>
        <div className={styles.handoffGrid}>
          <article className={styles.handoffCard}>
            <strong>Primary decision thread</strong>
            <div className={styles.kv}><span>Parcel</span><span>{parcel?.name ?? "None selected"}</span></div>
            <div className={styles.kv}><span>Layout</span><span>{selectedLayout?.name ?? "No layout pinned"}</span></div>
            <div className={styles.kv}><span>Scenario</span><span>{selectedScenario?.title ?? "No scenario pinned"}</span></div>
            <div className={styles.kv}><span>Next screen</span><span>{selectedLayout && selectedScenario ? "Site Planner" : selectedLayout ? "Yield" : "Subdivision"}</span></div>
          </article>
          <article className={styles.handoffCard}>
            <strong>Comparison thread</strong>
            <div className={styles.kv}><span>Compare layout</span><span>{compareLayout?.name ?? "None pinned"}</span></div>
            <div className={styles.kv}><span>Compare scenario</span><span>{compareScenario?.title ?? "None pinned"}</span></div>
            <div className={styles.kv}><span>Compare outcome</span><span>{compareLayout || compareScenario ? "Ready in yield and site plan context" : "Pin a second concept to compare"}</span></div>
            <div className={styles.ctaRow}>
              <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Compare layouts</Button></Link>
              <Link to={`/app/projects/${projectId}/yield`}><Button variant="ghost">Compare scenarios</Button></Link>
            </div>
          </article>
          <article className={styles.handoffCard}>
            <strong>Site plan readiness</strong>
            <p>
              {selectedLayout && selectedScenario
                ? "The planner can now show the active layout guide under the concept plan and keep the chosen yield scenario visible in the title block."
                : "The planner is available now, but it gets much more persuasive once you pin both a layout and a scenario from this workflow."}
            </p>
            <div className={styles.ctaRow}>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button>Open site plan</Button></Link>
              <Link to={`/app/projects/${projectId}/documents`}><Button variant="ghost">Open reports</Button></Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function selectedParcelEfficiency(layout: { averageLotAreaSqft: number; lotCount: number; yieldUnits: number }) {
  if (!layout.lotCount || !layout.averageLotAreaSqft) return 0;
  return Math.min(100, (layout.yieldUnits / layout.lotCount) * 100);
}
