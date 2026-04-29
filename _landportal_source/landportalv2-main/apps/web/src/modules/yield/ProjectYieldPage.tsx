import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { calculateYieldScenario, generateScenarioSet } from "@landportal/core-yield";

import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { RecommendationPanel } from "@/modules/recommendations/RecommendationPanel";
import { useAuthStore } from "@/modules/auth/authStore";
import { resolveActiveParcelId } from "@/modules/parcel/activeParcelAnchor";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { useProjectWorkflow } from "@/modules/projects/useProjectWorkflow";
import { useCreateYieldScenario, useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjects } from "@/modules/projects/useProjects";
import { useWorkspace } from "@/modules/workspace/useWorkspace";

import styles from "./ProjectYieldPage.module.css";

const defaultInputs = {
  averageLotSizeSqft: 6000,
  hardCostPerUnit: 220000,
  landCost: 1800000,
  homesPerAcre: 4,
  name: "Developer concept",
  openSpacePercent: 20,
  pricePerUnit: 425000,
  productType: "Single-family",
  setbackFt: 12,
  softCostPercent: 0.18,
};

export function ProjectYieldPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const createScenario = useCreateYieldScenario(projectId);
  const user = useAuthStore((state) => state.user);
  const { meta, isAcquisition } = useWorkspace();
  const workflow = useProjectWorkflow(projectId);

  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [inputs, setInputs] = useState(defaultInputs);

  useEffect(() => {
    if (!development?.parcels.length) return;
    const preferredParcelId = resolveActiveParcelId(parcelSelection, workflow.parcelId, development.parcels);
    setSelectedParcelId((current) => current || preferredParcelId);
  }, [development?.parcels, parcelSelection, workflow.parcelId]);

  useEffect(() => {
    if (!development?.scenarios.length) return;
    setSelectedScenarioId((current) => current || workflow.scenarioId || development.scenarios[0].id);
  }, [development?.scenarios, workflow.scenarioId]);

  const hasProviderOnlyAnchor = Boolean(parcelSelection?.providerParcelId && !parcelSelection?.parcelSnapshotId);
  const selectedParcel =
    development?.parcels.find((parcel) => parcel.id === selectedParcelId)
    ?? (hasProviderOnlyAnchor ? null : development?.parcels[0] ?? null);
  const parcelLayouts = useMemo(() => {
    if (!development?.layouts.length || !selectedParcel) return [];
    return development.layouts.filter((layout) => !layout.parcelId || layout.parcelId === selectedParcel.id);
  }, [development?.layouts, selectedParcel]);
  const savedScenarios = useMemo(() => {
    if (!development?.scenarios.length) return [];
    return development.scenarios.filter((scenario) => !selectedParcel || !scenario.parcelId || scenario.parcelId === selectedParcel.id);
  }, [development?.scenarios, selectedParcel]);

  const selectedLayout = parcelLayouts.find((layout) => layout.id === selectedLayoutId) ?? parcelLayouts[0] ?? null;
  const compareLayout = parcelLayouts.find((layout) => layout.id === workflow.compareLayoutId) ?? null;
  const selectedScenario = savedScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? savedScenarios[0] ?? null;
  const compareScenario = savedScenarios.find((scenario) => scenario.id === workflow.compareScenarioId) ?? null;

  useEffect(() => {
    if (!selectedLayoutId) return;
    if (parcelLayouts.some((layout) => layout.id === selectedLayoutId)) return;
    setSelectedLayoutId("");
  }, [parcelLayouts, selectedLayoutId]);

  useEffect(() => {
    if (!selectedScenarioId) return;
    if (savedScenarios.some((scenario) => scenario.id === selectedScenarioId)) return;
    setSelectedScenarioId("");
  }, [savedScenarios, selectedScenarioId]);

  useEffect(() => {
    if (!workflow.compareLayoutId) return;
    if (parcelLayouts.some((layout) => layout.id === workflow.compareLayoutId)) return;
    workflow.setCompareLayoutId("");
  }, [parcelLayouts, workflow]);

  useEffect(() => {
    if (!workflow.compareScenarioId) return;
    if (savedScenarios.some((scenario) => scenario.id === workflow.compareScenarioId)) return;
    workflow.setCompareScenarioId("");
  }, [savedScenarios, workflow]);

  useEffect(() => {
    if (workflow.layoutId) {
      setSelectedLayoutId((current) => current || workflow.layoutId);
    }
  }, [workflow.layoutId]);

  useEffect(() => {
    if (!selectedParcelId) return;
    if (workflow.parcelId === selectedParcelId) return;
    workflow.setParcelId(selectedParcelId);
  }, [selectedParcelId, workflow]);

  useEffect(() => {
    if (workflow.layoutId === selectedLayoutId) return;
    workflow.setLayoutId(selectedLayoutId);
  }, [selectedLayoutId, workflow]);

  useEffect(() => {
    if (workflow.scenarioId === selectedScenarioId) return;
    workflow.setScenarioId(selectedScenarioId);
  }, [selectedScenarioId, workflow]);

  useEffect(() => {
    if (!selectedScenario) return;
    setInputs({
      averageLotSizeSqft: Math.max(selectedScenario.averageLot || defaultInputs.averageLotSizeSqft, 1200),
      homesPerAcre: Math.max(selectedScenario.density || defaultInputs.homesPerAcre, 1),
      hardCostPerUnit: defaultInputs.hardCostPerUnit,
      landCost: defaultInputs.landCost,
      name: `${selectedScenario.title} refresh`,
      openSpacePercent: selectedScenario.openSpacePercent || defaultInputs.openSpacePercent,
      pricePerUnit: defaultInputs.pricePerUnit,
      productType: selectedScenario.product || defaultInputs.productType,
      setbackFt: defaultInputs.setbackFt,
      softCostPercent: defaultInputs.softCostPercent,
    });
  }, [selectedScenario?.id]);

  const liveResult = useMemo(() => {
    if (!selectedParcel?.intelligence) return null;
    return calculateYieldScenario(inputs, {
      parcelAreaAcres: selectedParcel.areaAcres,
      buildableAcres: selectedParcel.intelligence.buildableAreaAcres ?? selectedParcel.buildableAcres,
      frontageFt: selectedParcel.intelligence.frontageFt ?? selectedParcel.frontageFeet,
      existingLotCount: selectedLayout?.lotCount,
      constraintCoveragePercent: selectedParcel.intelligence.constraintCoveragePercent,
      buildabilityScore: selectedParcel.intelligence.buildabilityScore,
      recommendedStrategy: selectedParcel.intelligence.bestSubdivisionStrategy ?? null,
    });
  }, [inputs, selectedLayout?.lotCount, selectedParcel]);

  const bestSavedScenario = useMemo(() => {
    return savedScenarios.reduce<(typeof selectedScenario) | null>((best, scenario) => {
      if (!best || scenario.units > best.units) return scenario;
      return best;
    }, null);
  }, [savedScenarios]);

  const scenarioSet = useMemo(() => {
    if (!selectedParcel?.intelligence) return [];
    return generateScenarioSet({
      input: inputs,
      context: {
        parcelAreaAcres: selectedParcel.areaAcres,
        buildableAcres: selectedParcel.intelligence.buildableAreaAcres,
        frontageFt: selectedParcel.intelligence.frontageFt,
        existingLotCount: selectedLayout?.lotCount,
        constraintCoveragePercent: selectedParcel.intelligence.constraintCoveragePercent,
        buildabilityScore: selectedParcel.intelligence.buildabilityScore,
        recommendedStrategy: selectedParcel.intelligence.bestSubdivisionStrategy,
      },
      assumptions: {
        productType: inputs.productType === "Townhome" ? "townhouse" : inputs.productType === "Cottage court" ? "cottage" : inputs.productType === "Mixed housing" ? "duplex" : "sfr",
        pricePerUnit: inputs.pricePerUnit,
        hardCostPerUnit: inputs.hardCostPerUnit,
        softCostPercent: inputs.softCostPercent,
        landCost: inputs.landCost,
      },
      validLotCount: selectedLayout?.yieldUnits ?? null,
    });
  }, [inputs, selectedLayout?.lotCount, selectedLayout?.yieldUnits, selectedParcel]);

  const compareScenarioSet = useMemo(() => {
    if (!selectedParcel?.intelligence || !compareLayout) return [];
    return generateScenarioSet({
      input: inputs,
      context: {
        parcelAreaAcres: selectedParcel.areaAcres,
        buildableAcres: selectedParcel.intelligence.buildableAreaAcres,
        frontageFt: selectedParcel.intelligence.frontageFt,
        existingLotCount: compareLayout.lotCount,
        constraintCoveragePercent: selectedParcel.intelligence.constraintCoveragePercent,
        buildabilityScore: selectedParcel.intelligence.buildabilityScore,
        recommendedStrategy: selectedParcel.intelligence.bestSubdivisionStrategy,
      },
      assumptions: {
        productType: inputs.productType === "Townhome" ? "townhouse" : inputs.productType === "Cottage court" ? "cottage" : inputs.productType === "Mixed housing" ? "duplex" : "sfr",
        pricePerUnit: inputs.pricePerUnit,
        hardCostPerUnit: inputs.hardCostPerUnit,
        softCostPercent: inputs.softCostPercent,
        landCost: inputs.landCost,
      },
      validLotCount: compareLayout.yieldUnits ?? null,
    });
  }, [compareLayout, inputs, selectedParcel]);
  const bestLiveScenario = scenarioSet[0] ?? null;
  const riskLevel: "Low" | "Medium" | "High" = !selectedParcel?.intelligence
    ? "Medium"
    : selectedParcel.intelligence.riskScore >= 67
      ? "High"
      : selectedParcel.intelligence.riskScore >= 34
        ? "Medium"
        : "Low";
  const yieldBlockers = [
    !selectedParcel?.intelligence ? "Run parcel analysis before using yield outputs for decisions." : null,
    !liveResult ? "Live yield could not be calculated for the current parcel and inputs." : null,
    !selectedScenario ? "Save or pin a scenario so this decision carries into Site Planner and reports." : null,
  ].filter(Boolean) as string[];
  const yieldWarnings = [
    riskLevel === "High" ? "Parcel risk is high. Treat this result as an upside test, not a recommendation." : null,
    !compareLayout && !compareScenario ? "No comparison option is pinned yet, so tradeoff review is limited." : null,
  ].filter(Boolean) as string[];
  const yieldChecks = [
    bestLiveScenario ? `${bestLiveScenario.name[0].toUpperCase() + bestLiveScenario.name.slice(1)} is currently the strongest generated scenario.` : "No ranked scenario set yet.",
    selectedLayout ? `Yield is capped by layout ${selectedLayout.name}.` : "Yield is running parcel-only with no saved layout cap.",
    savedScenarios.length ? `${savedScenarios.length} saved scenarios are available for this parcel.` : "No saved scenarios exist for this parcel yet.",
  ];
  const yieldTone = yieldBlockers.length ? "blocked" : yieldWarnings.length ? "attention" : "ready";

  if (isLoading) return <LoadingState message="Loading yield analyzer..." />;
  if (error || !development || !selectedParcel) {
    return <div className={styles.page}><div className={styles.card}>Unable to load the yield workspace. {error?.message ?? "No property records are available yet."}</div></div>;
  }

  async function handleSaveScenario() {
    if (!user?.id || !liveResult || !selectedParcel) return;

    const createdScenario = await createScenario.mutateAsync({
      projectId,
      parcelSnapshotId: selectedParcel.id,
      ownerId: user.id,
      name: inputs.name,
      status: "draft",
      assumptions: {
        averageLot: inputs.averageLotSizeSqft,
        density: inputs.homesPerAcre,
        hardCostPerUnit: inputs.hardCostPerUnit,
        landCost: inputs.landCost,
        openSpacePercent: inputs.openSpacePercent,
        pricePerUnit: inputs.pricePerUnit,
        product: inputs.productType,
        setbackFt: inputs.setbackFt,
        softCostPercent: inputs.softCostPercent,
        sourceLayoutId: selectedLayout?.id ?? null,
      },
      results: {
        averageLot: liveResult.estimatedAverageLotSqft,
        buildableArea: liveResult.buildableAreaSqft,
        efficiencyPercent: liveResult.efficiencyPercent,
        frontageSupportUnits: liveResult.frontageSupportUnits,
        units: liveResult.units,
      },
    });
    setSelectedScenarioId(createdScenario.id);
    workflow.setScenarioId(createdScenario.id);
  }

  return (
    <ProjectWorkspaceShell
      currentStep="yield"
      description={
        <p>
            This workspace now behaves like a real decision tool: choose a property, test assumptions,
            compare against saved concepts, and save a new scenario back to the project.
            {" "}
            {isAcquisition
              ? "This view is tuned for go / no-go decisions and upside range."
              : `Current workspace: ${meta.label}.`}
        </p>
      }
      eyebrow="Yield analyzer"
      headerActions={
        <>
          <Link to={`/app/projects/${projectId}/workflow`}><Button variant="ghost">Open workflow</Button></Link>
          <Link to={`/app/projects/${projectId}/parcel`}><Button variant="secondary">Open property</Button></Link>
          <Link to={`/app/projects/${projectId}/subdivision`}><Button>Open subdivision designer</Button></Link>
        </>
      }
      layoutReady={Boolean(workflow.layoutId)}
      parcelReady={Boolean(selectedParcel?.intelligence)}
      projectId={projectId}
      scenarioReady={Boolean(workflow.scenarioId || selectedScenario?.id)}
      title={project?.name ?? "Yield Analyzer"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Back to layout</Button></Link>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Continue to site plan</Button></Link>
            </>
          }
          blockers={yieldBlockers}
          checks={yieldChecks}
          summary="Yield should confirm or challenge the active layout. Save the strongest scenario, compare it against an alternate concept, then carry the preferred option into planning and reports."
          title="Yield readiness"
          tone={yieldTone}
          warnings={yieldWarnings}
        />
      }
    >

      <section className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.panelHeader}>
            <strong>Property context</strong>
            <span className={styles.helper}>Choose the property and optional lot layout you want to test.</span>
          </div>
          <div className={styles.list}>
            {development.parcels.map((parcel) => (
              <button
                className={`${styles.scenarioButton} ${parcel.id === selectedParcel.id ? styles.scenarioButtonActive : ""}`}
                key={parcel.id}
                onClick={() => setSelectedParcelId(parcel.id)}
                type="button"
              >
                <strong>{parcel.name}</strong>
                <span className={styles.muted}>{(parcel.intelligence?.buildableAreaAcres ?? parcel.buildableAcres).toFixed(2)} buildable ac</span>
                <span className={styles.note}>{parcel.intelligence?.frontageFt ?? parcel.frontageFeet} ft frontage | {parcel.zoning}</span>
              </button>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.panelHeader}>
              <strong>Saved concepts</strong>
              <span className={styles.helper}>Optional lot layouts can constrain the live yield calculation.</span>
            </div>
            <div className={styles.list}>
              <button
                className={`${styles.scenarioButton} ${!selectedLayout ? styles.scenarioButtonActive : ""}`}
                onClick={() => setSelectedLayoutId("")}
                type="button"
              >
                <strong>Property only</strong>
                <span className={styles.muted}>Use property frontage and buildable area only.</span>
              </button>
              {parcelLayouts.map((layout) => (
                <button
                  className={`${styles.scenarioButton} ${selectedLayout?.id === layout.id ? styles.scenarioButtonActive : ""}`}
                  key={layout.id}
                  onClick={() => setSelectedLayoutId(layout.id)}
                  type="button"
                >
                  <strong>{layout.name}</strong>
                  <span className={styles.muted}>{layout.lotCount} lots | {layout.averageLotAreaSqft.toLocaleString()} sf avg</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className={styles.canvas}>
          <div className={styles.inputCard}>
            <div className={styles.panelHeader}>
              <strong>Scenario builder</strong>
              <span className={styles.helper}>Adjust plain-language inputs and review the updated result instantly.</span>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Scenario name</span><input onChange={(event) => setInputs((current) => ({ ...current, name: event.target.value }))} value={inputs.name} /></label>
              <label className={styles.field}><span>Product type</span><select onChange={(event) => setInputs((current) => ({ ...current, productType: event.target.value }))} value={inputs.productType}><option>Single-family</option><option>Townhome</option><option>Cottage court</option><option>Mixed housing</option></select></label>
              <label className={styles.field}><span>Homes per acre</span><input min="1" onChange={(event) => setInputs((current) => ({ ...current, homesPerAcre: Number(event.target.value) || 0 }))} step="0.1" type="number" value={inputs.homesPerAcre} /></label>
              <label className={styles.field}><span>Open space %</span><input min="0" onChange={(event) => setInputs((current) => ({ ...current, openSpacePercent: Number(event.target.value) || 0 }))} step="1" type="number" value={inputs.openSpacePercent} /></label>
              <label className={styles.field}><span>Average lot size (sf)</span><input min="1200" onChange={(event) => setInputs((current) => ({ ...current, averageLotSizeSqft: Number(event.target.value) || 0 }))} step="100" type="number" value={inputs.averageLotSizeSqft} /></label>
              <label className={styles.field}><span>Setback buffer (ft)</span><input min="0" onChange={(event) => setInputs((current) => ({ ...current, setbackFt: Number(event.target.value) || 0 }))} step="1" type="number" value={inputs.setbackFt} /></label>
              <label className={styles.field}><span>Price per home ($)</span><input min="0" onChange={(event) => setInputs((current) => ({ ...current, pricePerUnit: Number(event.target.value) || 0 }))} step="1000" type="number" value={inputs.pricePerUnit} /></label>
              <label className={styles.field}><span>Hard cost per home ($)</span><input min="0" onChange={(event) => setInputs((current) => ({ ...current, hardCostPerUnit: Number(event.target.value) || 0 }))} step="1000" type="number" value={inputs.hardCostPerUnit} /></label>
              <label className={styles.field}><span>Soft cost %</span><input min="0" onChange={(event) => setInputs((current) => ({ ...current, softCostPercent: Number(event.target.value) || 0 }))} step="0.01" type="number" value={inputs.softCostPercent} /></label>
              <label className={styles.field}><span>Land cost ($)</span><input min="0" onChange={(event) => setInputs((current) => ({ ...current, landCost: Number(event.target.value) || 0 }))} step="10000" type="number" value={inputs.landCost} /></label>
            </div>
            <div className={styles.inlineActions}>
              <Button disabled={createScenario.isPending || !user?.id} onClick={handleSaveScenario} type="button">
                {createScenario.isPending ? "Saving..." : "Save scenario"}
              </Button>
              <span className={styles.note}>{selectedLayout ? `Using ${selectedLayout.name} as a layout cap.` : "Using the property only with no lot-layout cap."}</span>
            </div>
          </div>

          {liveResult ? (
            <>
              <div className={styles.kpis}>
                <div className={styles.kpiCard}><strong>{liveResult.units}</strong><span className={styles.muted}>Projected homes</span></div>
                <div className={styles.kpiCard}><strong>{liveResult.adjustedBuildableAcres.toFixed(2)} ac</strong><span className={styles.muted}>Effective buildable area</span></div>
                <div className={styles.kpiCard}><strong>{liveResult.estimatedAverageLotSqft.toLocaleString()} sf</strong><span className={styles.muted}>Estimated average lot</span></div>
                <div className={styles.kpiCard}><strong>{liveResult.efficiencyPercent}%</strong><span className={styles.muted}>Layout efficiency</span></div>
              </div>

              <div className={styles.grid}>
                <div className={`${styles.comparisonCard} ${styles.highlight}`}>
                  <div className={styles.panelHeader}>
                    <strong>Live concept</strong>
                    <span className={styles.badge}>Updated instantly</span>
                  </div>
                  <div className={styles.kv}><span>Property</span><span>{selectedParcel.name}</span></div>
                  <div className={styles.kv}><span>Frontage-supported homes</span><span>{liveResult.frontageSupportUnits}</span></div>
                  <div className={styles.kv}><span>Buildable area</span><span>{liveResult.buildableAreaSqft.toLocaleString()} sf</span></div>
                  <div className={styles.kv}><span>Recommended strategy</span><span>{selectedParcel.intelligence?.bestSubdivisionStrategy?.replaceAll("_", " ") ?? "manual review"}</span></div>
                  <div className={styles.kv}><span>Product type</span><span>{inputs.productType}</span></div>
                </div>
                <div className={styles.comparisonCard}>
                  <div className={styles.panelHeader}>
                    <strong>Best saved scenario</strong>
                    <span className={styles.badge}>{bestSavedScenario?.status ?? "none"}</span>
                  </div>
                  {bestSavedScenario ? (
                    <>
                      <div className={styles.kv}><span>Scenario</span><span>{bestSavedScenario.title}</span></div>
                      <div className={styles.kv}><span>Homes</span><span>{bestSavedScenario.units}</span></div>
                      <div className={styles.kv}><span>Open space</span><span>{bestSavedScenario.openSpacePercent}%</span></div>
                      <div className={styles.kv}><span>Homes per acre</span><span>{bestSavedScenario.density.toFixed(1)}</span></div>
                    </>
                  ) : <div className={styles.note}>No saved scenarios yet for this property.</div>}
                </div>
              </div>

              <div className={styles.grid}>
                {scenarioSet.map((scenario) => (
                  <div className={styles.comparisonCard} key={scenario.name}>
                    <div className={styles.panelHeader}>
                      <strong>{scenario.name[0].toUpperCase() + scenario.name.slice(1)}</strong>
                      <span className={styles.badge}>{scenario.unitCount} units</span>
                    </div>
                    <div className={styles.kv}><span>Lots</span><span>{scenario.lotCount}</span></div>
                    <div className={styles.kv}><span>Revenue</span><span>${scenario.totalRevenue.toLocaleString()}</span></div>
                    <div className={styles.kv}><span>Total cost</span><span>${scenario.totalCost.toLocaleString()}</span></div>
                    <div className={styles.kv}><span>Margin</span><span>${scenario.grossMargin.toLocaleString()}</span></div>
                    <div className={styles.kv}><span>ROI</span><span>{scenario.roiPercent}%</span></div>
                    <div className={styles.kv}><span>Break-even land</span><span>${scenario.breakEvenLandValue.toLocaleString()}</span></div>
                  </div>
                ))}
              </div>

              {(compareLayout || compareScenario) ? (
                <div className={styles.grid}>
                  <div className={styles.comparisonCard}>
                    <div className={styles.panelHeader}>
                      <strong>Comparison context</strong>
                      <span className={styles.badge}>{compareLayout ? "Layout compare" : "Scenario compare"}</span>
                    </div>
                    <div className={styles.kv}><span>Primary layout</span><span>{selectedLayout?.name ?? "Property only"}</span></div>
                    <div className={styles.kv}><span>Compare layout</span><span>{compareLayout?.name ?? "None"}</span></div>
                    <div className={styles.kv}><span>Primary scenario</span><span>{selectedScenario?.title ?? "Live scenario"}</span></div>
                    <div className={styles.kv}><span>Compare scenario</span><span>{compareScenario?.title ?? "Generated compare"}</span></div>
                  </div>
                  <div className={styles.comparisonCard}>
                    <div className={styles.panelHeader}>
                      <strong>Primary vs compare</strong>
                    </div>
                    <div className={styles.kv}><span>Primary units</span><span>{selectedScenario?.units ?? liveResult.units}</span></div>
                    <div className={styles.kv}><span>Compare units</span><span>{compareScenario?.units ?? compareScenarioSet[1]?.unitCount ?? compareScenarioSet[0]?.unitCount ?? "N/A"}</span></div>
                    <div className={styles.kv}><span>Unit delta</span><span>{((compareScenario?.units ?? compareScenarioSet[1]?.unitCount ?? compareScenarioSet[0]?.unitCount ?? 0) - (selectedScenario?.units ?? liveResult.units)).toLocaleString()}</span></div>
                    <div className={styles.kv}><span>Primary lots</span><span>{selectedLayout?.lotCount ?? liveResult.units}</span></div>
                    <div className={styles.kv}><span>Compare lots</span><span>{compareLayout?.lotCount ?? compareScenarioSet[1]?.lotCount ?? compareScenarioSet[0]?.lotCount ?? "N/A"}</span></div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <aside className={styles.inspector}>
          <RecommendationPanel
            bestStrategy={selectedParcel.intelligence?.bestSubdivisionStrategy?.replaceAll("_", " ") ?? "Manual review"}
            expectedUnitRange={scenarioSet.length ? `${Math.min(...scenarioSet.map((scenario) => scenario.unitCount))}-${Math.max(...scenarioSet.map((scenario) => scenario.unitCount))}` : String(liveResult?.units ?? 0)}
            nextAction={selectedLayout ? "Compare layouts, then send the preferred concept into Site Planner." : "Generate or pin a layout if you want yield to drive a specific subdivision decision."}
            notes={[
              bestLiveScenario ? `${bestLiveScenario.name[0].toUpperCase() + bestLiveScenario.name.slice(1)} scenario currently looks strongest for this input set.` : "Run a live scenario set to rank options.",
              compareLayout ? `${compareLayout.name} is available as a comparison layout.` : "Pin a second layout in workflow to compare options.",
            ]}
            riskLevel={riskLevel}
          />
          <div className={styles.card}>
            <div className={styles.panelHeader}>
              <strong>Saved scenarios</strong>
              <span className={styles.helper}>Compare current assumptions against saved project records.</span>
            </div>
            <div className={styles.list}>
              {savedScenarios.map((scenario) => (
                <button
                  className={`${styles.scenarioButton} ${scenario.id === selectedScenario?.id ? styles.scenarioButtonActive : ""}`}
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  type="button"
                >
                  <strong>{scenario.title}</strong>
                  <span className={styles.muted}>{scenario.units} homes | {scenario.product}</span>
                  <span className={styles.note}>{scenario.openSpacePercent}% open space | {scenario.density.toFixed(1)} homes/ac</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.panelHeader}>
              <strong>Comparison pins</strong>
              <span className={styles.helper}>These follow the workflow hub and keep side-by-side review stable.</span>
            </div>
            <div className={styles.kv}><span>Compare layout</span><span>{compareLayout?.name ?? "None"}</span></div>
            <div className={styles.kv}><span>Compare scenario</span><span>{compareScenario?.title ?? "None"}</span></div>
          </div>

          <div className={styles.card}>
            <div className={styles.panelHeader}>
              <strong>Decision summary</strong>
            </div>
            <div className={styles.kv}><span>Property area</span><span>{selectedParcel.areaAcres.toFixed(2)} ac</span></div>
            <div className={styles.kv}><span>Buildable acres</span><span>{(selectedParcel.intelligence?.buildableAreaAcres ?? selectedParcel.buildableAcres).toFixed(2)} ac</span></div>
            <div className={styles.kv}><span>Buildability score</span><span>{selectedParcel.intelligence?.buildabilityScore?.toFixed(1) ?? "N/A"}</span></div>
            <div className={styles.kv}><span>Recommended layout</span><span>{selectedParcel.intelligence?.bestSubdivisionStrategy?.replaceAll("_", " ") ?? "Run parcel analysis"}</span></div>
            <div className={styles.kv}><span>Indicative max homes</span><span>{selectedParcel.maxUnits}</span></div>
            <div className={styles.kv}><span>Saved layouts</span><span>{parcelLayouts.length}</span></div>
            <div className={styles.kv}><span>Saved scenarios</span><span>{savedScenarios.length}</span></div>
            {!selectedParcel.intelligence ? <div className={styles.note}>Run property analysis before trusting yield outputs.</div> : null}
          </div>

          <div className={styles.card}>
            <div className={styles.panelHeader}>
              <strong>Recommended next move</strong>
            </div>
            <div className={styles.note}>
              {selectedLayout
                ? `This yield run is tied to ${selectedLayout.name}. Compare the scenario cards, then go back to Subdivision Designer if you want to test another layout.`
                : "Start with a lot layout in Subdivision Designer if you want yield to respond to a specific concept instead of parcel-only assumptions."}
            </div>
            <div className={styles.inlineActions}>
              <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Tune layout</Button></Link>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Open site plan</Button></Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.panelHeader}>
              <strong>Why this reads better</strong>
            </div>
            <div className={styles.note}>This page now talks about homes, buildable area, and layout efficiency instead of internal survey terminology.</div>
          </div>
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}
