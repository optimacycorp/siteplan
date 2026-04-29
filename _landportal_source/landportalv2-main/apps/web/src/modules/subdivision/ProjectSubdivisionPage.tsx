import { useEffect, useMemo, useState } from "react";
import { generateSubdivisionLayout, type SubdivisionStrategy } from "@landportal/core-subdivision";
import { Link, useParams } from "react-router-dom";
import {
  buildMapBoundsWithTransform,
  createProjectDisplayTransform,
  projectLocalRingToLngLatWithTransform,
  type LocalCoordinate,
} from "@landportal/map-core";

import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/modules/auth/authStore";
import { BaseMapCanvas } from "@/modules/map/BaseMapCanvas";
import { DebugLayerPanel } from "@/modules/map/DebugLayerPanel";
import { MapControls } from "@/modules/map/MapControls";
import type { MapLayerDescriptor } from "@/modules/map/MapLayerManager";
import { useDebugLayerStore } from "@/modules/map/debugLayerStore";
import { useSharedMapState } from "@/modules/map/useSharedMapState";
import { resolveActiveParcelId } from "@/modules/parcel/activeParcelAnchor";
import { useRunParcelAnalysis } from "@/modules/parcel/useParcelIntelligence";
import { useRegridParcelTileConfig } from "@/modules/parcel/useRegridParcels";
import { useDeleteProjectParcelSnapshot, useProjectParcelSelection, useProjectParcelSelections } from "@/modules/parcel/useProjectParcelSelection";
import { useProjectWorkflow } from "@/modules/projects/useProjectWorkflow";
import { useProjects } from "@/modules/projects/useProjects";
import { useCreateSubdivisionLayout, useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjectSurvey } from "@/modules/projects/useProjectSurvey";
import { useProjectWorkspace } from "@/modules/projects/useProjectWorkspace";
import { useTitleWorkspace } from "@/modules/title/useTitleCommitments";
import { useWorkspace } from "@/modules/workspace/useWorkspace";

import styles from "./ProjectSubdivisionPage.module.css";

function polygonToPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function closeLocalRing(points: Array<{ x: number; y: number }>) {
  if (!points.length) return [];
  const ring = points.map((point) => ({ x: point.x, y: point.y }));
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first.x !== last.x || first.y !== last.y)) {
    ring.push({ ...first });
  }
  return ring;
}

function selectionBoundsFromJson(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;

  const minLng = typeof value.minLng === "number" ? value.minLng : null;
  const minLat = typeof value.minLat === "number" ? value.minLat : null;
  const maxLng = typeof value.maxLng === "number" ? value.maxLng : null;
  const maxLat = typeof value.maxLat === "number" ? value.maxLat : null;

  if (minLng === null || minLat === null || maxLng === null || maxLat === null) {
    return null;
  }

  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
  };
}

function selectionGeometryFeature(
  geometry: Record<string, unknown> | null | undefined,
  id: string,
  name: string,
): GeoJSON.Feature[] {
  const candidate = geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined;
  if (!candidate || (candidate.type !== "Polygon" && candidate.type !== "MultiPolygon")) {
    return [];
  }

  return [{
    type: "Feature",
    geometry: candidate,
    properties: {
      id,
      name,
    },
  }];
}

function remapLocalRingToBounds(
  points: Array<{ x: number; y: number }>,
  targetBounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
) {
  if (!points.length) return [];

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return closeLocalRing(points).map((point) => {
    const lng = targetBounds.minLng + ((point.x - minX) / width) * (targetBounds.maxLng - targetBounds.minLng);
    const lat = targetBounds.minLat + ((point.y - minY) / height) * (targetBounds.maxLat - targetBounds.minLat);
    return [lng, lat] as [number, number];
  });
}

function toPolygonGeometry(points: Array<{ x: number; y: number }>) {
  const coordinates = points.map((point) => [point.x, point.y] as [number, number]);
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    coordinates.push(first);
  }

  return {
    type: "Polygon" as const,
    coordinates: [coordinates],
  };
}

function normalizeConstraintType(type: string) {
  switch (type) {
    case "row":
      return "row" as const;
    case "easement":
      return "easement" as const;
    case "flood":
    case "floodplain":
      return "floodplain" as const;
    case "utility":
    case "utility_zone":
      return "utility_zone" as const;
    case "tree":
    case "tree_preservation":
      return "tree_preservation" as const;
    case "steep_slope":
      return "steep_slope" as const;
    case "wetland":
      return "wetland" as const;
    case "setback":
      return "setback_front" as const;
    default:
      return "custom" as const;
  }
}

const strategyMeta: Record<SubdivisionStrategy, { label: string; detail: string }> = {
  grid: { label: "Feasibility grid", detail: "Fast screening layout for simple property checks." },
  frontage: { label: "Frontage split", detail: "Prioritizes lots that face the strongest frontage edge." },
  corridor: { label: "Access corridor", detail: "Cuts a simple road spine and creates lots on both sides." },
};

