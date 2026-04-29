import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ProjectParcelSelection } from "@landportal/api-client";
import {
  buildMapBoundsWithTransform,
  createProjectDisplayTransform,
  projectLocalRingToLngLatWithTransform,
  type LocalCoordinate,
} from "@landportal/map-core";

import { BaseMapCanvas } from "@/modules/map/BaseMapCanvas";
import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { DebugLayerPanel } from "@/modules/map/DebugLayerPanel";
import { MapControls } from "@/modules/map/MapControls";
import type { MapLayerDescriptor } from "@/modules/map/MapLayerManager";
import { useDebugLayerStore } from "@/modules/map/debugLayerStore";
import { useSharedMapState } from "@/modules/map/useSharedMapState";
import { useParcelTerrainSummary, useTerrainPointSample, useTerrainSourceMetadata } from "@/modules/map/useTerrain";
import { resolveActiveParcelId } from "@/modules/parcel/activeParcelAnchor";
import { useCreateParcelSnapshot, useRunParcelAnalysis } from "@/modules/parcel/useParcelIntelligence";
import { useProjectParcelSelection, useProjectParcelSelections, useUpsertProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { useRegridParcelDetail, useRegridParcelSearch, useRegridParcelTileConfig } from "@/modules/parcel/useRegridParcels";
import { useProjectWorkflow } from "@/modules/projects/useProjectWorkflow";
import { useProjects } from "@/modules/projects/useProjects";
import { useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjectSurvey } from "@/modules/projects/useProjectSurvey";
import { useProjectWorkspace } from "@/modules/projects/useProjectWorkspace";
import { useTitleWorkspace } from "@/modules/title/useTitleCommitments";
import { hasRegridProxyEnv } from "@/lib/regrid";

import styles from "./ProjectParcelPage.module.css";

function polygonCenter(points: Array<{ x: number; y: number }>) {
  if (!points.length) return { x: 50, y: 50 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
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
      return "row";
    case "easement":
      return "easement";
    case "flood":
    case "floodplain":
      return "floodplain";
    case "utility":
    case "utility_zone":
      return "utility_zone";
    case "tree":
    case "tree_preservation":
      return "tree_preservation";
    case "steep_slope":
      return "steep_slope";
    case "wetland":
      return "wetland";
    case "setback":
      return "setback_front";
    default:
      return "custom";
  }
}

function closeLocalRing(points: Array<{ x: number; y: number }>) {
  const ring = points.map((point) => ({ x: point.x, y: point.y }));
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first.x !== last.x || first.y !== last.y)) {
    ring.push({ ...first });
  }
  return ring;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
}

const strategyLabel: Record<string, string> = {
  frontage_split: "Frontage split",
  grid: "Grid",
  access_corridor: "Access corridor",
  cluster: "Cluster",
  manual_review: "Manual review",
};

type ParcelLabelMode = "minimal" | "review" | "sheet";
type PendingAnchorFocus = { target: "snapshot" | "provider"; id: string } | null;

