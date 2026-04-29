import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { moveElement, resizeElement, rotateElement, summarizeSitePlan, symbolRegistry, type PlannerElement, type PlannerLayerKey } from "@landportal/core-siteplanner";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { DebugLayerPanel } from "@/modules/map/DebugLayerPanel";
import { useDebugLayerStore } from "@/modules/map/debugLayerStore";
import { resolveActiveParcelId } from "@/modules/parcel/activeParcelAnchor";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { useProjectWorkflow } from "@/modules/projects/useProjectWorkflow";
import { useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjects } from "@/modules/projects/useProjects";
import { useWorkspace } from "@/modules/workspace/useWorkspace";

import styles from "./ProjectSitePlannerPage.module.css";

function polygonToPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

type LayerState = {
  visible: boolean;
  locked: boolean;
  opacity: number;
};

const defaultLayers: Record<PlannerLayerKey, LayerState> = {
  building: { visible: true, locked: false, opacity: 1 },
  tree: { visible: true, locked: false, opacity: 1 },
  utility: { visible: true, locked: false, opacity: 1 },
  easement: { visible: true, locked: false, opacity: 0.95 },
  row: { visible: true, locked: false, opacity: 0.95 },
};

export function ProjectSitePlannerPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const { meta } = useWorkspace();
  const workflow = useProjectWorkflow(projectId);
  const [layers, setLayers] = useState(defaultLayers);
  const [selectedElementId, setSelectedElementId] = useState("");
  const [editableElements, setEditableElements] = useState<PlannerElement[]>([]);
  const [titleBlockName, setTitleBlockName] = useState("Concept plan");
  const debugEnabled = useDebugLayerStore((state) => state.enabled);
  const debugLayers = useDebugLayerStore((state) => state.layers);

  const activeParcelId = development?.parcels.length
    ? resolveActiveParcelId(parcelSelection, workflow.parcelId, development.parcels)
    : "";
  const hasProviderOnlyAnchor = Boolean(parcelSelection?.providerParcelId && !parcelSelection?.parcelSnapshotId);
  const parcel =
    development?.parcels.find((entry) => entry.id === activeParcelId)
    ?? (hasProviderOnlyAnchor ? null : development?.parcels[0] ?? null);
  const sitePlan = development?.sitePlans[0] ?? null;
  const planningPolygon = parcel?.intelligence && parcel.buildableEnvelope.length ? parcel.buildableEnvelope : [];
  const frontageEdge = parcel?.frontageEdges.find((edge) => edge.isSelected) ?? null;
  const parcelLayouts = useMemo(() => {
    if (!development?.layouts.length || !parcel) return [];
    return development.layouts.filter((layout) => !layout.parcelId || layout.parcelId === parcel.id);
  }, [development?.layouts, parcel]);
  const parcelScenarios = useMemo(() => {
    if (!development?.scenarios.length || !parcel) return [];
    return development.scenarios.filter((scenario) => !scenario.parcelId || scenario.parcelId === parcel.id);
  }, [development?.scenarios, parcel]);
  const selectedLayout = parcelLayouts.find((layout) => layout.id === workflow.layoutId) ?? parcelLayouts[0] ?? null;
  const compareLayout = parcelLayouts.find((layout) => layout.id === workflow.compareLayoutId) ?? null;
  const selectedScenario = parcelScenarios.find((scenario) => scenario.id === workflow.scenarioId) ?? parcelScenarios[0] ?? null;

  useEffect(() => {
    if (!parcel?.id) return;
    if (workflow.parcelId === parcel.id) return;
    workflow.setParcelId(parcel.id);
  }, [parcel?.id, workflow]);

  useEffect(() => {
    if (!sitePlan) return;
    setEditableElements(sitePlan.elements as PlannerElement[]);
    setSelectedElementId((current) => current || sitePlan.elements[0]?.id || "");
  }, [sitePlan?.id]);

  const grouped = useMemo(() => {
    return editableElements.reduce<Record<string, PlannerElement[]>>((groups, element) => {
      if (!groups[element.elementType]) groups[element.elementType] = [];
      groups[element.elementType].push(element);
      return groups;
    }, { building: [], tree: [], utility: [], easement: [], row: [] });
  }, [editableElements]);

  const selectedElement = editableElements.find((element) => element.id === selectedElementId) ?? null;
  const summary = useMemo(() => summarizeSitePlan(editableElements), [editableElements]);
  const sitePlanBlockers = [
    !selectedLayout ? "Pin a subdivision layout before trusting the site plan composition." : null,
    !selectedScenario ? "Select or save a yield scenario before calling this plan presentation-ready." : null,
    !editableElements.length ? "No editable site plan elements are loaded yet." : null,
  ].filter(Boolean) as string[];
  const sitePlanWarnings = [
    titleBlockName === "Concept plan" ? "The title block is still using the default name." : null,
    compareLayout ? `Compare layout ${compareLayout.name} is visible. Confirm whether it should remain in the presentation view.` : null,
  ].filter(Boolean) as string[];
  const sitePlanChecks = [
    `${summary.buildingCount} building elements and ${summary.treeCount} tree elements are currently visible in the plan set.`,
    selectedLayout ? `Primary layout guide: ${selectedLayout.name}.` : "No primary layout guide is active.",
    selectedScenario ? `Scenario context: ${selectedScenario.title}.` : "No scenario context is pinned.",
  ];
  const sitePlanTone = sitePlanBlockers.length ? "blocked" : sitePlanWarnings.length ? "attention" : "ready";

  if (isLoading) {
    return <LoadingState message="Loading site plan..." />;
  }

  if (error || !development || !parcel || !sitePlan) {
    return <div className={styles.page}><div className={styles.emptyState}>Unable to load the site plan. {error?.message ?? "No site plan records are available yet."}</div></div>;
  }

  function updateElement(transform: (element: PlannerElement) => PlannerElement) {
    if (!selectedElement) return;
    if (layers[selectedElement.elementType].locked) return;
    setEditableElements((current) => current.map((element) => element.id === selectedElement.id ? transform(element) : element));
  }

  return (
    <ProjectWorkspaceShell
      currentStep="site-planner"
      description={
        <p>
          The Site Planner now works from parcel intelligence first: buildable area, selected frontage,
          layer controls, element selection, and a cleaner print-frame composition for presentation-ready visuals.
          {" "}
          Current workspace: {meta.label}.
        </p>
      }
      eyebrow="Site planner"
      headerActions={
        <>
          <Link to={`/app/projects/${projectId}/workflow`}><Button variant="ghost">Open workflow</Button></Link>
          <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Open lot layout</Button></Link>
          <Link to={`/app/projects/${projectId}/documents`}><Button>Open reports</Button></Link>
        </>
      }
      layoutReady={Boolean(workflow.layoutId || selectedLayout?.id)}
      parcelReady={Boolean(parcel?.intelligence)}
      projectId={projectId}
      scenarioReady={Boolean(workflow.scenarioId || selectedScenario?.id)}
      title={project?.name ?? "Site Plan"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/yield`}><Button variant="secondary">Review yield</Button></Link>
              <Link to={`/app/projects/${projectId}/documents`}><Button variant="ghost">Open reports</Button></Link>
            </>
          }
          blockers={sitePlanBlockers}
          checks={sitePlanChecks}
          summary="Site Planner is the presentation-proof step. Confirm the pinned layout and scenario, clean up the graphics, and only then move into reports or sheet output."
          title="Site plan readiness"
          tone={sitePlanTone}
          warnings={sitePlanWarnings}
        />
      }
    >

      <DebugLayerPanel />

      <section className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.panelHeader}>
            <strong>Plan layers</strong>
            <span className={styles.helper}>Control visibility, lock state, and emphasis for each overlay.</span>
          </div>
          <div className={styles.layerList}>
            {(Object.keys(symbolRegistry) as PlannerLayerKey[]).map((key) => (
              <div className={styles.layerCard} key={key}>
                <div className={styles.layerRow}>
                  <label className={styles.layerToggle}><input checked={layers[key].visible} onChange={() => setLayers((current) => ({ ...current, [key]: { ...current[key], visible: !current[key].visible } }))} type="checkbox" /> <span>{symbolRegistry[key].label}</span></label>
                  <button className={styles.layerLock} onClick={() => setLayers((current) => ({ ...current, [key]: { ...current[key], locked: !current[key].locked } }))} type="button">{layers[key].locked ? "Locked" : "Unlocked"}</button>
                </div>
                <div className={styles.layerMeta}><span>{grouped[key]?.length ?? 0} elements</span><span>{Math.round(layers[key].opacity * 100)}%</span></div>
                <input className={styles.opacitySlider} max="100" min="20" onChange={(event) => setLayers((current) => ({ ...current, [key]: { ...current[key], opacity: Number(event.target.value) / 100 } }))} type="range" value={Math.round(layers[key].opacity * 100)} />
              </div>
            ))}
          </div>

          <div className={styles.panelHeader}>
            <strong>Element library</strong>
            <span className={styles.helper}>Select an element to move, rotate, or resize it in this planning session.</span>
          </div>
          <div className={styles.elementList}>
            {editableElements.map((element) => (
              <button className={`${styles.elementButton} ${selectedElement?.id === element.id ? styles.elementButtonActive : ""}`} key={element.id} onClick={() => setSelectedElementId(element.id)} type="button">
                <strong>{element.label}</strong>
                <span>{symbolRegistry[element.elementType].label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className={styles.canvasWrap}>
          <div className={styles.printFrame}>
            <div className={styles.printHeader}>
              <strong>{project?.name ?? "Site Plan"}</strong>
              <input className={styles.titleInput} onChange={(event) => setTitleBlockName(event.target.value)} value={titleBlockName} />
            </div>
            <svg className={styles.canvas} preserveAspectRatio="none" viewBox="0 0 100 100">
              {(!debugEnabled || debugLayers.rawBoundary) ? <polygon className={styles.parcelPolygon} points={polygonToPoints(parcel.polygon)} /> : null}
              {(!debugEnabled || debugLayers.buildableEnvelope) && planningPolygon.length ? <polygon className={styles.easementPolygon} points={polygonToPoints(planningPolygon)} /> : null}
              {(!debugEnabled || debugLayers.selectedFrontage) && frontageEdge ? <polyline className={styles.utilityLine} points={polygonToPoints(frontageEdge.points)} /> : null}
              {selectedLayout?.lots.map((lot) => (
                <polygon className={styles.layoutGuidePolygon} key={`guide-${lot.id}`} points={polygonToPoints(lot.polygon)} />
              ))}
              {compareLayout?.lots.map((lot) => (
                <polygon className={styles.compareGuidePolygon} key={`guide-compare-${lot.id}`} points={polygonToPoints(lot.polygon)} />
              ))}
              {editableElements.filter((element) => layers[element.elementType].visible).map((element) => {
                const selected = element.id === selectedElement?.id;
                const opacity = layers[element.elementType].opacity;
                if (element.elementType === "tree") {
                  return element.points.map((point, index) => (
                    <circle className={`${styles.treeSymbol} ${selected ? styles.selectedElement : ""}`} cx={point.x} cy={point.y} key={`${element.id}-${index}`} r="1.3" style={{ opacity }} />
                  ));
                }

                const className = element.elementType === "building"
                  ? styles.buildingPolygon
                  : element.elementType === "utility"
                    ? styles.utilityLine
                    : element.elementType === "easement"
                      ? styles.easementPolygon
                      : styles.rowPolygon;

                return <polygon className={`${className} ${selected ? styles.selectedElement : ""}`} key={element.id} points={polygonToPoints(element.points)} style={{ opacity }} />;
              })}
            </svg>
            <div className={styles.legend}>
              <strong>Legend</strong>
              {(Object.keys(symbolRegistry) as PlannerLayerKey[]).filter((key) => layers[key].visible).map((key) => <span key={key}>{symbolRegistry[key].label}</span>)}
              {selectedLayout ? <span>Primary layout guide</span> : null}
              {compareLayout ? <span>Compare layout guide</span> : null}
            </div>
            <div className={styles.titleBlock}>
              <strong>{titleBlockName}</strong>
              <div className={styles.row}><span>Property</span><span>{parcel.name}</span></div>
              <div className={styles.row}><span>Layout</span><span>{selectedLayout?.name ?? "None pinned"}</span></div>
              <div className={styles.row}><span>Scenario</span><span>{selectedScenario?.title ?? "Live concept"}</span></div>
              <div className={styles.row}><span>Buildings</span><span>{summary.buildingCount}</span></div>
              <div className={styles.row}><span>Tree symbols</span><span>{summary.treeCount}</span></div>
              <div className={styles.row}><span>Utilities</span><span>{summary.utilityCount}</span></div>
              <div className={styles.row}><span>North</span><span>?</span></div>
              <div className={styles.row}><span>Scale</span><span>Diagrammatic</span></div>
            </div>
          </div>
        </div>

        <aside className={styles.inspector}>
          <div className={styles.panelHeader}>
            <strong>Selected element</strong>
            <span className={styles.helper}>Simple editing controls make this feel more like a planning workspace than a static preview.</span>
          </div>
          {selectedElement ? (
            <>
              <div className={styles.infoCard}>
                <strong>{selectedElement.label}</strong>
                <div className={styles.row}><span>Type</span><span>{symbolRegistry[selectedElement.elementType].label}</span></div>
                <div className={styles.row}><span>Locked</span><span>{layers[selectedElement.elementType].locked ? "Yes" : "No"}</span></div>
                <div className={styles.row}><span>Points</span><span>{selectedElement.points.length}</span></div>
              </div>
              <div className={styles.infoCard}>
                <strong>Edit controls</strong>
                <div className={styles.controlGrid}>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => moveElement(element, 0, -1.2))} type="button">Nudge up</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => moveElement(element, 0, 1.2))} type="button">Nudge down</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => moveElement(element, -1.2, 0))} type="button">Nudge left</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => moveElement(element, 1.2, 0))} type="button">Nudge right</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => rotateElement(element, -8))} type="button">Rotate -8°</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => rotateElement(element, 8))} type="button">Rotate +8°</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => resizeElement(element, 0.92))} type="button">Shrink</button>
                  <button className={styles.controlButton} onClick={() => updateElement((element) => resizeElement(element, 1.08))} type="button">Grow</button>
                </div>
              </div>
            </>
          ) : null}
          <div className={styles.infoCard}>
            <strong>Workflow handoff</strong>
            <div className={styles.row}><span>Active layout</span><span>{selectedLayout?.name ?? "Not pinned"}</span></div>
            <div className={styles.row}><span>Compare layout</span><span>{compareLayout?.name ?? "None"}</span></div>
            <div className={styles.row}><span>Yield scenario</span><span>{selectedScenario?.title ?? "Live scenario"}</span></div>
            <div className={styles.note}>
              {selectedLayout
                ? "The planner is now reading the workflow layout selection so building and circulation review stay tied to the chosen subdivision concept."
                : "Pin a saved layout in the workflow or subdivision designer if you want the planner to present a specific subdivision concept under the plan graphics."}
            </div>
            <div className={styles.quickActions}>
              <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Adjust layout</Button></Link>
              <Link to={`/app/projects/${projectId}/yield`}><Button variant="ghost">Review yield</Button></Link>
            </div>
          </div>
          <div className={styles.infoCard}>
            <strong>Plan summary</strong>
            <div className={styles.row}><span>Property area</span><span>{parcel.areaAcres.toFixed(2)} ac</span></div>
            <div className={styles.row}><span>Buildable area</span><span>{(parcel.intelligence?.buildableAreaAcres ?? parcel.buildableAcres).toFixed(2)} ac</span></div>
            <div className={styles.row}><span>Buildability score</span><span>{parcel.intelligence?.buildabilityScore?.toFixed(1) ?? "N/A"}</span></div>
            <div className={styles.row}><span>Buildings</span><span>{summary.buildingCount}</span></div>
            <div className={styles.row}><span>Trees</span><span>{summary.treeCount}</span></div>
          </div>
          <div className={styles.infoCard}>
            <strong>Design issues to watch</strong>
            <div className={styles.note}>
              {parcel.intelligence
                ? "This is a preliminary plan built from parcel intelligence. It still lacks snapping, saved edits, and export-ready PDF composition."
                : "Run property analysis first so the planner can use a trustworthy buildable area instead of a raw parcel boundary."}
            </div>
          </div>
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}