export function ProjectSubdivisionPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const user = useAuthStore((state) => state.user);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const { data: projectWorkspace } = useProjectWorkspace(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const { data: parcelSelections = [] } = useProjectParcelSelections(projectId);
  const regridTileConfig = useRegridParcelTileConfig();
  const deleteParcelSnapshot = useDeleteProjectParcelSnapshot(projectId);
  const { meta } = useWorkspace();
  const workflow = useProjectWorkflow(projectId);
  const mapState = useSharedMapState(`${projectId}:subdivision-map`);
  const surveyState = useProjectSurvey(projectId);
  const { data: titleWorkspace } = useTitleWorkspace(projectId);
  const createLayout = useCreateSubdivisionLayout(projectId);
  const runAnalysis = useRunParcelAnalysis(projectId);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [selectedRulesetId, setSelectedRulesetId] = useState("");
  const [layoutName, setLayoutName] = useState("Generated layout");
  const [strategy, setStrategy] = useState<SubdivisionStrategy>("frontage");
  const [minLotAreaSqft, setMinLotAreaSqft] = useState(7200);
  const [minFrontageFt, setMinFrontageFt] = useState(55);
  const [minDepthFt, setMinDepthFt] = useState(110);
  const [roadWidthFt, setRoadWidthFt] = useState(28);
  const [setbackFt, setSetbackFt] = useState(12);
  const [homesPerAcre, setHomesPerAcre] = useState(3.2);
  const [useInternalRoad, setUseInternalRoad] = useState(true);
  const [deleteError, setDeleteError] = useState<string>("");
  const [clickedMapParcel, setClickedMapParcel] = useState<{
    id: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const debugEnabled = useDebugLayerStore((state) => state.enabled);
  const debugLayers = useDebugLayerStore((state) => state.layers);

  useEffect(() => {
    if (!development?.parcels.length) return;
    const preferredParcelId = resolveActiveParcelId(parcelSelection, workflow.parcelId, development.parcels);
    setSelectedParcelId((current) => current || preferredParcelId);
  }, [development?.parcels, parcelSelection, workflow.parcelId]);

  useEffect(() => {
    if (!development?.rulesets.length) return;
    const ruleset = development.rulesets[0];
    setSelectedRulesetId((current) => current || ruleset.id);
    setMinLotAreaSqft(ruleset.minLotAreaSqft);
    setMinFrontageFt(ruleset.minFrontageFt);
    setMinDepthFt(ruleset.minDepthFt);
    setRoadWidthFt(ruleset.roadWidthFt);
    setSetbackFt(ruleset.setbackFt);
  }, [development?.rulesets]);

  const hasProviderOnlyAnchor = Boolean(parcelSelection?.providerParcelId && !parcelSelection?.parcelSnapshotId);
  const selectedParcel =
    development?.parcels.find((parcel) => parcel.id === selectedParcelId)
    ?? (hasProviderOnlyAnchor ? null : development?.parcels[0] ?? null);
  const selectedRuleset = development?.rulesets.find((ruleset) => ruleset.id === selectedRulesetId) ?? development?.rulesets[0] ?? null;
  const selectedFrontage = selectedParcel?.frontageEdges.find((edge) => edge.isSelected) ?? null;
  const frontageCandidates = useMemo(() => {
    if (!selectedParcel) return [];

    const edges = selectedParcel.frontageEdges.filter((edge) => edge.points.length >= 2);
    const roadFacingEdges = edges.filter((edge) => edge.touchesPublicRow);
    return roadFacingEdges.length ? roadFacingEdges : edges;
  }, [selectedParcel]);
  const selectedParcelSelection = selectedParcel
    ? parcelSelections.find((entry) => entry.parcelSnapshotId === selectedParcel.id)
      ?? (parcelSelection?.parcelSnapshotId === selectedParcel.id ? parcelSelection : null)
      ?? null
    : null;
  const savedLayouts = useMemo(() => {
    if (!development?.layouts.length || !selectedParcel) return [];
    return development.layouts.filter((layout) => !layout.parcelId || layout.parcelId === selectedParcel.id);
  }, [development?.layouts, selectedParcel]);
  const selectedSavedLayout = savedLayouts.find((layout) => layout.id === workflow.layoutId) ?? null;
  const compareSavedLayout = savedLayouts.find((layout) => layout.id === workflow.compareLayoutId) ?? null;
  const activeCommitment =
    titleWorkspace?.commitments.find((entry) => entry.isPrimary)
    ?? titleWorkspace?.commitments[0]
    ?? null;
  const activeCommitmentReferences = activeCommitment
    ? (titleWorkspace?.references ?? []).filter((entry) => entry.titleCommitmentId === activeCommitment.id)
    : [];
  const titleMissingCount = activeCommitmentReferences.filter((entry) => !entry.visitedProjectDocumentId).length;
  const titleReviewCount = activeCommitmentReferences.filter((entry) => entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review").length;

  useEffect(() => {
    if (!selectedParcelId) return;
    if (workflow.parcelId === selectedParcelId) return;
    workflow.setParcelId(selectedParcelId);
  }, [selectedParcelId, workflow]);

  useEffect(() => {
    if (!selectedParcel?.intelligence) return;
    const recommendedStrategy = selectedParcel.intelligence.bestSubdivisionStrategy === "frontage_split"
      ? "frontage"
      : selectedParcel.intelligence.bestSubdivisionStrategy === "access_corridor"
        ? "corridor"
        : selectedParcel.intelligence.bestSubdivisionStrategy === "grid"
          ? "grid"
          : strategy;
    setStrategy(recommendedStrategy);
    const recommendedWidth = Number(selectedParcel.intelligence.recommendations.recommendedLotWidthFt ?? 0);
    const recommendedDepth = Number(selectedParcel.intelligence.recommendations.recommendedLotDepthFt ?? 0);
    if (recommendedWidth > 0) setMinFrontageFt(recommendedWidth);
    if (recommendedDepth > 0) setMinDepthFt(recommendedDepth);
  }, [selectedParcel?.id, selectedParcel?.intelligence, strategy]);

  const generated = useMemo(() => {
    if (!selectedParcel?.intelligence || !selectedParcel.buildableEnvelope.length) return null;
    const sourcePolygon = selectedParcel.buildableEnvelope;
    const effectiveStrategy = strategy === "corridor" && !useInternalRoad ? "frontage" : strategy;
    return generateSubdivisionLayout({
      strategy: effectiveStrategy,
      parcelPolygon: selectedParcel.polygon,
      buildableEnvelopePolygon: sourcePolygon,
      buildableAreaSqft: selectedParcel.intelligence?.buildableAreaSqft ?? selectedParcel.buildableAcres * 43560,
      constraintPolygons: selectedParcel.constraints.map((constraint) => constraint.points),
      preferredFrontageEdge: selectedFrontage
        ? { start: selectedFrontage.points[0], end: selectedFrontage.points[1] }
        : null,
      rules: { minLotAreaSqft, minFrontageFt, minDepthFt, roadWidthFt, setbackFt },
    });
  }, [selectedParcel, strategy, minLotAreaSqft, minFrontageFt, minDepthFt, roadWidthFt, setbackFt, useInternalRoad]);
  const activeStrategyLabel = generated ? strategyMeta[generated.summary.strategy].label : strategyMeta[strategy].label;
  const fitReasons = [
    !selectedParcel?.intelligence ? "Run parcel analysis before using layout feasibility." : null,
    !selectedFrontage && strategy !== "grid" ? "No frontage edge is selected yet, so frontage-driven layouts cannot anchor correctly." : null,
    strategy === "corridor" && !useInternalRoad ? "Corridor strategy is selected, but internal road support is turned off." : null,
    generated?.summary.warnings.find((warning) => warning.includes("Minimum frontage")) ?? null,
    generated?.summary.warnings.find((warning) => warning.includes("Minimum depth")) ?? null,
    generated?.summary.warnings.find((warning) => warning.includes("Access corridor leaves")) ?? null,
  ].filter(Boolean) as string[];

  const projectedHomes = selectedParcel && generated
    ? Math.min(
      generated.summary.yieldUnits,
      Math.round((selectedParcel.intelligence?.buildableAreaAcres ?? selectedParcel.buildableAcres) * homesPerAcre),
    )
    : 0;
  const invalidLots = generated?.lots.filter((lot) => !lot.valid) ?? [];
  const compareLotDelta = compareSavedLayout && generated ? generated.summary.lotCount - compareSavedLayout.lotCount : null;
  const compareYieldDelta = compareSavedLayout && generated ? generated.summary.yieldUnits - compareSavedLayout.yieldUnits : null;
  const activeSurveyParcel =
    surveyState.parcels.find((parcel) => parcel.id === (surveyState.activeSurveyParcelId || selectedParcel?.id || ""))
    ?? (selectedParcel ? surveyState.parcels.find((parcel) => parcel.id === selectedParcel.id) : null)
    ?? surveyState.parcels[0]
    ?? null;
  const surveyCompare = selectedParcel && activeSurveyParcel
    ? (() => {
      const grossArea = selectedParcel.areaAcres;
      const surveyAreaAcres = activeSurveyParcel.area / 43560;
      const areaDelta = Math.abs(grossArea - surveyAreaAcres);
      const areaDeltaPercent = grossArea > 0 ? (areaDelta / grossArea) * 100 : 0;
      return {
        areaDelta,
        areaDeltaPercent,
        closureError: activeSurveyParcel.closure.closureError,
        withinTolerance: activeSurveyParcel.closure.withinTolerance,
      };
    })()
    : null;
  const subdivisionBlockers = [
    !selectedParcel?.intelligence ? "Run parcel analysis before trusting live layout generation." : null,
    !generated ? "No live layout is available yet for the selected parcel and rules." : null,
    invalidLots.length ? `${invalidLots.length} generated lots fail the current ruleset.` : null,
    surveyCompare && !surveyCompare.withinTolerance ? "Survey compare is flagged. Resolve the parcel-vs-survey mismatch before treating this layout as trustworthy." : null,
    titleMissingCount ? `${titleMissingCount} title reference${titleMissingCount === 1 ? "" : "s"} still need stored supporting documents.` : null,
  ].filter(Boolean) as string[];
  const subdivisionWarnings = [
    !workflow.layoutId ? "Save a layout when the concept looks credible so the next steps stay pinned to this decision." : null,
    compareSavedLayout ? `Comparison layout ${compareSavedLayout.name} is active. Confirm the tradeoff before continuing.` : null,
    titleReviewCount ? `${titleReviewCount} title reference${titleReviewCount === 1 ? "" : "s"} still need manual review or retry.` : null,
    surveyState.issues.length ? `${surveyState.issues.length} survey issue${surveyState.issues.length === 1 ? "" : "s"} are still open.` : null,
  ].filter(Boolean) as string[];
  const subdivisionChecks = [
    generated ? `${generated.summary.lotCount} lots and ${generated.summary.yieldUnits} units are in the current concept.` : "No generated concept yet.",
    selectedParcel?.intelligence ? `Parcel recommendation: ${selectedParcel.intelligence.bestSubdivisionStrategy.replaceAll("_", " ")}.` : "Parcel recommendation unavailable.",
    selectedRuleset ? `Using ruleset ${selectedRuleset.name}.` : "No ruleset selected.",
    activeCommitment ? `${activeCommitment.title} is the active title commitment for this parcel.` : "No active title commitment is linked yet.",
    surveyCompare ? `Survey compare delta is ${surveyCompare.areaDelta.toFixed(2)} ac (${surveyCompare.areaDeltaPercent.toFixed(1)}%).` : "No survey compare is available for this parcel yet.",
  ];
  const subdivisionTone = subdivisionBlockers.length ? "blocked" : subdivisionWarnings.length ? "attention" : "ready";
  const subdivisionMap = useMemo(() => {
    const anchor = projectWorkspace?.anchor ?? { lng: -104.8207, lat: 38.8339, zoom: 15.9 };
    const anchoredBounds = selectionBoundsFromJson(selectedParcelSelection?.bbox ?? null);
    const anchoredParcelFeatures = selectedParcel
      ? selectionGeometryFeature(selectedParcelSelection?.geometry ?? null, selectedParcel.id, selectedParcel.name)
      : [];
    const localPoints: LocalCoordinate[] = selectedParcel
      ? [
        ...selectedParcel.polygon,
        ...selectedParcel.buildableEnvelope,
        ...selectedParcel.constraints.flatMap((constraint) => constraint.points),
        ...selectedParcel.frontageEdges.flatMap((edge) => edge.points),
        ...(generated?.lots.flatMap((lot) => lot.polygon) ?? []),
        ...(generated?.roads.flatMap((road) => road.polygon) ?? []),
      ]
      : [];
    const fallbackPoints = localPoints.length ? localPoints : [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const transform = createProjectDisplayTransform(anchor, fallbackPoints);

    const parcelFeatures: GeoJSON.Feature[] = selectedParcel && mapState.visibility.parcels
      ? (anchoredParcelFeatures.length
          ? anchoredParcelFeatures
          : [{
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [projectLocalRingToLngLatWithTransform(closeLocalRing(selectedParcel.polygon), transform)],
              },
              properties: {
                id: selectedParcel.id,
                name: selectedParcel.name,
              },
            }])
      : [];

    const buildableFeatures: GeoJSON.Feature[] = selectedParcel?.buildableEnvelope.length && mapState.visibility.buildable
      ? [{
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [anchoredBounds
              ? remapLocalRingToBounds(selectedParcel.buildableEnvelope, anchoredBounds)
              : projectLocalRingToLngLatWithTransform(closeLocalRing(selectedParcel.buildableEnvelope), transform)],
          },
          properties: {
            id: `${selectedParcel.id}-buildable`,
            name: `${selectedParcel.name} buildable envelope`,
          },
        }]
      : [];

    const constraintFeatures: GeoJSON.Feature[] = mapState.visibility.constraints
      ? (selectedParcel?.constraints.flatMap((constraint) => (
          constraint.points.length
            ? [{
                type: "Feature" as const,
                geometry: {
                type: "Polygon" as const,
                  coordinates: [anchoredBounds
                    ? remapLocalRingToBounds(constraint.points, anchoredBounds)
                    : projectLocalRingToLngLatWithTransform(closeLocalRing(constraint.points), transform)],
                },
                properties: {
                  id: constraint.id,
                  label: constraint.label,
                },
              }]
            : []
        )) ?? [])
      : [];

    const frontageFeatures: GeoJSON.Feature[] = mapState.visibility.frontage
      ? (selectedParcel?.frontageEdges.flatMap((edge) => (
          edge.points.length >= 2
            ? [{
                type: "Feature" as const,
                geometry: {
                type: "LineString" as const,
                  coordinates: anchoredBounds
                    ? remapLocalRingToBounds(edge.points, anchoredBounds)
                    : projectLocalRingToLngLatWithTransform(edge.points, transform),
                },
                properties: {
                  id: `${selectedParcel.id}-frontage-${edge.edgeIndex}`,
                  selected: edge.isSelected,
                },
              }]
            : []
        )) ?? [])
      : [];

    const roadFeatures: GeoJSON.Feature[] = mapState.visibility.linework
      ? (generated?.roads.flatMap((road) => (
          road.polygon.length
            ? [{
                type: "Feature" as const,
                geometry: {
                type: "Polygon" as const,
                  coordinates: [anchoredBounds
                    ? remapLocalRingToBounds(road.polygon, anchoredBounds)
                    : projectLocalRingToLngLatWithTransform(closeLocalRing(road.polygon), transform)],
                },
                properties: {
                  id: road.id,
                  label: road.label,
                },
              }]
            : []
        )) ?? [])
      : [];

    const lotFeatures: GeoJSON.Feature[] = mapState.visibility.labels
      ? (generated?.lots.flatMap((lot) => (
          lot.polygon.length
            ? [{
                type: "Feature" as const,
                geometry: {
                type: "Polygon" as const,
                  coordinates: [anchoredBounds
                    ? remapLocalRingToBounds(lot.polygon, anchoredBounds)
                    : projectLocalRingToLngLatWithTransform(closeLocalRing(lot.polygon), transform)],
                },
                properties: {
                  id: lot.id,
                  label: lot.label,
                  valid: lot.valid,
                },
              }]
            : []
        )) ?? [])
      : [];

    const bounds = anchoredBounds
      ? [[anchoredBounds.minLng, anchoredBounds.minLat], [anchoredBounds.maxLng, anchoredBounds.maxLat]] as [[number, number], [number, number]]
      : buildMapBoundsWithTransform(fallbackPoints, transform);
    const layers: MapLayerDescriptor[] = [
      ...(regridTileConfig.data
        ? [
            {
              id: "subdivision-regrid-fill-layer",
              sourceId: "subdivision-regrid-parcels",
              source: {
                type: "vector" as const,
                tiles: regridTileConfig.data.tiles,
                promoteId: "ll_uuid",
              },
              sourceLayer: regridTileConfig.data.id,
              visible: mapState.visibility.parcels,
              layer: {
                type: "fill" as const,
                paint: {
                  "fill-color": "rgba(232, 189, 84, 0.08)",
                  "fill-opacity": 0.16,
                },
              },
            },
            {
              id: "subdivision-regrid-outline-layer",
              sourceId: "subdivision-regrid-parcels",
              source: {
                type: "vector" as const,
                tiles: regridTileConfig.data.tiles,
                promoteId: "ll_uuid",
              },
              sourceLayer: regridTileConfig.data.id,
              visible: mapState.visibility.parcels,
              layer: {
                type: "line" as const,
                paint: {
                  "line-color": "rgba(208, 162, 73, 0.35)",
                  "line-width": 1,
                },
              },
            },
          ]
        : []),
      {
        id: "subdivision-selected-parcel-layer",
        sourceId: "subdivision-selected-parcel-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: parcelFeatures } },
        visible: mapState.visibility.parcels && (!debugEnabled || debugLayers.rawBoundary),
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(54, 95, 194, 0.18)",
            "fill-opacity": 0.55,
          },
        },
      },
      {
        id: "subdivision-selected-parcel-outline-layer",
        sourceId: "subdivision-selected-parcel-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: parcelFeatures } },
        visible: mapState.visibility.parcels && (!debugEnabled || debugLayers.rawBoundary),
        layer: {
          type: "line",
          paint: {
            "line-color": "#20304f",
            "line-width": 3,
          },
        },
      },
      {
        id: "subdivision-buildable-layer",
        sourceId: "subdivision-buildable-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: buildableFeatures } },
        visible: mapState.visibility.buildable && (!debugEnabled || debugLayers.buildableEnvelope),
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(30, 141, 98, 0.14)",
            "fill-opacity": 0.7,
          },
        },
      },
      {
        id: "subdivision-constraint-layer",
        sourceId: "subdivision-constraint-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: constraintFeatures } },
        visible: mapState.visibility.constraints && (!debugEnabled || debugLayers.constraints),
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(201, 79, 79, 0.20)",
            "fill-opacity": 0.75,
          },
        },
      },
      {
        id: "subdivision-road-layer",
        sourceId: "subdivision-road-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: roadFeatures } },
        visible: mapState.visibility.linework && (!debugEnabled || debugLayers.roadCorridor),
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(73, 85, 104, 0.24)",
            "fill-opacity": 0.85,
          },
        },
      },
      {
        id: "subdivision-frontage-layer",
        sourceId: "subdivision-frontage-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: frontageFeatures } },
        visible: mapState.visibility.frontage && (!debugEnabled || debugLayers.selectedFrontage || debugLayers.frontageEdges),
        interactive: true,
        layer: {
          type: "line",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "selected"], true],
              "#d28324",
              "rgba(210, 131, 36, 0.65)",
            ],
            "line-width": [
              "case",
              ["==", ["get", "selected"], true],
              4,
              2,
            ],
          },
        },
      },
      {
        id: "subdivision-lot-layer",
        sourceId: "subdivision-lot-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: lotFeatures } },
        visible: mapState.visibility.labels && (!debugEnabled || debugLayers.subdivisionLots),
        layer: {
          type: "fill",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "valid"], false],
              "rgba(201, 79, 79, 0.22)",
              "rgba(255, 255, 255, 0.66)",
            ],
            "fill-opacity": 0.9,
          },
        },
      },
      {
        id: "subdivision-lot-outline-layer",
        sourceId: "subdivision-lot-source",
        source: { type: "geojson", data: { type: "FeatureCollection", features: lotFeatures } },
        visible: mapState.visibility.labels && (!debugEnabled || debugLayers.subdivisionLots),
        layer: {
          type: "line",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "valid"], false],
              "#9e3535",
              "#1b2e60",
            ],
            "line-width": 1.5,
          },
        },
      },
    ];

    return {
      bounds,
      center: anchoredBounds
        ? [((anchoredBounds.minLng + anchoredBounds.maxLng) / 2), ((anchoredBounds.minLat + anchoredBounds.maxLat) / 2)] as [number, number]
        : [anchor.lng, anchor.lat] as [number, number],
      layers,
    };
  }, [
    debugEnabled,
    debugLayers.buildableEnvelope,
    debugLayers.constraints,
    debugLayers.frontageEdges,
    debugLayers.rawBoundary,
    debugLayers.roadCorridor,
    debugLayers.selectedFrontage,
    debugLayers.subdivisionLots,
    generated,
    mapState.visibility.buildable,
    mapState.visibility.constraints,
    mapState.visibility.frontage,
    mapState.visibility.labels,
    mapState.visibility.linework,
    mapState.visibility.parcels,
    projectWorkspace?.anchor,
    regridTileConfig.data,
    selectedParcel,
    selectedParcelSelection?.bbox,
    selectedParcelSelection?.geometry,
  ]);

  if (isLoading) return <LoadingState message="Loading subdivision designer..." />;
  if (error || !development) {
    return <div className={styles.page}><div className={styles.emptyState}>Unable to load subdivision data. {error?.message}</div></div>;
  }

  const handleSave = async () => {
    if (!selectedParcel || !user || !generated) return;
    const createdLayout = await createLayout.mutateAsync({
      projectId,
      parcelSnapshotId: selectedParcel.id,
      rulesetId: selectedRuleset?.id ?? null,
      ownerId: user.id,
      name: layoutName,
      status: "draft",
      metrics: { ...generated.summary, projectedHomes },
      layoutData: { strategy, lots: generated.lots, buildableEnvelope: generated.buildableEnvelope, frontageEdge: generated.frontageEdge, roads: generated.roads },
    });
    workflow.setLayoutId(createdLayout.id);
  };

  const handleDeleteParcel = async (parcelId: string, parcelName: string) => {
    const confirmed = window.confirm(
      `Delete ${parcelName} from the project property input list? This removes the saved parcel snapshot and clears any linked project selection for it.`,
    );

    if (!confirmed) return;

    setDeleteError("");

    try {
      await deleteParcelSnapshot.mutateAsync({ parcelSnapshotId: parcelId });
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to delete parcel.";
      setDeleteError(message);
      return;
    }

    const remainingParcels = development.parcels.filter((parcel) => parcel.id !== parcelId);
    const nextParcelId = remainingParcels[0]?.id ?? "";

    if (selectedParcelId === parcelId) {
      setSelectedParcelId(nextParcelId);
    }

    if (workflow.parcelId === parcelId) {
      workflow.setParcelId(nextParcelId);
    }

    if (surveyState.activeSurveyParcelId === parcelId) {
      surveyState.setActiveSurveyParcelId(nextParcelId || undefined);
    }
  };

  const handleSelectFrontageEdge = async (edgeIndex: number | null) => {
    if (!selectedParcel || runAnalysis.isPending) return;

    const linkedSelection = parcelSelections.find((entry) => entry.parcelSnapshotId === selectedParcel.id)
      ?? (parcelSelection?.parcelSnapshotId === selectedParcel.id ? parcelSelection : null)
      ?? null;

    const providerGeometry = linkedSelection?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined;
    const boundaryPoints =
      providerGeometry && (providerGeometry.type === "Polygon" || providerGeometry.type === "MultiPolygon")
        ? selectedParcel.polygon
        : selectedParcel.polygon;

    await runAnalysis.mutateAsync({
      parcelSnapshotId: selectedParcel.id,
      boundary: toPolygonGeometry(boundaryPoints),
      constraints: selectedParcel.constraints.map((constraint) => ({
        id: constraint.id,
        constraintType: normalizeConstraintType(constraint.type),
        label: constraint.label,
        geometry: constraint.points.length ? toPolygonGeometry(constraint.points) : null,
        attributes: constraint.attributes,
      })),
      selectedFrontageEdgeIndex: edgeIndex,
      analysisVersion: "v1",
    });
  };

  return (
    <ProjectWorkspaceShell
      currentStep="subdivision"
      description={
        <p>
          Move from a simple grid demo to a parcel-aware concept tool. Choose a layout strategy, tune rules,
          and review lot validity, access logic, and open-space tradeoffs in one workspace.
          {" "}
          Current workspace: {meta.label}.
        </p>
      }
      eyebrow="Subdivision designer"
      headerActions={
        <>
          <Link to={`/app/projects/${projectId}/workflow`}><Button variant="ghost">Open workflow</Button></Link>
          <Link to={`/app/projects/${projectId}/parcel`}><Button variant="secondary">Back to property</Button></Link>
          <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Open site plan</Button></Link>
          <Button disabled={createLayout.isPending || !generated} onClick={() => void handleSave()}>{createLayout.isPending ? "Saving..." : "Save layout"}</Button>
        </>
      }
      layoutReady={Boolean(workflow.layoutId)}
      parcelReady={Boolean(selectedParcel?.intelligence)}
      projectId={projectId}
      scenarioReady={Boolean(workflow.scenarioId)}
      title={project?.name ?? "Subdivision Designer"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/yield`}><Button variant="secondary">Evaluate yield</Button></Link>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Open site plan</Button></Link>
            </>
          }
          blockers={subdivisionBlockers}
          checks={subdivisionChecks}
          summary="Subdivision should only move forward once the live concept has believable access, a manageable invalid-lot count, and a saved layout for downstream pages."
          title="Subdivision readiness"
          tone={subdivisionTone}
          warnings={subdivisionWarnings}
        />
      }
    >

      <DebugLayerPanel />

      <section className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.panelHeader}>
            <strong>Property input</strong>
            <span className={styles.helper}>Choose the property that drives layout generation.</span>
          </div>
          {hasProviderOnlyAnchor ? (
            <div className={styles.formCard}>
              <strong>Live parcel anchor selected</strong>
              <div className={styles.muted}>
                {parcelSelection?.parcelName || parcelSelection?.providerParcelId || "A live provider parcel"} is currently the project anchor.
              </div>
              <div className={styles.warning}>
                Import the parcel from the property page before generating a saved subdivision layout. Live provider anchors can guide focus, but layout generation still needs a project parcel snapshot.
              </div>
              <Link to={`/app/projects/${projectId}/parcel`}><Button variant="secondary">Return to property</Button></Link>
            </div>
          ) : null}
          <div className={styles.optionList}>
            {development.parcels.map((parcel) => (
              <div className={`${styles.optionButton} ${parcel.id === selectedParcel?.id ? styles.optionButtonActive : ""}`} key={parcel.id}>
                <button className={styles.optionSelect} onClick={() => setSelectedParcelId(parcel.id)} type="button">
                  <strong>{parcel.name}</strong>
                  <span className={styles.muted}>
                    {(parcel.intelligence?.buildableAreaAcres ?? parcel.buildableAcres).toFixed(2)} buildable ac
                    {" | "}
                    {Math.round(parcel.intelligence?.frontageFt ?? parcel.frontageFeet)} ft frontage
                  </span>
                </button>
                <button
                  className={styles.optionDelete}
                  disabled={deleteParcelSnapshot.isPending}
                  onClick={() => void handleDeleteParcel(parcel.id, parcel.name)}
                  type="button"
                >
                  {deleteParcelSnapshot.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
            {deleteError ? <div className={styles.deleteError}>{deleteError}</div> : null}
          </div>

          <div className={styles.panelHeader}>
            <strong>Layout strategy</strong>
            <span className={styles.helper}>Use the strategy that best matches the property shape and access story.</span>
          </div>
          <div className={styles.optionList}>
            {(Object.keys(strategyMeta) as SubdivisionStrategy[]).map((option) => (
              <button className={`${styles.optionButton} ${option === strategy ? styles.optionButtonActive : ""}`} key={option} onClick={() => setStrategy(option)} type="button">
                <strong>{strategyMeta[option].label}</strong>
                <span className={styles.muted}>{strategyMeta[option].detail}</span>
              </button>
            ))}
          </div>

          <div className={styles.panelHeader}>
            <strong>Saved rulesets</strong>
            <span className={styles.helper}>Start from a saved ruleset, then tune the numbers below.</span>
          </div>
          <div className={styles.optionList}>
            {development.rulesets.map((ruleset) => (
              <button className={`${styles.optionButton} ${ruleset.id === selectedRuleset?.id ? styles.optionButtonActive : ""}`} key={ruleset.id} onClick={() => {
                setSelectedRulesetId(ruleset.id);
                setMinLotAreaSqft(ruleset.minLotAreaSqft);
                setMinFrontageFt(ruleset.minFrontageFt);
                setMinDepthFt(ruleset.minDepthFt);
                setRoadWidthFt(ruleset.roadWidthFt);
                setSetbackFt(ruleset.setbackFt);
              }} type="button">
                <strong>{ruleset.name}</strong>
                <span className={styles.muted}>{ruleset.jurisdiction}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className={styles.canvasWrap}>
          <div className={styles.toolbar}>
            <input className={styles.nameInput} onChange={(event) => setLayoutName(event.target.value)} placeholder="Layout name" value={layoutName} />
            <div className={styles.toolbarMeta}>
              <span className={styles.strategyPill}>{strategyMeta[strategy].label}</span>
              {createLayout.isSuccess ? <span className={styles.success}>Saved to project</span> : null}
            </div>
          </div>
          <MapControls
            basemap={mapState.basemap}
            onBasemapChange={mapState.setBasemap}
            onFit={mapState.triggerFit}
            title="Generated layout"
            toggles={[
              { key: "parcels", label: "parcels", active: mapState.visibility.parcels, onToggle: () => mapState.toggleLayer("parcels") },
              { key: "constraints", label: "constraints", active: mapState.visibility.constraints, onToggle: () => mapState.toggleLayer("constraints") },
              { key: "buildable", label: "buildable", active: mapState.visibility.buildable, onToggle: () => mapState.toggleLayer("buildable") },
              { key: "frontage", label: "frontage", active: mapState.visibility.frontage, onToggle: () => mapState.toggleLayer("frontage") },
              { key: "labels", label: "lots", active: mapState.visibility.labels, onToggle: () => mapState.toggleLayer("labels") },
              { key: "linework", label: "roads", active: mapState.visibility.linework, onToggle: () => mapState.toggleLayer("linework") },
            ]}
          />
          {compareSavedLayout ? (
            <div className={styles.compareBanner}>
              <div className={styles.compareSummary}>
                <strong>Visual compare is active</strong>
                <span className={styles.muted}>
                  Current live concept vs {compareSavedLayout.name}
                  {compareLotDelta !== null ? ` | lot delta ${compareLotDelta >= 0 ? "+" : ""}${compareLotDelta}` : ""}
                  {compareYieldDelta !== null ? ` | unit delta ${compareYieldDelta >= 0 ? "+" : ""}${compareYieldDelta}` : ""}
                </span>
              </div>
              <button className={styles.compareAction} onClick={() => workflow.setCompareLayoutId("")} type="button">Clear compare</button>
            </div>
          ) : null}
          <div className={styles.canvas}>
            <BaseMapCanvas
              basemap={mapState.basemap}
              bounds={subdivisionMap.bounds}
              center={subdivisionMap.center}
              fitNonce={mapState.fitNonce}
              layers={subdivisionMap.layers}
              onFeatureSelect={(layerId, feature) => {
                if (layerId === "subdivision-frontage-layer") {
                  const properties = (feature.properties ?? {}) as Record<string, unknown>;
                  const edgeId = properties.id;
                  const edgeIndex = typeof edgeId === "string"
                    ? Number(edgeId.split("-").at(-1))
                    : NaN;
                  if (Number.isFinite(edgeIndex)) {
                    const clickedEdge = selectedParcel?.frontageEdges.find((edge) => edge.edgeIndex === edgeIndex) ?? null;
                    void handleSelectFrontageEdge(edgeIndex);
                    setClickedMapParcel({
                      id: `frontage-${edgeIndex}`,
                      title: `Frontage edge ${edgeIndex}`,
                      subtitle: clickedEdge
                        ? `${Math.round(clickedEdge.lengthFt)} ft · ${clickedEdge.touchesPublicRow ? "road-facing" : "manual override"}`
                        : "Selected for layout generation",
                    });
                  }
                  return;
                }

                if (layerId === "subdivision-regrid-fill-layer" || layerId === "subdivision-regrid-outline-layer") {
                  const properties = (feature.properties ?? {}) as Record<string, unknown>;
                  const address =
                    (typeof properties.situs_addr === "string" && properties.situs_addr)
                    || (typeof properties.address === "string" && properties.address)
                    || (typeof properties.propaddr === "string" && properties.propaddr)
                    || "Adjoining parcel";
                  const locality = [
                    typeof properties.situs_city === "string" ? properties.situs_city : null,
                    typeof properties.state === "string" ? properties.state : null,
                  ].filter(Boolean).join(", ");
                  const parcelId =
                    (typeof properties.ll_uuid === "string" && properties.ll_uuid)
                    || (typeof feature.id === "string" && feature.id)
                    || (typeof feature.id === "number" ? String(feature.id) : "Unknown parcel");
                  setClickedMapParcel({
                    id: parcelId,
                    title: address,
                    subtitle: locality || parcelId,
                  });
                  return;
                }

                if (layerId === "subdivision-selected-parcel-layer" || layerId === "subdivision-selected-parcel-outline-layer") {
                  setClickedMapParcel({
                    id: selectedParcel?.id ?? "selected-parcel",
                    title: selectedParcel?.name ?? "Selected project parcel",
                    subtitle: selectedParcel?.address || selectedParcel?.apn || "Saved project parcel",
                  });
                }
              }}
              zoom={projectWorkspace?.anchor.zoom ?? 15.9}
            />
          </div>
          {clickedMapParcel ? (
            <div className={styles.mapInfoCard}>
              <strong>{clickedMapParcel.title}</strong>
              <span>{clickedMapParcel.subtitle}</span>
            </div>
          ) : null}
          {(!debugEnabled || debugLayers.parcelMetrics) ? <div className={styles.metricsBar}>
            <div className={styles.metricChip}><strong>{generated?.summary.lotCount ?? 0}</strong><span>Generated lots</span></div>
            <div className={styles.metricChip}><strong>{generated?.summary.averageLotAreaSqft.toLocaleString() ?? "0"} sf</strong><span>Average lot</span></div>
            <div className={styles.metricChip}><strong>{generated?.summary.efficiencyPercent ?? 0}%</strong><span>Efficiency</span></div>
            <div className={styles.metricChip}><strong>{generated?.summary.openSpacePercent ?? 0}%</strong><span>Open space</span></div>
            <div className={styles.metricChip}><strong>{invalidLots.length}</strong><span>Invalid lots</span></div>
          </div> : null}
          {compareSavedLayout ? (
            <div className={styles.compareStage}>
              <article className={styles.compareCanvasCard}>
                <div className={styles.compareCanvasHeader}>
                  <strong>Current live layout</strong>
                  <span>{generated?.summary.lotCount ?? 0} lots | {generated?.summary.yieldUnits ?? 0} units</span>
                </div>
                <svg className={styles.compareCanvas} preserveAspectRatio="none" viewBox="0 0 100 100">
                  {selectedParcel ? <polygon className={styles.parcelPolygon} points={polygonToPoints(selectedParcel.polygon)} /> : null}
                  {generated?.buildableEnvelope.length ? <polygon className={styles.envelopePolygon} points={polygonToPoints(generated.buildableEnvelope)} /> : null}
                  {generated?.lots.map((lot) => (
                    <polygon className={`${styles.lotPolygon} ${!lot.valid ? styles.invalidLotPolygon : ""}`} key={`compare-live-${lot.id}`} points={polygonToPoints(lot.polygon)} />
                  ))}
                </svg>
              </article>
              <article className={styles.compareCanvasCard}>
                <div className={styles.compareCanvasHeader}>
                  <strong>{compareSavedLayout.name}</strong>
                  <span>{compareSavedLayout.lotCount} lots | {compareSavedLayout.yieldUnits} units</span>
                </div>
                <svg className={styles.compareCanvas} preserveAspectRatio="none" viewBox="0 0 100 100">
                  {selectedParcel ? <polygon className={styles.parcelPolygon} points={polygonToPoints(selectedParcel.polygon)} /> : null}
                  {compareSavedLayout.lots.map((lot) => (
                    <polygon className={styles.compareLotPolygon} key={`compare-saved-${lot.id}`} points={polygonToPoints(lot.polygon)} />
                  ))}
                </svg>
              </article>
            </div>
          ) : null}
        </div>

        <aside className={styles.inspector}>
          <div className={styles.panelHeader}>
            <strong>Designer controls</strong>
            <span className={styles.helper}>Tune lot rules and immediately see the design respond.</span>
          </div>
          <div className={styles.formCard}>
            <strong>Frontage selection</strong>
            <div className={styles.muted}>
              Frontage-based layouts use the selected edge as their road-facing anchor. Choose an edge here or click the orange line on the map.
            </div>
            <div className={styles.kv}>
              <span>Current frontage</span>
              <span>
                {selectedFrontage
                  ? `Edge ${selectedFrontage.edgeIndex} · ${Math.round(selectedFrontage.lengthFt)} ft`
                  : "Using parcel default"}
              </span>
            </div>
            <div className={styles.kv}>
              <span>Road-facing edge</span>
              <span>
                {selectedFrontage?.touchesPublicRow
                  ? "Confirmed"
                  : frontageCandidates.some((edge) => edge.touchesPublicRow)
                    ? "Available"
                    : "Needs review"}
              </span>
            </div>
            <div className={styles.optionListCompact}>
              {frontageCandidates.map((edge) => (
                <button
                  className={`${styles.savedActionLink} ${edge.isSelected ? styles.frontageActionActive : ""}`}
                  disabled={runAnalysis.isPending}
                  key={edge.edgeIndex}
                  onClick={() => void handleSelectFrontageEdge(edge.edgeIndex)}
                  type="button"
                >
                  {edge.isSelected ? "Selected" : "Use"}
                  {" "}
                  edge {edge.edgeIndex} · {Math.round(edge.lengthFt)} ft
                  {edge.touchesPublicRow ? " · road" : ""}
                </button>
              ))}
            </div>
            <div className={styles.warning}>
              Orange frontage line = selected frontage. If the default looks wrong, pick another edge here and the layout will recalculate.
            </div>
            <div className={styles.savedActions}>
              <button
                className={styles.savedActionLink}
                disabled={runAnalysis.isPending}
                onClick={() => void handleSelectFrontageEdge(null)}
                type="button"
              >
                {runAnalysis.isPending ? "Updating frontage..." : "Revert to parcel default"}
              </button>
            </div>
          </div>
          <div className={styles.formCard}>
            <div className={styles.muted}>Change these values and the layout refreshes immediately so you can compare tradeoffs live.</div>
            <label className={styles.field}>
              <div className={styles.fieldRow}><span>Minimum lot size (sf)</span><strong>{minLotAreaSqft.toLocaleString()}</strong></div>
              <input max="12000" min="3000" onChange={(event) => setMinLotAreaSqft(Number(event.target.value) || 0)} step="100" type="range" value={minLotAreaSqft} />
              <input onChange={(event) => setMinLotAreaSqft(Number(event.target.value) || 0)} type="number" value={minLotAreaSqft} />
            </label>
            <label className={styles.field}>
              <div className={styles.fieldRow}><span>Lot frontage (ft)</span><strong>{minFrontageFt}</strong></div>
              <input max="120" min="30" onChange={(event) => setMinFrontageFt(Number(event.target.value) || 0)} step="1" type="range" value={minFrontageFt} />
              <input onChange={(event) => setMinFrontageFt(Number(event.target.value) || 0)} type="number" value={minFrontageFt} />
            </label>
            <label className={styles.field}>
              <div className={styles.fieldRow}><span>Lot depth (ft)</span><strong>{minDepthFt}</strong></div>
              <input max="180" min="60" onChange={(event) => setMinDepthFt(Number(event.target.value) || 0)} step="1" type="range" value={minDepthFt} />
              <input onChange={(event) => setMinDepthFt(Number(event.target.value) || 0)} type="number" value={minDepthFt} />
            </label>
            <label className={styles.field}>
              <div className={styles.fieldRow}><span>Road width (ft)</span><strong>{roadWidthFt}</strong></div>
              <input disabled={!useInternalRoad} max="48" min="20" onChange={(event) => setRoadWidthFt(Number(event.target.value) || 0)} step="1" type="range" value={roadWidthFt} />
              <input disabled={!useInternalRoad} onChange={(event) => setRoadWidthFt(Number(event.target.value) || 0)} type="number" value={roadWidthFt} />
            </label>
            <label className={styles.field}><span>Setback buffer (ft)</span><input onChange={(event) => setSetbackFt(Number(event.target.value) || 0)} type="number" value={setbackFt} /></label>
            <label className={styles.field}>
              <div className={styles.fieldRow}><span>Homes per acre target</span><strong>{homesPerAcre.toFixed(1)}</strong></div>
              <input max="8" min="1" onChange={(event) => setHomesPerAcre(Number(event.target.value) || 0)} step="0.1" type="range" value={homesPerAcre} />
              <input onChange={(event) => setHomesPerAcre(Number(event.target.value) || 0)} step="0.1" type="number" value={homesPerAcre} />
            </label>
            <label className={styles.toggleField}>
              <input checked={useInternalRoad} onChange={() => setUseInternalRoad((value) => !value)} type="checkbox" />
              <span>Use internal road when corridor strategy is selected</span>
            </label>
            <div className={styles.microActions}>
              <span className={styles.muted}>Layout regenerates instantly as you move the sliders.</span>
              <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Send to Site Planner</Button></Link>
            </div>
          </div>
          <div className={styles.formCard}>
            <strong>Live summary</strong>
            <div className={styles.kv}><span>Strategy</span><span>{activeStrategyLabel}</span></div>
            <div className={styles.kv}><span>Projected homes</span><span>{projectedHomes}</span></div>
            <div className={styles.kv}>
              <span>Frontage edge</span>
              <span>
                {selectedFrontage
                  ? `Edge ${selectedFrontage.edgeIndex} · ${Math.round(selectedFrontage.lengthFt)} ft`
                  : generated?.frontageEdge
                    ? `${generated.frontageEdge.lengthFt} ft`
                    : "Needs selection"}
              </span>
            </div>
            <div className={styles.kv}><span>Access corridors</span><span>{generated?.roads.length ?? 0}</span></div>
            <div className={styles.kv}><span>Valid lots</span><span>{(generated?.summary.lotCount ?? 0) - invalidLots.length}</span></div>
            <div className={styles.kv}><span>Parcel recommendation</span><span>{selectedParcel?.intelligence?.bestSubdivisionStrategy?.replaceAll("_", " ") ?? "Run parcel analysis"}</span></div>
            <div className={styles.warning}>
              Click the orange frontage edge on the map to choose which road-facing edge drives the layout.
            </div>
            <div className={styles.savedActions}>
              <button
                className={styles.savedActionLink}
                disabled={runAnalysis.isPending}
                onClick={() => void handleSelectFrontageEdge(null)}
                type="button"
              >
                {runAnalysis.isPending ? "Updating frontage..." : "Clear frontage override"}
              </button>
            </div>
          </div>
          <div className={styles.formCard}>
            <strong>Warnings and checks</strong>
            {!selectedParcel?.intelligence ? <div className={styles.warningStrong}>Run parcel analysis first to generate a trustworthy layout.</div> : null}
            {fitReasons.length ? (
              <div className={styles.reasonList}>
                {fitReasons.map((reason) => (
                  <div className={styles.warningStrong} key={reason}>{reason}</div>
                ))}
              </div>
            ) : null}
            {generated?.summary.warnings.length ? generated.summary.warnings.map((warning) => (
              <div className={styles.warning} key={warning}>{warning}</div>
            )) : <div className={styles.muted}>No layout warnings for the current settings.</div>}
            {invalidLots.length ? <div className={styles.warningStrong}>{invalidLots.length} lots are highlighted in red because they fail the current rules.</div> : null}
          </div>
          <div className={styles.formCard}>
            <strong>Saved concepts</strong>
            <div className={styles.optionListCompact}>
              {savedLayouts.map((layout) => (
                <div
                  className={`${styles.savedCard} ${layout.id === selectedSavedLayout?.id ? styles.savedCardPrimary : ""} ${layout.id === compareSavedLayout?.id ? styles.savedCardCompare : ""}`}
                  key={layout.id}
                >
                  <strong>{layout.name}</strong>
                  <span className={styles.muted}>{layout.lotCount} lots | {layout.averageLotAreaSqft.toLocaleString()} sf avg</span>
                  <span className={styles.muted}>
                    {layout.id === selectedSavedLayout?.id ? "Primary workflow layout" : layout.id === compareSavedLayout?.id ? "Compare layout" : "Saved concept"}
                  </span>
                  <div className={styles.savedActions}>
                    <button className={styles.savedActionLink} onClick={() => workflow.setLayoutId(layout.id)} type="button">Use as primary</button>
                    <button
                      className={styles.savedActionLink}
                      onClick={() => workflow.setCompareLayoutId(layout.id === compareSavedLayout?.id ? "" : layout.id)}
                      type="button"
                    >
                      {layout.id === compareSavedLayout?.id ? "Clear compare" : "Compare"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Link to={`/app/projects/${projectId}/yield`}><Button variant="secondary">Compare in yield</Button></Link>
          </div>
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}