function formatInspectorDate(value?: string | null) {
  if (!value) return "Not yet synced";
  return new Date(value).toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function readFeatureParcelId(feature: GeoJSON.Feature | null | undefined) {
  const propertyId = feature?.properties?.ll_uuid;
  if (typeof propertyId === "string") return propertyId;
  return typeof feature?.id === "string" ? feature.id : typeof feature?.id === "number" ? String(feature.id) : null;
}

function geometryBounds(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null): [[number, number], [number, number]] | null {
  if (!geometry) return null;

  const pairs =
    geometry.type === "Polygon"
      ? geometry.coordinates.flat()
      : geometry.coordinates.flat(2);

  if (!pairs.length) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  pairs.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  return [[minLng, minLat], [maxLng, maxLat]];
}

function geometryCentroid(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null) {
  if (!geometry) return null;
  const pairs =
    geometry.type === "Polygon"
      ? geometry.coordinates.flat()
      : geometry.coordinates.flat(2);

  if (!pairs.length) return null;

  const totals = pairs.reduce(
    (acc, [lng, lat]) => ({
      lng: acc.lng + lng,
      lat: acc.lat + lat,
    }),
    { lng: 0, lat: 0 },
  );

  return {
    lng: totals.lng / pairs.length,
    lat: totals.lat / pairs.length,
  };
}

function geometryBBoxJson(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null) {
  const bounds = geometryBounds(geometry);
  if (!bounds) return null;

  return {
    maxLat: bounds[1][1],
    maxLng: bounds[1][0],
    minLat: bounds[0][1],
    minLng: bounds[0][0],
  };
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

  return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
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

function boundarySignature(parcelId: string, boundary: Array<{ x: number; y: number }>) {
  return `${parcelId}:${boundary.map((point) => `${point.x}:${point.y}`).join("|")}`;
}

function localPolygonArea(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

function scaleLocalPolygonToArea(
  points: Array<{ x: number; y: number }>,
  targetAreaSqft: number | null | undefined,
) {
  if (!points.length || !targetAreaSqft || targetAreaSqft <= 0) return points;
  const currentArea = localPolygonArea(points);
  if (currentArea <= 0) return points;

  const scale = Math.sqrt(targetAreaSqft / currentArea);
  return points.map((point) => ({
    x: point.x * scale,
    y: point.y * scale,
  }));
}

function providerGeometryToLocalPolygon(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null,
  targetAreaSqft?: number | null,
) {
  if (!geometry) return [];

  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0]?.[0];

  if (!Array.isArray(ring) || ring.length < 4) return [];

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  ring.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  const width = Math.max(maxLng - minLng, 0.000001);
  const height = Math.max(maxLat - minLat, 0.000001);
  const paddedWidth = 100;
  const paddedHeight = 100;

  const normalizedPoints = ring
    .slice(0, -1)
    .map(([lng, lat]) => ({
      x: ((lng - minLng) / width) * paddedWidth,
      y: ((lat - minLat) / height) * paddedHeight,
    }));

  return scaleLocalPolygonToArea(normalizedPoints, targetAreaSqft);
}

export function ProjectParcelPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const {
    data: workspace,
    error: workspaceError,
    isLoading: isWorkspaceLoading,
  } = useProjectWorkspace(projectId);
  const surveyState = useProjectSurvey(projectId);
  const { data: titleWorkspace } = useTitleWorkspace(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const { data: savedParcelSelections = [] } = useProjectParcelSelections(projectId);
  const regridTileConfig = useRegridParcelTileConfig();
  const saveParcelSelection = useUpsertProjectParcelSelection(projectId);
  const createParcelSnapshot = useCreateParcelSnapshot(projectId);
  const runAnalysis = useRunParcelAnalysis(projectId);
  const workflow = useProjectWorkflow(projectId);
  const mapState = useSharedMapState(`${projectId}:parcel-map`);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [parcelSearch, setParcelSearch] = useState("");
  const [selectedRegridUuid, setSelectedRegridUuid] = useState<string | null>(null);
  const [hoveredRegridUuid, setHoveredRegridUuid] = useState<string | null>(null);
  const [terrainProbe, setTerrainProbe] = useState<{ lng: number; lat: number } | null>(null);
  const [hoveredParcelId, setHoveredParcelId] = useState<string | null>(null);
  const [leftPanel, setLeftPanel] = useState<"parcels" | "scenarios" | "tools">("parcels");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [labelMode, setLabelMode] = useState<ParcelLabelMode>("minimal");
  const [pendingAnchorFocus, setPendingAnchorFocus] = useState<PendingAnchorFocus>(null);
  const [optimisticParcelSelection, setOptimisticParcelSelection] = useState<ProjectParcelSelection | null>(null);
  const lastSurveySyncRef = useRef<string>("");
  const restoredAnchorFocusRef = useRef<string>("");
  const debugEnabled = useDebugLayerStore((state) => state.enabled);
  const debugLayers = useDebugLayerStore((state) => state.layers);
  const terrainMetadata = useTerrainSourceMetadata();
  const regridSearch = useRegridParcelSearch(parcelSearch);
  const selectedRegridParcel = useRegridParcelDetail(selectedRegridUuid);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSidebar = window.localStorage.getItem("landportal:parcel-sidebar-collapsed");
    const storedLabelMode = window.localStorage.getItem("landportal:parcel-label-mode");
    if (storedSidebar === "true") {
      setSidebarCollapsed(true);
    }
    if (storedLabelMode === "minimal" || storedLabelMode === "review" || storedLabelMode === "sheet") {
      setLabelMode(storedLabelMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("landportal:parcel-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("landportal:parcel-label-mode", labelMode);
  }, [labelMode]);

  useEffect(() => {
    if (!development?.parcels.length) return;
    const preferredParcelId = resolveActiveParcelId(optimisticParcelSelection ?? parcelSelection, workflow.parcelId, development.parcels);

    setSelectedParcelId((current) => {
      if (current && development.parcels.some((parcel) => parcel.id === current)) {
        return current;
      }
      return preferredParcelId;
    });
  }, [development?.parcels, optimisticParcelSelection, parcelSelection, workflow.parcelId]);

  useEffect(() => {
    if (!optimisticParcelSelection || !parcelSelection) return;
    if (optimisticParcelSelection.id === parcelSelection.id && optimisticParcelSelection.updatedAt === parcelSelection.updatedAt) {
      setOptimisticParcelSelection(null);
    }
  }, [optimisticParcelSelection, parcelSelection]);

  const effectiveParcelSelection = optimisticParcelSelection ?? parcelSelection;
  const hasProviderOnlyAnchor = Boolean(effectiveParcelSelection?.providerParcelId && !effectiveParcelSelection?.parcelSnapshotId);
  const selectedParcel =
    development?.parcels.find((parcel) => parcel.id === selectedParcelId)
    ?? (selectedRegridUuid || hasProviderOnlyAnchor ? null : development?.parcels[0] ?? null);
  const providerParcel = selectedRegridParcel.data ?? null;
  const hoveredParcel =
    development?.parcels.find((parcel) => parcel.id === hoveredParcelId) ?? null;
  const previewParcel = hoveredParcel ?? selectedParcel;
  const parcelScenarios = useMemo(() => {
    if (!development?.scenarios.length) return [];
    return development.scenarios.filter((scenario) => !selectedParcel || !scenario.parcelId || scenario.parcelId === selectedParcel.id);
  }, [development?.scenarios, selectedParcel]);
  const selectedParcelIsAttached =
    Boolean(selectedParcel) &&
    (
      effectiveParcelSelection?.parcelSnapshotId === selectedParcel?.id ||
      effectiveParcelSelection?.providerParcelId === selectedParcel?.id
    );
  const selectedProviderParcelIsAttached =
    Boolean(providerParcel) && effectiveParcelSelection?.providerParcelId === providerParcel?.llUuid;
  const activeSavedSelection =
    selectedParcel
      ? savedParcelSelections.find((entry) => entry.parcelSnapshotId === selectedParcel.id)
        ?? (effectiveParcelSelection?.parcelSnapshotId === selectedParcel.id ? effectiveParcelSelection : null)
        ?? null
      : providerParcel
        ? savedParcelSelections.find((entry) => entry.providerParcelId === providerParcel.llUuid)
          ?? (effectiveParcelSelection?.providerParcelId === providerParcel.llUuid ? effectiveParcelSelection : null)
          ?? null
        : effectiveParcelSelection ?? null;
  const activeParcelSelection =
    selectedProviderParcelIsAttached || selectedParcelIsAttached || Boolean(activeSavedSelection)
      ? activeSavedSelection
      : null;
  const anchoredSelectionBounds = useMemo(
    () => selectionBoundsFromJson(activeParcelSelection?.bbox ?? null),
    [activeParcelSelection?.bbox],
  );
  const activeAnchorSnapshotId = effectiveParcelSelection?.parcelSnapshotId ?? null;
  const activeAnchorParcel =
    development?.parcels.find((parcel) => parcel.id === activeAnchorSnapshotId) ?? null;
  const activeAnchorName =
    effectiveParcelSelection?.parcelName
    || activeAnchorParcel?.name
    || effectiveParcelSelection?.providerParcelId
    || "No parcel anchor selected";
  const focusTargetName =
    activeAnchorName !== "No parcel anchor selected"
      ? activeAnchorName
      : providerParcel?.headline
        || selectedParcel?.name
        || "No parcel selected";
  const canFocusSelection = Boolean(effectiveParcelSelection || providerParcel || selectedParcel);
  const activeAnchorCount = savedParcelSelections.filter((entry) => entry.anchorStatus === "active").length;
  const activeTitleCommitment =
    titleWorkspace?.commitments.find((entry) => entry.isPrimary)
    ?? titleWorkspace?.commitments[0]
    ?? null;
  const activeTitleReferences = activeTitleCommitment
    ? (titleWorkspace?.references ?? []).filter((entry) => entry.titleCommitmentId === activeTitleCommitment.id)
    : [];
  const activeTitleMissingCount = activeTitleReferences.filter((entry) => !entry.visitedProjectDocumentId).length;
  const activeTitleReviewCount = activeTitleReferences.filter((entry) => entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review").length;

  useEffect(() => {
    if (!parcelScenarios.length) {
      setSelectedScenarioId("");
      return;
    }
    setSelectedScenarioId((current) => current || workflow.scenarioId || parcelScenarios[0].id);
  }, [parcelScenarios, workflow.scenarioId]);

  useEffect(() => {
    if (!selectedScenarioId) return;
    if (parcelScenarios.some((scenario) => scenario.id === selectedScenarioId)) return;
    setSelectedScenarioId("");
  }, [parcelScenarios, selectedScenarioId]);

  useEffect(() => {
    if (!selectedParcelId) return;
    if (workflow.parcelId === selectedParcelId) return;
    workflow.setParcelId(selectedParcelId);
    workflow.pushRecentParcelId(selectedParcelId);
  }, [selectedParcelId, workflow]);

  useEffect(() => {
    if (!selectedScenarioId) return;
    if (workflow.scenarioId === selectedScenarioId) return;
    workflow.setScenarioId(selectedScenarioId);
  }, [selectedScenarioId, workflow]);

  const selectedScenario = parcelScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? parcelScenarios[0] ?? null;
  const activeSurveyParcel =
    surveyState.parcels.find((parcel) => parcel.id === (surveyState.activeSurveyParcelId || selectedParcel?.id || ""))
    ?? (selectedParcel ? surveyState.parcels.find((parcel) => parcel.id === selectedParcel.id) : null)
    ?? surveyState.parcels[0]
    ?? null;
  const surveyCompare = useMemo(() => {
    if (!selectedParcel || !activeSurveyParcel) return null;
    const grossArea = selectedParcel.areaAcres;
    const surveyAreaAcres = activeSurveyParcel.area / 43560;
    const areaDelta = Math.abs(grossArea - surveyAreaAcres);
    const areaDeltaPercent = grossArea > 0 ? (areaDelta / grossArea) * 100 : 0;
    return {
      areaDelta,
      areaDeltaPercent,
      boundaryPointCount: activeSurveyParcel.boundary.length,
      closureError: activeSurveyParcel.closure.closureError,
      precisionRatio: activeSurveyParcel.closure.precisionRatio,
      source: activeSurveyParcel.source,
      withinTolerance: activeSurveyParcel.closure.withinTolerance,
    };
  }, [activeSurveyParcel, selectedParcel]);
  const totalBuildable = development?.parcels.reduce((sum, parcel) => sum + parcel.buildableAcres, 0) ?? 0;
  const maxYield = parcelScenarios.reduce((sum, scenario) => Math.max(sum, scenario.units), 0);
  const intelligence = selectedParcel?.intelligence ?? null;
  const terrainSample = useTerrainPointSample(terrainProbe, mapState.terrainEnabled);
  const terrainSummary = useParcelTerrainSummary(
    selectedParcel
      ? {
        parcelId: selectedParcel.id,
        polygon: selectedParcel.polygon,
        buildableAreaAcres: selectedParcel.buildableAcres,
      }
      : null,
    mapState.terrainEnabled,
  );
  const parcelBlockers = [
    !intelligence ? "Run parcel analysis to create a trusted intelligence record." : null,
    intelligence && !selectedParcel?.frontageEdges.some((edge) => edge.isSelected) ? "Confirm the frontage edge before pushing this parcel into layout generation." : null,
  ].filter(Boolean) as string[];
  const parcelWarnings = intelligence?.warnings.map((warning) => warning.message) ?? [];
  const parcelChecks = [
    intelligence ? `Recommended strategy: ${strategyLabel[intelligence.bestSubdivisionStrategy]}.` : "No strategy recommendation yet.",
    parcelScenarios.length ? `${parcelScenarios.length} linked yield scenarios are available.` : "No saved yield scenarios are linked to this parcel yet.",
    selectedParcel ? `${selectedParcel.constraints.length} saved constraints are shaping this parcel.` : "No parcel selected.",
    surveyCompare
      ? `Survey compare is ${surveyCompare.withinTolerance ? "within tolerance" : "flagged"} against the active parcel.`
      : "No promoted survey parcel is available for compare yet.",
    selectedParcelIsAttached
      ? `Selected parcel is attached to the project through ${parcelSelection?.parcelProvider ?? "manual_snapshot"}.`
      : "Selected parcel has not been attached to the project record yet.",
  ];
  const parcelReviewItems = [
    ...(intelligence?.warnings.map((warning) => ({
      id: `parcel-${warning.code}-${warning.message}`,
      label: warning.message,
      severity: warning.severity,
      source: "parcel intelligence",
    })) ?? []),
    ...surveyState.issues.map((issue) => ({
      id: `survey-${issue.id}`,
      label: issue.message,
      severity: issue.severity,
      source: "survey review",
    })),
    ...(
      surveyCompare && !surveyCompare.withinTolerance
        ? [{
          id: "survey-compare-delta",
          label: `Survey boundary differs from the active parcel by ${surveyCompare.areaDelta.toFixed(2)} ac (${surveyCompare.areaDeltaPercent.toFixed(1)}%).`,
          severity: "warning" as const,
          source: "survey compare",
        }]
        : []
    ),
    ...activeTitleReferences
      .filter((entry) => !entry.visitedProjectDocumentId || entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review")
      .map((entry) => ({
        id: `title-${entry.id}`,
        label: !entry.visitedProjectDocumentId
          ? `Missing stored document for ${entry.referenceText || entry.referenceKey || "title reference"}.`
          : entry.fetchStatus === "manual_review"
            ? `${entry.referenceText || entry.referenceKey || "Title reference"} needs manual review.`
            : `${entry.referenceText || entry.referenceKey || "Title reference"} failed fetch and should be retried.`,
        severity: !entry.visitedProjectDocumentId
          ? "warning"
          : entry.fetchStatus === "manual_review"
            ? "info"
            : "warning",
        source: "title review",
      })),
  ];
  const reviewPriorityTone =
    parcelReviewItems.some((item) => item.severity === "error")
      ? "Blocked"
      : parcelReviewItems.some((item) => item.severity === "warning")
        ? "Attention"
        : "Ready";
  const recentParcels = useMemo(
    () =>
      workflow.recentParcelIds
        .map((parcelId) => development?.parcels.find((entry) => entry.id === parcelId))
        .filter((entry): entry is NonNullable<typeof selectedParcel> => Boolean(entry)),
    [development?.parcels, workflow.recentParcelIds],
  );
  const parcelTone = parcelBlockers.length ? "blocked" : parcelWarnings.length ? "attention" : "ready";
  const regridParcelBounds = useMemo(
    () => geometryBounds(providerParcel?.geometry ?? null),
    [providerParcel?.geometry],
  );
  const parcelMap = useMemo(() => {
    if (!workspace) {
      return {
        bounds: [
          [0, 0],
          [0, 0],
        ] as [[number, number], [number, number]],
        center: [-104.8207, 38.8339] as [number, number],
        zoom: 14,
        layers: [] as MapLayerDescriptor[],
      };
    }

    const parcels = development?.parcels ?? [];
    const localPoints: LocalCoordinate[] = parcels.flatMap((parcel) => [
      ...parcel.polygon,
      ...parcel.buildableEnvelope,
      ...parcel.constraints.flatMap((constraint) => constraint.points),
      ...parcel.frontageEdges.flatMap((edge) => edge.points),
    ]);
    const transform = createProjectDisplayTransform(
      workspace.anchor,
      localPoints.length ? localPoints : [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      workspace.spatialReference,
    );

    const shouldUseAnchoredSelectionGeometry = Boolean(
      activeParcelSelection?.geometry
      && selectedParcel
      && activeParcelSelection.parcelSnapshotId === selectedParcel.id,
    );

  const parcelFillFeatures: GeoJSON.Feature[] = parcels
    .filter((parcel) => !(shouldUseAnchoredSelectionGeometry && parcel.id === selectedParcel?.id))
    .map((parcel) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [projectLocalRingToLngLatWithTransform(closeLocalRing(parcel.polygon), transform)],
      },
      properties: {
        id: parcel.id,
        name: parcel.name,
      },
    }));

  const parcelOutlineFeatures: GeoJSON.Feature[] = parcels
    .filter((parcel) => !(shouldUseAnchoredSelectionGeometry && parcel.id === selectedParcel?.id))
    .map((parcel) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: projectLocalRingToLngLatWithTransform(closeLocalRing(parcel.polygon), transform),
      },
      properties: {
        id: parcel.id,
      },
    }));

    const labelFeatures: GeoJSON.Feature[] = parcels.flatMap((parcel) => {
      const isAnchorParcel = activeParcelSelection?.parcelSnapshotId === parcel.id;
      const shouldIncludeLabel =
        labelMode === "sheet"
          ? true
          : labelMode === "review"
            ? parcel.id === selectedParcel?.id || parcel.id === hoveredParcelId || isAnchorParcel
            : parcel.id === selectedParcel?.id || parcel.id === hoveredParcelId;

      if (!shouldIncludeLabel) {
        return [];
      }

      const center = polygonCenter(parcel.polygon);
      const projected = projectLocalRingToLngLatWithTransform([center], transform)[0] ?? [workspace.anchor.lng, workspace.anchor.lat];
      return [{
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: projected,
        },
        properties: {
          id: parcel.id,
          name: parcel.name,
          isAnchor: isAnchorParcel,
          isSelected: parcel.id === selectedParcel?.id,
        },
      }];
    });

    const selectedBuildableFeatures: GeoJSON.Feature[] = selectedParcel?.buildableEnvelope.length
      ? [{
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [projectLocalRingToLngLatWithTransform(closeLocalRing(selectedParcel.buildableEnvelope), transform)],
        },
        properties: {
          id: selectedParcel.id,
        },
      }]
      : [];

    const selectedConstraintFeatures: GeoJSON.Feature[] = selectedParcel?.constraints.flatMap((constraint) => (
      constraint.points.length
        ? [{
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [projectLocalRingToLngLatWithTransform(closeLocalRing(constraint.points), transform)],
          },
          properties: {
            id: constraint.id,
            label: constraint.label,
          },
        }]
        : []
    )) ?? [];

    const selectedFrontageFeatures: GeoJSON.Feature[] = selectedParcel?.frontageEdges.flatMap((edge) => (
      edge.points.length
        ? [{
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: projectLocalRingToLngLatWithTransform(edge.points, transform),
          },
          properties: {
            id: `${selectedParcel.id}-${edge.edgeIndex}`,
            edgeIndex: edge.edgeIndex,
            edgeRole: edge.role,
            lengthFt: edge.lengthFt,
            selected: edge.isSelected,
            touchesPublicRow: edge.touchesPublicRow,
          },
        }]
        : []
    )) ?? [];

    const selectedFrontageLabelFeatures: GeoJSON.Feature[] = selectedParcel?.frontageEdges.flatMap((edge) => {
      if (edge.points.length < 2) return [];
      const midpoint = {
        x: (edge.points[0].x + edge.points[1].x) / 2,
        y: (edge.points[0].y + edge.points[1].y) / 2,
      };
      const projectedMidpoint = projectLocalRingToLngLatWithTransform([midpoint], transform)[0];
      if (!projectedMidpoint) return [];

      return [{
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: projectedMidpoint,
        },
        properties: {
          id: `${selectedParcel.id}-label-${edge.edgeIndex}`,
          label: `Edge ${edge.edgeIndex} · ${Math.round(edge.lengthFt)} ft`,
          selected: edge.isSelected,
          touchesPublicRow: edge.touchesPublicRow,
        },
      }];
    }) ?? [];

    const selectedSurveyBoundaryFeatures: GeoJSON.Feature[] = activeSurveyParcel?.boundary.length
      ? [{
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: projectLocalRingToLngLatWithTransform(
            closeLocalRing(activeSurveyParcel.boundary),
            transform,
          ),
        },
        properties: {
          id: activeSurveyParcel.id,
          source: activeSurveyParcel.source,
          withinTolerance: activeSurveyParcel.closure.withinTolerance,
        },
      }]
      : [];

    const selectedProviderFeatures: GeoJSON.Feature[] = providerParcel?.geometry
      ? [{
        type: "Feature",
        geometry: providerParcel.geometry,
        properties: {
          id: providerParcel.llUuid,
          name: providerParcel.headline,
        },
      }]
      : [];

    const anchoredSelectedFillFeatures: GeoJSON.Feature[] = shouldUseAnchoredSelectionGeometry && selectedParcel
      ? selectionGeometryFeature(activeParcelSelection?.geometry ?? null, selectedParcel.id, selectedParcel.name)
      : [];

    const layers: MapLayerDescriptor[] = [
      ...(regridTileConfig.data
        ? [
          {
            id: "regrid-parcel-fill-layer",
            sourceId: "regrid-parcels",
            source: {
              type: "vector" as const,
              tiles: regridTileConfig.data.tiles,
              promoteId: "ll_uuid",
            },
            sourceLayer: regridTileConfig.data.id,
            visible: mapState.visibility.parcels,
            interactive: true,
            layer: {
              type: "fill" as const,
              paint: {
                "fill-color": [
                  "case",
                  ["==", ["coalesce", ["to-string", ["id"]], ["get", "ll_uuid"]], selectedRegridUuid ?? ""],
                  "rgba(59, 116, 214, 0.22)",
                  ["==", ["coalesce", ["to-string", ["id"]], ["get", "ll_uuid"]], hoveredRegridUuid ?? ""],
                  "rgba(240, 196, 91, 0.18)",
                  "rgba(255,255,255,0.04)",
                ],
                "fill-outline-color": "rgba(255,255,255,0)",
              },
            },
          },
          {
            id: "regrid-parcel-outline-layer",
            sourceId: "regrid-parcels",
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
                "line-color": [
                  "case",
                  ["==", ["coalesce", ["to-string", ["id"]], ["get", "ll_uuid"]], selectedRegridUuid ?? ""],
                  "#6ea0f6",
                  ["==", ["coalesce", ["to-string", ["id"]], ["get", "ll_uuid"]], hoveredRegridUuid ?? ""],
                  "#f0c45b",
                  "rgba(219, 228, 236, 0.52)",
                ],
                "line-width": [
                  "case",
                  ["==", ["coalesce", ["to-string", ["id"]], ["get", "ll_uuid"]], selectedRegridUuid ?? ""],
                  2.5,
                  ["==", ["coalesce", ["to-string", ["id"]], ["get", "ll_uuid"]], hoveredRegridUuid ?? ""],
                  1.8,
                  1.1,
                ],
              },
            },
          },
        ] satisfies MapLayerDescriptor[]
        : []),
      {
        id: "parcel-fill-layer",
        sourceId: "parcel-fill",
        source: { type: "geojson", data: { type: "FeatureCollection", features: parcelFillFeatures } },
        visible: mapState.visibility.parcels,
        interactive: true,
        layer: {
          type: "fill",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "id"], selectedParcel?.id ?? ""],
              "rgba(87, 124, 196, 0.34)",
              ["==", ["get", "id"], hoveredParcelId ?? ""],
              "rgba(235, 193, 91, 0.28)",
              "rgba(255,255,255,0.38)",
            ],
            "fill-outline-color": "#20304f",
          },
        },
      },
      {
        id: "parcel-anchor-fill-layer",
        sourceId: "parcel-anchor-fill",
        source: { type: "geojson", data: { type: "FeatureCollection", features: anchoredSelectedFillFeatures } },
        visible: mapState.visibility.parcels,
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(87, 124, 196, 0.34)",
            "fill-outline-color": "#20304f",
          },
        },
      },
      {
        id: "parcel-outline-layer",
        sourceId: "parcel-outline",
        source: { type: "geojson", data: { type: "FeatureCollection", features: parcelOutlineFeatures } },
        visible: mapState.visibility.parcels,
        layer: {
          type: "line",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "id"], selectedParcel?.id ?? ""],
              "#1b2e60",
              ["==", ["get", "id"], hoveredParcelId ?? ""],
              "#f0c45b",
              "#20304f",
            ],
            "line-width": [
              "case",
              ["==", ["get", "id"], selectedParcel?.id ?? ""],
              3.2,
              ["==", ["get", "id"], hoveredParcelId ?? ""],
              2.6,
              2,
            ],
          },
        },
      },
      {
        id: "parcel-anchor-outline-layer",
        sourceId: "parcel-anchor-outline",
        source: { type: "geojson", data: { type: "FeatureCollection", features: anchoredSelectedFillFeatures } },
        visible: mapState.visibility.parcels,
        layer: {
          type: "line",
          paint: {
            "line-color": "#1b2e60",
            "line-width": 3.2,
          },
        },
      },
      {
        id: "parcel-label-layer",
        sourceId: "parcel-labels",
        source: { type: "geojson", data: { type: "FeatureCollection", features: labelFeatures } },
        visible: mapState.visibility.labels,
        minzoom: labelMode === "sheet" ? 12 : labelMode === "review" ? 13 : 14,
        layer: {
          type: "symbol",
          layout: {
            "text-field": ["get", "name"],
            "text-size": labelMode === "sheet" ? 13 : labelMode === "review" ? 12 : 11,
            "text-font": ["Open Sans Regular"],
            "text-variable-anchor": ["top", "bottom", "left", "right"],
            "text-radial-offset": labelMode === "sheet" ? 1.15 : 0.85,
          },
          paint: {
            "text-color": [
              "case",
              ["==", ["get", "isSelected"], true],
              "#1b2e60",
              ["==", ["get", "isAnchor"], true],
              "#204a8c",
              "#253247",
            ],
          },
        },
      },
      {
        id: "parcel-buildable-layer",
        sourceId: "parcel-buildable",
        source: { type: "geojson", data: { type: "FeatureCollection", features: selectedBuildableFeatures } },
        visible: mapState.visibility.buildable && (!debugEnabled || debugLayers.buildableEnvelope),
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(30, 141, 98, 0.14)",
            "fill-outline-color": "rgba(30, 141, 98, 0.82)",
          },
        },
      },
      {
        id: "parcel-constraint-layer",
        sourceId: "parcel-constraints",
        source: { type: "geojson", data: { type: "FeatureCollection", features: selectedConstraintFeatures } },
        visible: mapState.visibility.constraints && (!debugEnabled || debugLayers.constraints),
        layer: {
          type: "fill",
          paint: {
            "fill-color": "rgba(201, 79, 79, 0.18)",
            "fill-outline-color": "rgba(160, 52, 52, 0.75)",
          },
        },
      },
      {
        id: "parcel-frontage-layer",
        sourceId: "parcel-frontage",
        source: { type: "geojson", data: { type: "FeatureCollection", features: selectedFrontageFeatures } },
        visible: mapState.visibility.frontage && (!debugEnabled || debugLayers.frontageEdges || debugLayers.selectedFrontage),
        interactive: true,
        layer: {
          type: "line",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "selected"], true],
              "#204a8c",
              "rgba(32, 74, 140, 0.55)",
            ],
            "line-width": [
              "case",
              ["==", ["get", "selected"], true],
              3,
              2,
            ],
          },
        },
      },
      {
        id: "parcel-frontage-label-layer",
        sourceId: "parcel-frontage-labels",
        source: { type: "geojson", data: { type: "FeatureCollection", features: selectedFrontageLabelFeatures } },
        visible: mapState.visibility.frontage && mapState.visibility.labels && (!debugEnabled || debugLayers.frontageEdges || debugLayers.selectedFrontage),
        minzoom: 15,
        layer: {
          type: "symbol",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-font": ["Open Sans Regular"],
            "text-variable-anchor": ["top", "bottom"],
            "text-radial-offset": 0.7,
          },
          paint: {
            "text-color": [
              "case",
              ["==", ["get", "selected"], true],
              "#123a72",
              ["==", ["get", "touchesPublicRow"], true],
              "#204a8c",
              "#38506e",
            ],
            "text-halo-color": "rgba(255,255,255,0.92)",
            "text-halo-width": 1.2,
          },
        },
      },
      {
        id: "parcel-survey-compare-layer",
        sourceId: "parcel-survey-compare",
        source: { type: "geojson", data: { type: "FeatureCollection", features: selectedSurveyBoundaryFeatures } },
        visible: mapState.visibility.survey,
        layer: {
          type: "line",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "withinTolerance"], true],
              "rgba(30, 141, 98, 0.92)",
              "rgba(201, 79, 79, 0.92)",
            ],
            "line-width": 2.4,
            "line-opacity": 0.95,
            "line-dasharray": [1.5, 1.5],
          },
        },
      },
      {
        id: "selected-provider-parcel-layer",
        sourceId: "selected-provider-parcel",
        source: { type: "geojson", data: { type: "FeatureCollection", features: selectedProviderFeatures } },
        visible: mapState.visibility.parcels,
        layer: {
          type: "line",
          paint: {
            "line-color": "#7fb1ff",
            "line-width": 3.2,
          },
        },
      },
    ];

    return {
      bounds: anchoredSelectionBounds ?? regridParcelBounds ?? buildMapBoundsWithTransform(localPoints.length ? localPoints : [{ x: 0, y: 0 }, { x: 100, y: 100 }], transform),
      center: [workspace.anchor.lng, workspace.anchor.lat] as [number, number],
      zoom: workspace.anchor.zoom,
      layers,
    };
  }, [
    debugEnabled,
    debugLayers.buildableEnvelope,
    debugLayers.constraints,
    debugLayers.frontageEdges,
    debugLayers.selectedFrontage,
    development?.parcels,
    mapState.visibility.buildable,
    mapState.visibility.constraints,
    mapState.visibility.frontage,
    mapState.visibility.labels,
    mapState.visibility.parcels,
    hoveredParcelId,
    hoveredRegridUuid,
    activeParcelSelection?.geometry,
    activeParcelSelection?.parcelSnapshotId,
    anchoredSelectionBounds,
    activeSurveyParcel,
    labelMode,
    providerParcel,
    regridParcelBounds,
    regridTileConfig.data,
    selectedParcel,
    selectedRegridUuid,
    workspace,
  ]);

  const runParcelAnalysisForEdge = async (
    parcel: NonNullable<typeof selectedParcel>,
    selectedFrontageEdgeIndex: number | null,
  ) => {
    if (!parcel.polygon.length) return;

    const linkedSelection = savedParcelSelections.find((selection) => selection.parcelSnapshotId === parcel.id);
    const providerGeometry =
      linkedSelection?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined;
    const boundaryPoints =
      providerGeometry && (providerGeometry.type === "Polygon" || providerGeometry.type === "MultiPolygon")
        ? providerGeometryToLocalPolygon(providerGeometry, parcel.areaAcres * 43560)
        : parcel.polygon;

    await runAnalysis.mutateAsync({
      parcelSnapshotId: parcel.id,
      boundary: toPolygonGeometry(boundaryPoints),
      constraints: parcel.constraints.map((constraint) => ({
        id: constraint.id,
        constraintType: normalizeConstraintType(constraint.type),
        label: constraint.label,
        geometry: constraint.points.length ? toPolygonGeometry(constraint.points) : null,
        attributes: constraint.attributes,
      })),
      selectedFrontageEdgeIndex,
      analysisVersion: "v1",
    });
  };

  const handleRunAnalysis = async () => {
    if (!selectedParcel?.polygon.length) return;

    await runParcelAnalysisForEdge(
      selectedParcel,
      selectedParcel.frontageEdges.find((edge) => edge.isSelected)?.edgeIndex ?? null,
    );
  };

  const handleSelectFrontageEdge = async (edgeIndex: number) => {
    if (!selectedParcel || runAnalysis.isPending) return;
    await runParcelAnalysisForEdge(selectedParcel, edgeIndex);
  };

  const handleClearFrontageOverride = async () => {
    if (!selectedParcel || runAnalysis.isPending) return;
    await runParcelAnalysisForEdge(selectedParcel, null);
  };

  const handleAttachParcel = async () => {
    if (providerParcel) {
      const providerBBox = geometryBBoxJson(providerParcel.geometry);
      const providerCentroid = geometryCentroid(providerParcel.geometry);
      const importedPolygon = providerGeometryToLocalPolygon(providerParcel.geometry, providerParcel.areaSqft || providerParcel.areaAcres * 43560);
      const confirmImport = window.confirm(
        `Pull ${providerParcel.headline} into this project and create a parcel record?`,
      );

      if (!confirmImport) return;

      const importedSnapshot = await createParcelSnapshot.mutateAsync({
        projectId,
        name: providerParcel.headline,
        sourceProvider: "regrid",
        sourceParcelId: providerParcel.llUuid,
        apn: providerParcel.apn,
        address: providerParcel.address,
        jurisdiction: [providerParcel.county, providerParcel.state].filter(Boolean).join(", "),
        county: providerParcel.county,
        state: providerParcel.state,
        zoningCode: providerParcel.zoning,
        acreage: providerParcel.areaAcres,
        // Seed with the provider acreage so downstream screens do not show a
        // misleading zero before parcel intelligence has been refreshed.
        buildableAcres: providerParcel.areaAcres,
        frontageFt: 0,
        floodZone: providerParcel.floodZone,
        rawAttributes: {
          importMode: importedPolygon.length >= 3 ? "provider_seeded_geometry" : "provider_metadata_only",
          importedAt: new Date().toISOString(),
          pendingSurveyAlignment: true,
          providerCentroid: toJsonValue(providerParcel.centroid ?? null),
          providerBBox: toJsonValue(providerBBox),
          providerFields: toJsonValue(providerParcel.fields),
          providerGeometry: toJsonValue(providerParcel.geometry),
          providerPath: providerParcel.path,
          titleCommitmentStatus: "pending",
        },
      });

      if (importedPolygon.length >= 3) {
        await runAnalysis.mutateAsync({
          parcelSnapshotId: String(importedSnapshot.id),
          boundary: toPolygonGeometry(importedPolygon),
          constraints: [],
          selectedFrontageEdgeIndex: null,
          analysisVersion: "v1",
        });
      }

      const savedSelection = await saveParcelSelection.mutateAsync({
        projectId,
        parcelSnapshotId: String(importedSnapshot.id),
        parcelProvider: "regrid",
        providerParcelId: providerParcel.llUuid,
        parcelName: providerParcel.headline,
        apn: providerParcel.apn,
        address: providerParcel.address,
        jurisdiction: [providerParcel.county, providerParcel.state].filter(Boolean).join(", "),
        zoningCode: providerParcel.zoning,
        geometry: providerParcel.geometry as unknown as Record<string, unknown>,
        centroid: toJsonValue(providerCentroid) as Record<string, unknown> | null,
        bbox: toJsonValue(providerBBox) as Record<string, unknown> | null,
        providerPath: providerParcel.path,
        providerContext: [providerParcel.county, providerParcel.state].filter(Boolean).join(", "),
        geometrySource: "regrid_detail",
        sourceRecordedAt: new Date().toISOString(),
        sourceLastRefreshedAt: new Date().toISOString(),
        metadata: {
          areaAcres: providerParcel.areaAcres,
          areaSqft: providerParcel.areaSqft,
          importMode: "provider_metadata_only",
          importedParcelSnapshotId: importedSnapshot.id,
          parcelAnchorReady: true,
          path: providerParcel.path,
          sourceLastRefresh: new Date().toISOString(),
        },
        selectionRole: "primary",
        anchorStatus: "active",
        status: "attached",
      });
      setOptimisticParcelSelection(savedSelection);

      setSelectedRegridUuid(null);
      setSelectedParcelId(String(importedSnapshot.id));
      setPendingAnchorFocus({ target: "snapshot", id: String(importedSnapshot.id) });

      window.alert(importedPolygon.length >= 3
        ? "Parcel imported, analyzed, and saved as the active spatial anchor."
        : "Parcel imported and saved as the active spatial anchor, but geometry still needs review before analysis and subdivision.");
      return;
    }

    if (!selectedParcel) return;
    const hasLocalGeometry = selectedParcel.polygon.length >= 3;
    const linkedSavedSelection =
      savedParcelSelections.find((entry) => entry.parcelSnapshotId === selectedParcel.id)
      ?? (activeParcelSelection?.parcelSnapshotId === selectedParcel.id ? activeParcelSelection : null)
      ?? null;
    const geographicBbox =
      linkedSavedSelection?.bbox
      ?? null;
    const geographicCentroid =
      linkedSavedSelection?.centroid
      ?? null;

    const confirmAttach = window.confirm(`Use ${selectedParcel.name} as the active project parcel?`);

    if (!confirmAttach) return;

    const savedSelection = await saveParcelSelection.mutateAsync({
      projectId,
      parcelSnapshotId: selectedParcel.id,
      parcelProvider: selectedParcel.source || "manual_snapshot",
      providerParcelId: selectedParcel.id,
      parcelName: selectedParcel.name,
      apn: selectedParcel.apn,
      address: selectedParcel.address,
      jurisdiction: selectedParcel.jurisdiction,
      zoningCode: selectedParcel.zoning,
      geometry: hasLocalGeometry ? toPolygonGeometry(selectedParcel.polygon) as unknown as Record<string, unknown> : null,
      centroid: geographicCentroid,
      bbox: geographicBbox,
      providerPath: activeParcelSelection?.providerPath ?? null,
      providerContext: activeParcelSelection?.providerContext ?? selectedParcel.jurisdiction,
      geometrySource: hasLocalGeometry ? "project_snapshot" : "metadata_only",
      sourceRecordedAt: activeParcelSelection?.sourceRecordedAt ?? new Date().toISOString(),
      sourceLastRefreshedAt: new Date().toISOString(),
      metadata: {
        buildableAcres: selectedParcel.buildableAcres,
        frontageFeet: selectedParcel.frontageFeet,
        intelligenceReady: Boolean(selectedParcel.intelligence),
        parcelAnchorReady: true,
        sourceLastRefresh: new Date().toISOString(),
      },
      selectionRole: "primary",
      anchorStatus: "active",
      status: "attached",
    });
    setOptimisticParcelSelection(savedSelection);
    setPendingAnchorFocus({ target: "snapshot", id: selectedParcel.id });
  };

  const handleFocusActiveAnchor = async () => {
    if (activeAnchorParcel) {
      setSelectedParcelId(activeAnchorParcel.id);
      setSelectedRegridUuid(null);
      setPendingAnchorFocus({ target: "snapshot", id: activeAnchorParcel.id });
      return;
    }

    if (effectiveParcelSelection?.providerParcelId) {
      setSelectedParcelId("");
      setSelectedRegridUuid(effectiveParcelSelection.providerParcelId);
      setPendingAnchorFocus({ target: "provider", id: effectiveParcelSelection.providerParcelId });
      return;
    }

    if (providerParcel?.llUuid) {
      const providerBBox = geometryBBoxJson(providerParcel.geometry);
      const providerCentroid = geometryCentroid(providerParcel.geometry);
      const savedSelection = await saveParcelSelection.mutateAsync({
        projectId,
        parcelSnapshotId: null,
        parcelProvider: "regrid",
        providerParcelId: providerParcel.llUuid,
        parcelName: providerParcel.headline,
        apn: providerParcel.apn,
        address: providerParcel.address,
        jurisdiction: [providerParcel.county, providerParcel.state].filter(Boolean).join(", "),
        zoningCode: providerParcel.zoning,
        geometry: providerParcel.geometry as unknown as Record<string, unknown>,
        centroid: toJsonValue(providerCentroid) as Record<string, unknown> | null,
        bbox: toJsonValue(providerBBox) as Record<string, unknown> | null,
        providerPath: providerParcel.path,
        providerContext: [providerParcel.county, providerParcel.state].filter(Boolean).join(", "),
        geometrySource: "regrid_detail",
        sourceRecordedAt: new Date().toISOString(),
        sourceLastRefreshedAt: new Date().toISOString(),
        metadata: {
          areaAcres: providerParcel.areaAcres,
          areaSqft: providerParcel.areaSqft,
          anchorMode: "provider_focus",
          parcelAnchorReady: true,
          sourceLastRefresh: new Date().toISOString(),
        },
        selectionRole: "primary",
        anchorStatus: "active",
        status: "selected",
      });
      setOptimisticParcelSelection(savedSelection);
      setSelectedParcelId("");
      setSelectedRegridUuid(providerParcel.llUuid);
      setPendingAnchorFocus({ target: "provider", id: providerParcel.llUuid });
      return;
    }

    if (selectedParcel?.id) {
      const linkedSavedSelection =
        savedParcelSelections.find((entry) => entry.parcelSnapshotId === selectedParcel.id)
        ?? (activeParcelSelection?.parcelSnapshotId === selectedParcel.id ? activeParcelSelection : null)
        ?? null;
      const savedSelection = await saveParcelSelection.mutateAsync({
        projectId,
        parcelSnapshotId: selectedParcel.id,
        parcelProvider: selectedParcel.source || "manual_snapshot",
        providerParcelId: linkedSavedSelection?.providerParcelId || selectedParcel.id,
        parcelName: selectedParcel.name,
        apn: selectedParcel.apn,
        address: selectedParcel.address,
        jurisdiction: selectedParcel.jurisdiction,
        zoningCode: selectedParcel.zoning,
        geometry: linkedSavedSelection?.geometry ?? null,
        centroid: linkedSavedSelection?.centroid ?? null,
        bbox: linkedSavedSelection?.bbox ?? null,
        providerPath: linkedSavedSelection?.providerPath ?? null,
        providerContext: linkedSavedSelection?.providerContext ?? selectedParcel.jurisdiction,
        geometrySource: linkedSavedSelection?.geometrySource ?? "project_snapshot",
        sourceRecordedAt: linkedSavedSelection?.sourceRecordedAt ?? new Date().toISOString(),
        sourceLastRefreshedAt: new Date().toISOString(),
        metadata: {
          ...(linkedSavedSelection?.metadata ?? {}),
          anchorMode: "snapshot_focus",
          buildableAcres: selectedParcel.buildableAcres,
          frontageFeet: selectedParcel.frontageFeet,
          parcelAnchorReady: true,
          sourceLastRefresh: new Date().toISOString(),
        },
        selectionRole: "primary",
        anchorStatus: "active",
        status: linkedSavedSelection?.status ?? "selected",
      });
      setOptimisticParcelSelection(savedSelection);
      setSelectedRegridUuid(null);
      setSelectedParcelId(selectedParcel.id);
      setPendingAnchorFocus({ target: "snapshot", id: selectedParcel.id });
    }
  };

  const handleSelectSavedParcel = (parcelId: string, focus = false) => {
    setSelectedRegridUuid(null);
    setSelectedParcelId(parcelId);
    if (focus) {
      setPendingAnchorFocus({ target: "snapshot", id: parcelId });
    }
  };

  const handleSelectProviderParcel = (parcelUuid: string, focus = false) => {
    setSelectedParcelId("");
    setSelectedRegridUuid(parcelUuid);
    if (focus) {
      setPendingAnchorFocus({ target: "provider", id: parcelUuid });
    }
  };

  useEffect(() => {
    if (!selectedParcel?.polygon.length) return;
    const signature = boundarySignature(selectedParcel.id, selectedParcel.polygon);
    if (lastSurveySyncRef.current === signature) return;
    lastSurveySyncRef.current = signature;
    surveyState.syncSurveyParcelFromBoundary(selectedParcel.id, selectedParcel.polygon);
  }, [selectedParcel?.id, selectedParcel?.polygon, surveyState.syncSurveyParcelFromBoundary]);

  useEffect(() => {
    if (!pendingAnchorFocus) return;

    if (pendingAnchorFocus.target === "snapshot" && selectedParcel?.id === pendingAnchorFocus.id) {
      mapState.triggerFit();
      setPendingAnchorFocus(null);
      return;
    }

    if (pendingAnchorFocus.target === "provider" && providerParcel?.llUuid === pendingAnchorFocus.id) {
      mapState.triggerFit();
      setPendingAnchorFocus(null);
    }
  }, [mapState, pendingAnchorFocus, providerParcel?.llUuid, selectedParcel?.id]);

  useEffect(() => {
    const restoreKey =
      effectiveParcelSelection?.parcelSnapshotId
      ?? effectiveParcelSelection?.providerParcelId
      ?? "";

    if (!restoreKey || restoredAnchorFocusRef.current === restoreKey) return;

    if (effectiveParcelSelection?.parcelSnapshotId && selectedParcel?.id === effectiveParcelSelection.parcelSnapshotId) {
      restoredAnchorFocusRef.current = restoreKey;
      setPendingAnchorFocus({ target: "snapshot", id: effectiveParcelSelection.parcelSnapshotId });
      return;
    }

    if (effectiveParcelSelection?.providerParcelId) {
      if (providerParcel?.llUuid === effectiveParcelSelection.providerParcelId) {
        restoredAnchorFocusRef.current = restoreKey;
        setPendingAnchorFocus({ target: "provider", id: effectiveParcelSelection.providerParcelId });
        return;
      }

      if (!selectedRegridUuid) {
        setSelectedRegridUuid(effectiveParcelSelection.providerParcelId);
      }
    }
  }, [
    effectiveParcelSelection?.parcelSnapshotId,
    effectiveParcelSelection?.providerParcelId,
    providerParcel?.llUuid,
    selectedParcel?.id,
    selectedRegridUuid,
  ]);

  const parcelReviewSummary = useMemo(() => {
    const lines = [
      `Project: ${project?.name ?? "Property workspace"}`,
      `Parcel anchor: ${activeAnchorName}`,
      `Selected parcel: ${selectedParcel?.name ?? providerParcel?.headline ?? "None"}`,
      `Active title commitment: ${activeTitleCommitment?.title ?? "Not uploaded"}`,
      `Title missing documents: ${activeTitleMissingCount}`,
      `Title review needed: ${activeTitleReviewCount}`,
      `Gross area: ${selectedParcel ? `${selectedParcel.areaAcres.toFixed(2)} ac` : "Unknown"}`,
      `Buildable area: ${intelligence ? `${intelligence.buildableAreaAcres.toFixed(2)} ac` : selectedParcel ? `${selectedParcel.buildableAcres.toFixed(2)} ac` : "Unknown"}`,
      `Recommended strategy: ${intelligence ? strategyLabel[intelligence.bestSubdivisionStrategy] : "Not analyzed"}`,
      `Constraint coverage: ${intelligence ? `${intelligence.constraintCoveragePercent}%` : "Not analyzed"}`,
      `Survey compare status: ${surveyCompare ? (surveyCompare.withinTolerance ? "Within tolerance" : "Needs review") : "No survey compare available"}`,
      `Survey compare delta: ${surveyCompare ? `${surveyCompare.areaDelta.toFixed(2)} ac (${surveyCompare.areaDeltaPercent.toFixed(1)}%)` : "N/A"}`,
      `Terrain suitability: ${terrainSummary.data?.suitability ?? "Pending terrain summary"}`,
    ];
    return lines.join("\n");
  }, [
    activeAnchorName,
    activeTitleCommitment?.title,
    activeTitleMissingCount,
    activeTitleReviewCount,
    intelligence,
    project?.name,
    providerParcel?.headline,
    selectedParcel,
    surveyCompare,
    terrainSummary.data?.suitability,
  ]);

  const downloadParcelReviewSummary = () => {
    const blob = new Blob([parcelReviewSummary], { type: "text/plain" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${(project?.name ?? "parcel-review").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-parcel-review.txt`;
    link.click();
    URL.revokeObjectURL(href);
  };

  if (isLoading || isWorkspaceLoading) {
    return <LoadingState message="Loading parcel intelligence..." />;
  }

  if (workspaceError || !workspace) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          Unable to load project workspace. {workspaceError?.message}
        </div>
      </div>
    );
  }

  if (error || !development) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          Unable to load parcel data. {error?.message}
        </div>
      </div>
    );
  }

  return (
    <ProjectWorkspaceShell
      currentStep="parcel"
      description={
        <p>
            The property workspace now runs from a parcel intelligence record, not just raw geometry. Review the
            buildability signals, recommended layout strategy, and next actions before you move into yield or design.
        </p>
      }
      eyebrow="Property workspace"
      headerActions={
        <>
          <Button
            disabled={(!selectedParcel && !providerParcel) || saveParcelSelection.isPending || createParcelSnapshot.isPending || selectedParcelIsAttached || selectedProviderParcelIsAttached}
            onClick={() => void handleAttachParcel()}
            variant="ghost"
          >
            {saveParcelSelection.isPending || createParcelSnapshot.isPending
              ? "Attaching..."
              : selectedProviderParcelIsAttached || selectedParcelIsAttached
                ? "Attached to project"
                : providerParcel
                  ? "Select and import parcel"
                  : "Select active parcel"}
          </Button>
          <Button disabled={runAnalysis.isPending || !selectedParcel} onClick={() => void handleRunAnalysis()} variant="secondary">
            {runAnalysis.isPending ? "Analyzing..." : intelligence ? "Re-run analysis" : "Run analysis"}
          </Button>
          <Link to={`/app/projects/${projectId}/title`}><Button variant="secondary">Open title intake</Button></Link>
          <Link to={`/app/projects/${projectId}/workflow`}><Button variant="ghost">Open workflow</Button></Link>
          <Link to={`/app/projects/${projectId}/yield`}><Button variant="secondary">Run yield analysis</Button></Link>
          <Link to={`/app/projects/${projectId}/subdivision`}><Button>Generate subdivision</Button></Link>
          <Link to={`/app/projects/${projectId}/site-planner`}><Button variant="ghost">Open site planner</Button></Link>
        </>
      }
      layoutReady={Boolean(workflow.layoutId)}
      parcelReady={Boolean(intelligence)}
      projectId={projectId}
      scenarioReady={Boolean(workflow.scenarioId)}
      title={project?.name ?? "Property workspace"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/subdivision`}><Button variant="secondary">Go to layout generation</Button></Link>
              <Link to={`/app/projects/${projectId}/yield`}><Button variant="ghost">Go to yield</Button></Link>
              <Button onClick={downloadParcelReviewSummary} variant="ghost">Download review summary</Button>
              <Button onClick={() => void navigator.clipboard?.writeText(parcelReviewSummary)} variant="ghost">Copy review summary</Button>
            </>
          }
          blockers={parcelBlockers}
          checks={parcelChecks}
          summary="Property analysis is the trusted first step. Confirm the frontage, review warnings, and make sure the parcel recommendation looks believable before moving into design."
          title="Parcel readiness"
          tone={parcelTone}
          warnings={parcelWarnings}
        />
      }
    >

      <DebugLayerPanel />

      <section className={`${styles.shell} ${sidebarCollapsed ? styles.shellSidebarCollapsed : ""} ${inspectorCollapsed ? styles.shellInspectorCollapsed : ""}`}>
        <aside className={styles.leftRail}>
          <div className={styles.railGroup}>
            <button
              className={`${styles.railButton} ${leftPanel === "parcels" ? styles.railButtonActive : ""}`}
              onClick={() => setLeftPanel("parcels")}
              type="button"
            >
              P
            </button>
            <button
              className={`${styles.railButton} ${leftPanel === "scenarios" ? styles.railButtonActive : ""}`}
              onClick={() => setLeftPanel("scenarios")}
              type="button"
            >
              Y
            </button>
            <button
              className={`${styles.railButton} ${leftPanel === "tools" ? styles.railButtonActive : ""}`}
              onClick={() => setLeftPanel("tools")}
              type="button"
            >
              T
            </button>
            <button
              className={styles.railButton}
              onClick={() => setSidebarCollapsed((current) => !current)}
              type="button"
            >
              {sidebarCollapsed ? ">" : "<"}
            </button>
          </div>
          <div className={styles.railMeta}>Map-first</div>
        </aside>

        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
          {sidebarCollapsed ? (
            <div className={styles.collapsedSidebarCard}>
              <strong>{leftPanel === "parcels" ? "Property stack" : leftPanel === "scenarios" ? "Scenarios" : "Tools"}</strong>
              <span className={styles.muted}>
                {leftPanel === "parcels"
                  ? "Expand to search parcels and review saved snapshots."
                  : leftPanel === "scenarios"
                    ? "Expand to pick saved scenarios."
                    : "Expand to access working utility cards."}
              </span>
              <Button onClick={() => setSidebarCollapsed(false)} variant="secondary">Expand panel</Button>
              {leftPanel === "parcels" ? (
                <div className={styles.quickTileStack}>
                  {(providerParcel || selectedParcel) ? (
                    <div className={`${styles.quickTileCard} ${styles.quickTileSelection}`}>
                      <strong>{providerParcel ? "Selected live parcel" : "Selected project parcel"}</strong>
                      <span>{providerParcel?.headline ?? selectedParcel?.name ?? "No parcel selected"}</span>
                      <span>
                        {providerParcel
                          ? providerParcel.address || [providerParcel.county, providerParcel.state].filter(Boolean).join(", ") || "Address unavailable"
                          : selectedParcel?.address || selectedParcel?.jurisdiction || "Saved project parcel"}
                      </span>
                      <span>
                        {providerParcel
                          ? `APN ${providerParcel.apn || "N/A"} | ${providerParcel.areaAcres ? `${providerParcel.areaAcres.toFixed(2)} ac` : `${providerParcel.areaSqft.toLocaleString()} sf`}`
                          : `${selectedParcel?.areaAcres.toFixed(2) ?? "0.00"} ac | ${selectedParcel?.frontageFeet ?? 0} ft frontage`}
                      </span>
                      <div className={styles.floatingActions}>
                        <Button
                          disabled={providerParcel ? saveParcelSelection.isPending || createParcelSnapshot.isPending || selectedProviderParcelIsAttached : saveParcelSelection.isPending || selectedParcelIsAttached}
                          onClick={() => void handleAttachParcel()}
                          variant="secondary"
                        >
                          {providerParcel
                            ? saveParcelSelection.isPending || createParcelSnapshot.isPending
                              ? "Saving parcel..."
                              : selectedProviderParcelIsAttached
                                ? "Attached to project"
                                : "Select and import parcel"
                            : saveParcelSelection.isPending
                              ? "Saving parcel..."
                              : selectedParcelIsAttached
                                ? "Attached to project"
                                : "Select active parcel"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className={`${styles.quickTileCard} ${styles.quickTileContour}`}>
                    <strong>Contour lines</strong>
                    <span>{terrainSummary.data ? `Relief ${terrainSummary.data.terrainReliefFt.toFixed(1)} ft` : "Terrain summary pending"}</span>
                    <span>Minor interval 2 ft</span>
                    <span>Major interval 10 ft</span>
                    <div className={styles.floatingActions}>
                      <Button variant="secondary">Generate</Button>
                    </div>
                  </div>
                  <div className={`${styles.quickTileCard} ${styles.quickTileSitePlan}`}>
                    <strong>Site plan generator</strong>
                    <span>{selectedScenario ? `${selectedScenario.units} homes in active scenario` : "No active scenario"}</span>
                    <span>{intelligence ? strategyLabel[intelligence.bestSubdivisionStrategy] : "Run analysis first"}</span>
                    <div className={styles.floatingActions}>
                      <Link to={`/app/projects/${projectId}/site-planner`}><Button>Open sheet</Button></Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {!sidebarCollapsed && leftPanel === "parcels" ? (
            <>
              <div className={styles.panelHeader}>
                <strong>Property stack</strong>
                <span className={styles.helper}>
                  {hasRegridProxyEnv ? "Search Regrid, inspect the live parcel, then save it into the project." : `${development.parcels.length} stored parcel snapshots`}
                </span>
                <span className={styles.smallMeta}>Collapse the property stack to reveal the quick parcel, contour, and site-plan tiles.</span>
                {hasRegridProxyEnv ? (
                  <input
                    className={styles.search}
                    onChange={(event) => setParcelSearch(event.target.value)}
                    placeholder="Search address or APN"
                    value={parcelSearch}
                  />
                ) : null}
              </div>
              <div className={styles.parcelList}>
                <div className={styles.drawerCard}>
                  <strong>Active parcel anchor</strong>
                  <span className={styles.muted}>{focusTargetName}</span>
                  <span className={styles.smallMeta}>
                    {parcelSelection
                      ? `${parcelSelection.parcelProvider} | ${parcelSelection.anchorStatus} | ${parcelSelection.selectionRole}`
                      : providerParcel
                        ? "Working focus is using the current provider parcel selection."
                        : selectedParcel
                          ? "Working focus is using the current saved parcel selection."
                          : "Select a parcel to anchor title, survey, and design work."}
                  </span>
                  <div className={styles.floatingActions}>
                    <Button
                      disabled={!canFocusSelection}
                      onClick={() => void handleFocusActiveAnchor()}
                      variant="secondary"
                    >
                      Focus anchor
                    </Button>
                  </div>
                </div>
                {hasRegridProxyEnv && parcelSearch.trim().length >= 3 ? (
                  <>
                    <div className={styles.sectionLabel}>Provider results</div>
                    {regridSearch.isLoading ? <div className={styles.drawerCard}>Searching Regrid parcels...</div> : null}
                    {regridSearch.data?.map((result) => (
                      <button
                        className={`${styles.parcelButton} ${result.llUuid === providerParcel?.llUuid ? styles.parcelButtonActive : ""}`}
                        key={result.llUuid}
                        onClick={() => handleSelectProviderParcel(result.llUuid, true)}
                        type="button"
                      >
                        <strong>{result.address || result.llUuid}</strong>
                        <span className={styles.muted}>{result.context || "Provider parcel result"}</span>
                        <span className={styles.smallMeta}>Match {result.score} | {result.path}</span>
                      </button>
                    ))}
                    {!regridSearch.isLoading && !regridSearch.data?.length ? (
                      <div className={styles.drawerCard}>No provider parcels matched that search yet.</div>
                    ) : null}
                    <div className={styles.sectionLabel}>Project parcel snapshots</div>
                  </>
                ) : null}
                {development.parcels.map((parcel) => (
                  <button
                    className={`${styles.parcelButton} ${parcel.id === selectedParcel?.id ? styles.parcelButtonActive : ""} ${parcel.id === hoveredParcelId ? styles.parcelButtonHover : ""}`}
                    key={parcel.id}
                    onMouseEnter={() => setHoveredParcelId(parcel.id)}
                    onMouseLeave={() => setHoveredParcelId((current) => current === parcel.id ? null : current)}
                    onClick={() => handleSelectSavedParcel(parcel.id, true)}
                    type="button"
                  >
                    <strong>{parcel.name}</strong>
                    <span className={styles.muted}>{parcel.areaAcres.toFixed(2)} ac | {parcel.zoning}</span>
                    <span className={styles.smallMeta}>
                      {parcel.id === activeAnchorSnapshotId ? "Active anchor | " : ""}
                      {parcel.intelligence?.shapeClassification ?? "unknown shape"} | {parcel.frontageFeet} ft frontage
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {!sidebarCollapsed && leftPanel === "scenarios" ? (
            <>
              <div className={styles.panelHeader}>
                <strong>Linked scenarios</strong>
                <span className={styles.helper}>Saved yield concepts now sit behind the selected parcel intelligence record.</span>
              </div>
              <div className={styles.scenarioList}>
                {parcelScenarios.map((scenario) => (
                  <button
                    className={`${styles.parcelButton} ${scenario.id === selectedScenario?.id ? styles.parcelButtonActive : ""}`}
                    key={scenario.id}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    type="button"
                  >
                    <strong>{scenario.title}</strong>
                    <span className={styles.muted}>{scenario.product} | {scenario.units} homes</span>
                    <span className={styles.smallMeta}>{scenario.openSpacePercent}% open space | {scenario.status}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {!sidebarCollapsed && leftPanel === "tools" ? (
            <>
              <div className={styles.panelHeader}>
                <strong>Utility cards</strong>
                <span className={styles.helper}>Quick access to working-map actions while the inspector stays clean.</span>
              </div>
              <div className={styles.toolDrawer}>
                <div className={styles.drawerCard}>
                  <strong>Hover preview</strong>
                  <span className={styles.muted}>{previewParcel ? previewParcel.name : "Hover a parcel on the map"}</span>
                  <span className={styles.smallMeta}>
                    {previewParcel ? `${previewParcel.areaAcres.toFixed(2)} ac | ${previewParcel.frontageFeet} ft frontage` : "Map hover updates this preview"}
                  </span>
                </div>
                <div className={styles.drawerCard}>
                  <strong>Contour card</strong>
                  <span className={styles.muted}>Minor 2 ft | Major 10 ft</span>
                  <span className={styles.smallMeta}>
                    {terrainSummary.data ? `${terrainSummary.data.minElevationFt.toFixed(0)}-${terrainSummary.data.maxElevationFt.toFixed(0)} ft` : "Enable terrain to prep contours"}
                  </span>
                </div>
                <div className={styles.drawerCard}>
                  <strong>Site plan card</strong>
                  <span className={styles.muted}>{selectedScenario ? `${selectedScenario.units} homes in active concept` : "No linked scenario selected"}</span>
                  <span className={styles.smallMeta}>Use the floating site-plan card to jump into generation.</span>
                </div>
                <div className={styles.drawerCard}>
                  <strong>Status</strong>
                  <span className={styles.muted}>
                    {selectedProviderParcelIsAttached || selectedParcelIsAttached
                      ? "Parcel attached to project"
                      : providerParcel
                        ? "Provider parcel selected"
                        : "Parcel still in review"}
                  </span>
                  <span className={styles.smallMeta}>
                    {providerParcel
                      ? `Regrid live parcel ${providerParcel.llUuid}`
                      : intelligence
                        ? "Intelligence record ready"
                        : "Analysis still needed"}
                  </span>
                </div>
                <div className={styles.drawerCard}>
                  <strong>Saved parcels</strong>
                  <span className={styles.muted}>{savedParcelSelections.length} project selections</span>
                  <span className={styles.smallMeta}>
                    {savedParcelSelections.length
                      ? savedParcelSelections.slice(0, 3).map((entry) => entry.parcelName || entry.providerParcelId).join(" | ")
                      : "No saved parcel selections yet"}
                  </span>
                </div>
                <div className={styles.drawerCard}>
                  <strong>Anchor state</strong>
                  <span className={styles.muted}>{activeAnchorCount} active spatial anchor{activeAnchorCount === 1 ? "" : "s"}</span>
                  <span className={styles.smallMeta}>
                    {parcelSelection
                      ? `${parcelSelection.parcelName || parcelSelection.providerParcelId} is driving the current title and design flow.`
                      : "No active anchor has been selected yet."}
                  </span>
                </div>
                <div className={styles.drawerCard}>
                  <strong>Recent parcels</strong>
                  <span className={styles.muted}>{recentParcels.length} recently reviewed</span>
                  <span className={styles.smallMeta}>
                    {recentParcels.length
                      ? recentParcels.slice(0, 3).map((entry) => entry.name).join(" | ")
                      : "Start clicking parcels to build a recent trail"}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </aside>

        <div className={styles.canvas}>
          <MapControls
            basemap={mapState.basemap}
            activeModeKey={labelMode}
            hillshadeActive={mapState.hillshadeEnabled}
            onBasemapChange={mapState.setBasemap}
            onFit={mapState.triggerFit}
            onModeChange={(key) => setLabelMode(key as ParcelLabelMode)}
            onToggleHillshade={mapState.toggleHillshade}
            onToggleTerrain={mapState.toggleTerrain}
            terrainActive={mapState.terrainEnabled}
            title="Parcel intelligence view"
            modeLabel="Labels"
            modeOptions={[
              { key: "minimal", label: "Minimal" },
              { key: "review", label: "Review" },
              { key: "sheet", label: "Sheet" },
            ]}
            toggles={[
              {
                key: "parcels",
                label: "parcels",
                active: mapState.visibility.parcels,
                onToggle: () => mapState.toggleLayer("parcels"),
              },
              {
                key: "constraints",
                label: "constraints",
                active: mapState.visibility.constraints,
                onToggle: () => mapState.toggleLayer("constraints"),
              },
              {
                key: "buildable",
                label: "buildable",
                active: mapState.visibility.buildable,
                onToggle: () => mapState.toggleLayer("buildable"),
              },
              {
                key: "labels",
                label: "labels",
                active: mapState.visibility.labels,
                onToggle: () => mapState.toggleLayer("labels"),
              },
              {
                key: "frontage",
                label: "frontage",
                active: mapState.visibility.frontage,
                onToggle: () => mapState.toggleLayer("frontage"),
              },
              {
                key: "survey",
                label: "survey",
                active: mapState.visibility.survey,
                onToggle: () => mapState.toggleLayer("survey"),
              },
            ]}
          />
          <BaseMapCanvas
            basemap={mapState.basemap}
            bounds={parcelMap.bounds}
            center={parcelMap.center}
            fitNonce={mapState.fitNonce}
            layers={parcelMap.layers}
            onFeatureSelect={(layerId, feature) => {
              if (layerId === "parcel-fill-layer") {
                const parcelId = feature.properties?.id;
                if (typeof parcelId === "string") {
                  handleSelectSavedParcel(parcelId);
                }
              }

              if (layerId === "regrid-parcel-fill-layer") {
                const parcelUuid = readFeatureParcelId(feature);
                if (parcelUuid) {
                  handleSelectProviderParcel(parcelUuid);
                }
              }

              if (layerId === "parcel-frontage-layer") {
                const rawEdgeIndex = feature.properties?.edgeIndex;
                const edgeIndex =
                  typeof rawEdgeIndex === "number"
                    ? rawEdgeIndex
                    : typeof rawEdgeIndex === "string"
                      ? Number(rawEdgeIndex)
                      : NaN;
                if (Number.isFinite(edgeIndex)) {
                  void handleSelectFrontageEdge(edgeIndex);
                }
              }
            }}
            onFeatureHover={(layerId, feature) => {
              if (layerId === "parcel-fill-layer") {
                const parcelId = feature?.properties?.id;
                setHoveredParcelId(typeof parcelId === "string" ? parcelId : null);
              }
              if (layerId === "regrid-parcel-fill-layer") {
                setHoveredRegridUuid(readFeatureParcelId(feature));
              }
            }}
            onMapClick={(coordinate) => {
              if (!mapState.terrainEnabled) return;
              setTerrainProbe(coordinate);
            }}
            zoom={parcelMap.zoom}
          />

          {(!debugEnabled || debugLayers.parcelMetrics) ? <div className={styles.metricsBar}>
            <div className={styles.metricChip}><strong>{providerParcel ? providerParcel.areaAcres.toFixed(2) : intelligence?.buildableAreaAcres.toFixed(2) ?? selectedParcel?.buildableAcres.toFixed(2) ?? "0.00"} ac</strong><span className={styles.muted}>{providerParcel ? "Provider area" : "Buildable area"}</span></div>
            <div className={styles.metricChip}><strong>{providerParcel ? providerParcel.zoning || "Unknown" : intelligence?.frontageFt ?? selectedParcel?.frontageFeet ?? 0}{providerParcel ? "" : " ft"}</strong><span className={styles.muted}>{providerParcel ? "Zoning" : "Frontage"}</span></div>
            <div className={styles.metricChip}><strong>{intelligence?.buildabilityScore ?? 0}</strong><span className={styles.muted}>Buildability score</span></div>
            <div className={styles.metricChip}><strong>{strategyLabel[intelligence?.bestSubdivisionStrategy ?? "manual_review"]}</strong><span className={styles.muted}>Recommended layout</span></div>
            <div className={styles.metricChip}><strong>{maxYield}</strong><span className={styles.muted}>Best saved unit yield</span></div>
            <div className={styles.metricChip}><strong>{totalBuildable.toFixed(2)} ac</strong><span className={styles.muted}>Portfolio buildable area</span></div>
            <div className={styles.metricChip}><strong>{terrainSummary.data ? `${terrainSummary.data.slopePercentAverage.toFixed(1)}%` : mapState.terrainEnabled ? "Sampling..." : "Terrain off"}</strong><span className={styles.muted}>Avg slope</span></div>
          </div> : null}
        </div>

        <aside className={`${styles.inspector} ${inspectorCollapsed ? styles.inspectorCollapsed : ""}`}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <strong>{inspectorCollapsed ? "Inspector" : "Property intelligence"}</strong>
              <button
                className={styles.collapseButton}
                onClick={() => setInspectorCollapsed((current) => !current)}
                type="button"
              >
                {inspectorCollapsed ? "Open" : "Close"}
              </button>
            </div>
            {!inspectorCollapsed ? (
              <span className={styles.helper}>The selected parcel now recommends what to do next instead of waiting for the user to guess.</span>
            ) : null}
          </div>
          {!inspectorCollapsed && (selectedParcel || providerParcel) ? (
            <>
              {activeParcelSelection ? (
                <div className={styles.detailCard}>
                  <strong>Active parcel anchor</strong>
                  <span className={styles.badge}>Spatial source of truth</span>
                  <div className={styles.kv}><span>Parcel</span><span>{activeParcelSelection.parcelName || activeParcelSelection.providerParcelId}</span></div>
                  <div className={styles.kv}><span>Anchor status</span><span>{activeParcelSelection.anchorStatus}</span></div>
                  <div className={styles.kv}><span>Provider</span><span>{activeParcelSelection.parcelProvider}</span></div>
                  <div className={styles.kv}><span>Geometry source</span><span>{activeParcelSelection.geometrySource.replaceAll("_", " ")}</span></div>
                  <div className={styles.kv}><span>Provider path</span><span>{activeParcelSelection.providerPath || "N/A"}</span></div>
                  <div className={styles.kv}><span>Recorded</span><span>{formatInspectorDate(activeParcelSelection.sourceRecordedAt)}</span></div>
                  <div className={styles.kv}><span>Refreshed</span><span>{formatInspectorDate(activeParcelSelection.sourceLastRefreshedAt)}</span></div>
                  <div className={styles.kv}><span>Title status</span><span>{String(activeParcelSelection.metadata?.titleCommitmentStatus ?? "pending")}</span></div>
                  <div className={styles.kv}><span>Survey alignment</span><span>{Boolean(activeParcelSelection.metadata?.pendingSurveyAlignment) ? "Pending" : "Ready"}</span></div>
                </div>
              ) : null}
              {providerParcel ? (
                <div className={styles.detailCard}>
                  <strong>{providerParcel.headline}</strong>
                  <span className={styles.badge}>Regrid live parcel</span>
                  <div className={styles.kv}><span>Provider ID</span><span>{providerParcel.llUuid}</span></div>
                  <div className={styles.kv}><span>Address</span><span>{providerParcel.address || "N/A"}</span></div>
                  <div className={styles.kv}><span>County / State</span><span>{[providerParcel.county, providerParcel.state].filter(Boolean).join(", ") || "N/A"}</span></div>
                  <div className={styles.kv}><span>APN</span><span>{providerParcel.apn || "N/A"}</span></div>
                  <div className={styles.kv}><span>Zoning</span><span>{providerParcel.zoning || "Unknown"}</span></div>
                  <div className={styles.kv}><span>Flood zone</span><span>{providerParcel.floodZone || "Unknown"}</span></div>
                  <div className={styles.kv}><span>Area</span><span>{providerParcel.areaAcres ? `${providerParcel.areaAcres.toFixed(2)} ac` : `${providerParcel.areaSqft.toLocaleString()} sf`}</span></div>
                  <div className={styles.kv}><span>Path</span><span>{providerParcel.path || "N/A"}</span></div>
                  <div className={styles.kv}><span>Project status</span><span>{selectedProviderParcelIsAttached ? "Attached" : "Not attached"}</span></div>
                  <div className={styles.detailActions}>
                    <Button
                      disabled={saveParcelSelection.isPending || createParcelSnapshot.isPending || selectedProviderParcelIsAttached}
                      onClick={() => void handleAttachParcel()}
                      variant="secondary"
                    >
                      {saveParcelSelection.isPending || createParcelSnapshot.isPending ? "Saving parcel..." : selectedProviderParcelIsAttached ? "Attached to project" : "Select and import parcel"}
                    </Button>
                  </div>
                </div>
              ) : null}
              {selectedParcel ? (
              <div className={styles.detailCard}>
                <strong>{selectedParcel.name}</strong>
                <span className={styles.badge}>{selectedParcel.zoning}</span>
                <div className={styles.kv}><span>APN</span><span>{selectedParcel.apn || "N/A"}</span></div>
                <div className={styles.kv}><span>Address</span><span>{selectedParcel.address || "N/A"}</span></div>
                <div className={styles.kv}><span>Jurisdiction</span><span>{selectedParcel.jurisdiction || "N/A"}</span></div>
                <div className={styles.kv}><span>Source</span><span>{selectedParcel.source}</span></div>
                <div className={styles.kv}><span>Gross area</span><span>{selectedParcel.areaAcres.toFixed(2)} ac</span></div>
                <div className={styles.kv}><span>Buildable area</span><span>{selectedParcel.buildableAcres.toFixed(2)} ac</span></div>
                <div className={styles.kv}><span>Flood zone</span><span>{selectedParcel.floodZone || "Unknown"}</span></div>
                <div className={styles.kv}><span>Project status</span><span>{selectedParcelIsAttached ? "Attached" : "Not attached"}</span></div>
                <div className={styles.kv}><span>Provider ID</span><span>{activeParcelSelection?.providerParcelId ?? selectedParcel.id}</span></div>
                <div className={styles.kv}><span>Provider</span><span>{activeParcelSelection?.parcelProvider ?? selectedParcel.source}</span></div>
                <div className={styles.kv}><span>Last refresh</span><span>{formatInspectorDate(activeParcelSelection?.metadata?.sourceLastRefresh as string | undefined)}</span></div>
                <div className={styles.kv}><span>Selection saved</span><span>{formatInspectorDate(activeParcelSelection?.updatedAt)}</span></div>
                <div className={styles.kv}>
                  <span>Frontage override</span>
                  <span>
                    {selectedParcel.frontageEdges.find((edge) => edge.isSelected)
                      ? `Edge ${selectedParcel.frontageEdges.find((edge) => edge.isSelected)?.edgeIndex}`
                      : "Auto / unresolved"}
                  </span>
                </div>
                <div className={styles.kv}><span>Map action</span><span>Click a frontage edge to set it</span></div>
                <div className={styles.detailActions}>
                  <Button
                    disabled={saveParcelSelection.isPending || selectedParcelIsAttached}
                    onClick={() => void handleAttachParcel()}
                    variant="secondary"
                  >
                    {saveParcelSelection.isPending ? "Saving parcel..." : selectedParcelIsAttached ? "Attached to project" : "Select active parcel"}
                  </Button>
                  <Button
                    disabled={runAnalysis.isPending || !selectedParcel.frontageEdges.some((edge) => edge.isSelected)}
                    onClick={() => void handleClearFrontageOverride()}
                    variant="ghost"
                  >
                    {runAnalysis.isPending ? "Updating frontage..." : "Clear frontage override"}
                  </Button>
                </div>
              </div>
              ) : null}
              {intelligence ? (
                <>
                  <div className={styles.detailCard}>
                    <strong>Analysis</strong>
                    <div className={styles.kv}><span>Status</span><span>Preliminary analysis</span></div>
                    <div className={styles.kv}><span>Buildable area</span><span>{intelligence.buildableAreaAcres.toFixed(2)} ac</span></div>
                    <div className={styles.kv}><span>Shape</span><span>{intelligence.shapeClassification.replaceAll("_", " ")}</span></div>
                    <div className={styles.kv}><span>Best strategy</span><span>{strategyLabel[intelligence.bestSubdivisionStrategy]}</span></div>
                    <div className={styles.kv}><span>Access</span><span>{intelligence.accessClassification.replaceAll("_", " ")}</span></div>
                    <div className={styles.kv}><span>Average depth</span><span>{intelligence.avgDepthFt.toFixed(1)} ft</span></div>
                    <div className={styles.kv}><span>Constraint coverage</span><span>{intelligence.constraintCoveragePercent}%</span></div>
                    <div className={styles.kv}><span>Risk score</span><span>{intelligence.riskScore.toFixed(1)}</span></div>
                    <div className={styles.kv}><span>Display CRS</span><span>{workspace.spatialReference.horizontalName}</span></div>
                    <div className={styles.kv}><span>Transform method</span><span>{workspace.spatialReference.transformMethod.replaceAll("_", " ")}</span></div>
                    <div className={styles.kv}><span>Transform verified</span><span>{formatInspectorDate(workspace.spatialReference.transformLastVerifiedAt)}</span></div>
                  </div>
                  <div className={styles.detailCard}>
                    <strong>Recommended next actions</strong>
                    {(Array.isArray(intelligence.recommendations.recommendedNextActions) ? intelligence.recommendations.recommendedNextActions : []).map((step) => (
                      <div className={styles.constraintRow} key={String(step)}>
                        <span>{String(step)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.detailCard}>
                    <strong>Warnings</strong>
                    {intelligence.warnings.length ? intelligence.warnings.map((warning) => (
                      <div className={styles.constraintRow} key={`${warning.code}-${warning.message}`}>
                        <span>{warning.message}</span>
                        <strong>{warning.severity}</strong>
                      </div>
                    )) : <div className={styles.muted}>No parcel warnings for this analysis pass.</div>}
                  </div>
                </>
              ) : null}
              <div className={styles.detailCard}>
                <strong>Survey compare</strong>
                {surveyCompare ? (
                  <>
                    <div className={styles.kv}><span>Source</span><span>{surveyCompare.source.replaceAll("_", " ")}</span></div>
                    <div className={styles.kv}><span>Area delta</span><span>{surveyCompare.areaDelta.toFixed(2)} ac</span></div>
                    <div className={styles.kv}><span>Delta percent</span><span>{surveyCompare.areaDeltaPercent.toFixed(1)}%</span></div>
                    <div className={styles.kv}><span>Closure error</span><span>{surveyCompare.closureError.toFixed(3)} ft</span></div>
                    <div className={styles.kv}><span>Precision</span><span>{surveyCompare.precisionRatio ? `1:${Math.round(surveyCompare.precisionRatio).toLocaleString()}` : "Perfect closure"}</span></div>
                    <div className={styles.kv}><span>Status</span><span>{surveyCompare.withinTolerance ? "Within tolerance" : "Needs review"}</span></div>
                    <div className={styles.kv}><span>Boundary points</span><span>{surveyCompare.boundaryPointCount}</span></div>
                  </>
                ) : (
                  <div className={styles.muted}>No promoted or synced survey parcel is available for compare yet.</div>
                )}
              </div>
              <div className={styles.detailCard}>
                <strong>Review queue</strong>
                <div className={styles.kv}><span>Priority</span><span>{reviewPriorityTone}</span></div>
                <div className={styles.kv}><span>Parcel warnings</span><span>{intelligence?.warnings.length ?? 0}</span></div>
                <div className={styles.kv}><span>Survey issues</span><span>{surveyState.issues.length}</span></div>
                <div className={styles.kv}><span>Title issues</span><span>{activeTitleMissingCount + activeTitleReviewCount}</span></div>
                {parcelReviewItems.length ? parcelReviewItems.slice(0, 8).map((item) => (
                  <div className={styles.constraintRow} key={item.id}>
                    <span>{item.label}</span>
                    <strong>{item.source}</strong>
                  </div>
                )) : <div className={styles.muted}>No open parcel, survey, or title review items right now.</div>}
              </div>
              <div className={styles.detailCard}>
                <strong>Title review context</strong>
                <div className={styles.kv}><span>Active commitment</span><span>{activeTitleCommitment?.title || "Not uploaded"}</span></div>
                <div className={styles.kv}><span>Linked references</span><span>{activeTitleReferences.length}</span></div>
                <div className={styles.kv}><span>Missing docs</span><span>{activeTitleMissingCount}</span></div>
                <div className={styles.kv}><span>Needs review</span><span>{activeTitleReviewCount}</span></div>
                <div className={styles.kv}><span>Parcel anchor</span><span>{parcelSelection ? "Connected" : "Not anchored"}</span></div>
              </div>
              {selectedParcel ? (
                <div className={styles.detailCard}>
                  <strong>Constraints</strong>
                  {selectedParcel.constraints.length ? selectedParcel.constraints.map((constraint) => (
                    <div className={styles.constraintRow} key={constraint.id}>
                      <span>{constraint.label}</span>
                      <strong>{constraint.type}</strong>
                    </div>
                  )) : <div className={styles.muted}>No constraints saved yet.</div>}
                </div>
              ) : null}
              <div className={styles.detailCard}>
                <strong>Selection context</strong>
                <div className={styles.kv}><span>Hovered parcel</span><span>{hoveredParcel?.name ?? "None"}</span></div>
                <div className={styles.kv}><span>Recent trail</span><span>{recentParcels.length ? recentParcels.length : 0}</span></div>
                <div className={styles.kv}><span>Saved entries</span><span>{savedParcelSelections.length}</span></div>
              </div>
              <div className={styles.detailCard}>
                <strong>Terrain</strong>
                <div className={styles.kv}><span>Status</span><span>{mapState.terrainEnabled ? "Terrain summary enabled" : "Terrain summary off"}</span></div>
                <div className={styles.kv}><span>Source</span><span>{terrainMetadata.data?.sourceName ?? "Loading terrain source"}</span></div>
                <div className={styles.kv}><span>Coverage</span><span>{terrainMetadata.data?.coverage ?? "Preparing terrain metrics"}</span></div>
                <div className={styles.kv}><span>Mean elevation</span><span>{terrainSummary.data ? `${terrainSummary.data.meanElevationFt.toFixed(1)} ft` : "Enable terrain"}</span></div>
                <div className={styles.kv}><span>Relief</span><span>{terrainSummary.data ? `${terrainSummary.data.terrainReliefFt.toFixed(1)} ft` : "Pending terrain summary"}</span></div>
                <div className={styles.kv}><span>Average slope</span><span>{terrainSummary.data ? `${terrainSummary.data.slopePercentAverage.toFixed(1)}%` : "Pending terrain summary"}</span></div>
                <div className={styles.kv}><span>Max slope</span><span>{terrainSummary.data ? `${terrainSummary.data.slopePercentMax.toFixed(1)}%` : "Pending terrain summary"}</span></div>
                <div className={styles.kv}><span>Suitability</span><span>{terrainSummary.data ? terrainSummary.data.suitability : "Pending terrain summary"}</span></div>
                <div className={styles.kv}><span>Clicked elevation</span><span>{terrainSample.data ? `${terrainSample.data.elevationFt.toFixed(1)} ft` : "Click map with terrain on"}</span></div>
              </div>
              {selectedScenario ? (
                <div className={styles.detailCard}>
                  <strong>Best linked scenario</strong>
                  <div className={styles.kv}><span>Scenario</span><span>{selectedScenario.title}</span></div>
                  <div className={styles.kv}><span>Homes</span><span>{selectedScenario.units}</span></div>
                  <div className={styles.kv}><span>Average lot</span><span>{selectedScenario.averageLot.toLocaleString()} sf</span></div>
                  <div className={styles.kv}><span>Open space</span><span>{selectedScenario.openSpacePercent}%</span></div>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}
