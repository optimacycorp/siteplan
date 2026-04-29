import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export * from "./parcel";
export * from "./parcelSelection";
export * from "./terrain";
export * from "./title";

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  location: string;
  status: "draft" | "active" | "review" | "archived";
  updated_at: string;
  point_count: number;
  color: string;
  profiles: { full_name: string | null } | null;
};

type ProjectMapSettingsRow = {
  system: string;
  map_label: string;
  anchor_lng: number;
  anchor_lat: number;
  anchor_zoom: number;
};

type ProjectSpatialReferenceRow = {
  horizontal_epsg: number | null;
  horizontal_name: string | null;
  horizontal_datum: string | null;
  vertical_reference: string | null;
  units: string | null;
  geoid_model: string | null;
  transform_method: "anchor_normalized" | "projected_crs" | null;
  transform_last_verified_at: string | null;
  metadata: Record<string, unknown> | null;
};

type SurveyPointRow = {
  id: string;
  name: string;
  code: string;
  northing: number;
  easting: number;
  elevation: number;
  collected_at: string;
  collector: string;
  solution: string;
  rms: string;
};

type SurveySegmentRow = {
  id: string;
  from_point_id: string;
  to_point_id: string;
  label: string;
};

type ParcelSnapshotRow = {
  id: string;
  name: string;
  source: string | null;
  apn: string | null;
  address: string | null;
  jurisdiction: string | null;
  zoning: string | null;
  acreage: number;
  buildable_acres: number;
  frontage_ft: number;
  flood_zone: string;
  raw_attributes: Record<string, unknown> | null;
};

type ParcelGeometryRow = {
  id: string;
  parcel_snapshot_id: string;
  geometry_role: string;
  geometry: { points?: Array<{ x: number; y: number }> } | null;
  geometry_type: string;
  area_sqft: number | null;
  perimeter_ft: number | null;
  bbox: Record<string, unknown> | null;
};

type ParcelConstraintRow = {
  id: string;
  parcel_snapshot_id: string;
  constraint_type: string;
  label: string | null;
  geometry: { points?: Array<{ x: number; y: number }> } | null;
  attributes: Record<string, unknown> | null;
};

type ParcelIntelligenceRow = {
  parcel_snapshot_id: string;
  gross_area_sqft: number | null;
  gross_area_acres: number | null;
  buildable_area_sqft: number | null;
  buildable_area_acres: number | null;
  frontage_ft: number | null;
  avg_depth_ft: number | null;
  max_depth_ft: number | null;
  min_depth_ft: number | null;
  compactness_score: number | null;
  irregularity_score: number | null;
  constraint_coverage_percent: number | null;
  shape_classification: string | null;
  access_classification: string | null;
  best_subdivision_strategy: string | null;
  buildability_score: number | null;
  risk_score: number | null;
  warnings: unknown[] | null;
  metrics: Record<string, unknown> | null;
  recommendations: Record<string, unknown> | null;
};

type ParcelFrontageEdgeRow = {
  parcel_snapshot_id: string;
  edge_index: number;
  line_geometry: { points?: Array<{ x: number; y: number }> } | null;
  length_ft: number | null;
  edge_role: string;
  touches_public_row: boolean | null;
  is_selected: boolean | null;
  metadata: Record<string, unknown> | null;
};

type YieldScenarioRow = {
  id: string;
  selected_parcel_snapshot_id: string | null;
  name: string;
  status: string;
  assumptions: Record<string, unknown> | null;
  results: Record<string, unknown> | null;
};

type ProjectDocumentRow = {
  id: string;
  document_type: string;
  document_role: string | null;
  title: string;
  status: string;
  metadata: Record<string, unknown> | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  external_reference: string | null;
  parent_document_id: string | null;
  updated_at: string;
};

type SubdivisionRulesetRow = {
  id: string;
  name: string;
  jurisdiction: string | null;
  rules: Record<string, unknown> | null;
};

type SubdivisionLayoutRow = {
  id: string;
  parcel_snapshot_id: string | null;
  ruleset_id: string | null;
  name: string;
  status: string;
  metrics: Record<string, unknown> | null;
  layout_data: Record<string, unknown> | null;
  updated_at: string;
};

type SitePlanLayoutRow = {
  id: string;
  name: string;
  status: string;
  planner_settings: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
};

type SitePlanElementRow = {
  id: string;
  site_plan_layout_id: string;
  element_type: string;
  label: string | null;
  geometry: { points?: Array<{ x: number; y: number }> } | null;
  style: Record<string, unknown> | null;
  attributes: Record<string, unknown> | null;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  location: string;
  status: "Active" | "Draft" | "Review" | "Archived";
  updatedAt: string;
  pointCount: number;
  owner: string;
  color: string;
};

export type CreateProjectInput = {
  workspaceId: string;
  ownerId: string;
  name: string;
  description: string;
  location: string;
};

export type SurveyPoint = {
  id: string;
  name: string;
  code: string;
  northing: number;
  easting: number;
  elevation: number;
  collectedAt: string;
  collector: string;
  solution: string;
  rms: string;
};

export type SurveySegment = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export type ProjectWorkspace = {
  system: string;
  mapLabel: string;
  anchor: {
    lng: number;
    lat: number;
    zoom: number;
  };
  spatialReference: {
    horizontalEpsg: number | null;
    horizontalName: string;
    horizontalDatum: string;
    verticalReference: string;
    units: string;
    geoidModel: string;
    transformMethod: "anchor_normalized" | "projected_crs";
    transformLastVerifiedAt: string | null;
    metadata: Record<string, unknown>;
  };
  points: SurveyPoint[];
  segments: SurveySegment[];
};

export type ParcelConstraint = {
  id: string;
  type: string;
  label: string;
  points: Array<{ x: number; y: number }>;
  attributes: Record<string, unknown>;
};

export type ParcelFrontageEdge = {
  edgeIndex: number;
  lengthFt: number;
  role: string;
  touchesPublicRow: boolean;
  isSelected: boolean;
  points: Array<{ x: number; y: number }>;
};

export type ParcelIntelligence = {
  grossAreaSqft: number;
  grossAreaAcres: number;
  buildableAreaSqft: number;
  buildableAreaAcres: number;
  frontageFt: number;
  avgDepthFt: number;
  minDepthFt: number;
  maxDepthFt: number;
  compactnessScore: number;
  irregularityScore: number;
  constraintCoveragePercent: number;
  shapeClassification: string;
  accessClassification: string;
  bestSubdivisionStrategy: string;
  buildabilityScore: number;
  riskScore: number;
  warnings: Array<{
    severity: string;
    code: string;
    message: string;
  }>;
  metrics: Record<string, unknown>;
  recommendations: Record<string, unknown>;
};

export type ParcelRecord = {
  id: string;
  name: string;
  source: string;
  apn: string;
  address: string;
  jurisdiction: string;
  zoning: string;
  areaAcres: number;
  buildableAcres: number;
  frontageFeet: number;
  floodZone: string;
  lotCoverage: number;
  maxUnits: number;
  overlayColor: string;
  polygon: Array<{ x: number; y: number }>;
  normalizedBoundary: Array<{ x: number; y: number }>;
  buildableEnvelope: Array<{ x: number; y: number }>;
  constraints: ParcelConstraint[];
  frontageEdges: ParcelFrontageEdge[];
  intelligence: ParcelIntelligence | null;
};

export type YieldScenario = {
  id: string;
  parcelId: string | null;
  title: string;
  product: string;
  units: number;
  averageLot: number;
  openSpacePercent: number;
  density: number;
  buildableArea: number;
  status: string;
};

export type ProjectDocument = {
  id: string;
  title: string;
  type: string;
  role: string;
  status: string;
  owner: string;
  updatedAt: string;
  storagePath: string | null;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  externalReference: string;
  parentDocumentId: string | null;
};

export type SubdivisionRuleset = {
  id: string;
  name: string;
  jurisdiction: string;
  minLotAreaSqft: number;
  minFrontageFt: number;
  minDepthFt: number;
  roadWidthFt: number;
  setbackFt: number;
};

export type SubdivisionLot = {
  id: string;
  label: string;
  polygon: Array<{ x: number; y: number }>;
};

export type SubdivisionLayout = {
  id: string;
  name: string;
  status: string;
  parcelId: string | null;
  rulesetId: string | null;
  lotCount: number;
  averageLotAreaSqft: number;
  yieldUnits: number;
  warnings: string[];
  lots: SubdivisionLot[];
  updatedAt: string;
};

export type SitePlanElement = {
  id: string;
  elementType: string;
  label: string;
  points: Array<{ x: number; y: number }>;
  style: Record<string, unknown>;
  attributes: Record<string, unknown>;
};

export type SitePlanLayout = {
  id: string;
  name: string;
  status: string;
  plannerSettings: Record<string, unknown>;
  metrics: Record<string, unknown>;
  elements: SitePlanElement[];
};

export type ProjectDevelopmentData = {
  parcels: ParcelRecord[];
  scenarios: YieldScenario[];
  documents: ProjectDocument[];
  rulesets: SubdivisionRuleset[];
  layouts: SubdivisionLayout[];
  sitePlans: SitePlanLayout[];
};

export type CreateYieldScenarioInput = {
  projectId: string;
  parcelSnapshotId: string | null;
  ownerId: string;
  name: string;
  status: string;
  assumptions: Record<string, unknown>;
  results: Record<string, unknown>;
};

export type CreateSubdivisionLayoutInput = {
  projectId: string;
  parcelSnapshotId: string | null;
  rulesetId: string | null;
  ownerId: string;
  name: string;
  status: string;
  metrics: Record<string, unknown>;
  layoutData: Record<string, unknown>;
};

export const emptyProjectWorkspace: ProjectWorkspace = {
  system: "NAD83(2011) / Colorado Central (ftUS)",
  mapLabel: "Workspace view",
  anchor: {
    lng: -104.8207,
    lat: 38.8339,
    zoom: 15.9,
  },
  spatialReference: {
    horizontalEpsg: null,
    horizontalName: "Local grid",
    horizontalDatum: "",
    verticalReference: "",
    units: "us_survey_ft",
    geoidModel: "",
    transformMethod: "anchor_normalized",
    transformLastVerifiedAt: null,
    metadata: {},
  },
  points: [],
  segments: [],
};

export const emptyProjectDevelopment: ProjectDevelopmentData = {
  parcels: [],
  scenarios: [],
  documents: [],
  rulesets: [],
  layouts: [],
  sitePlans: [],
};

function formatStatus(status: ProjectRow["status"]): Project["status"] {
  switch (status) {
    case "active":
      return "Active";
    case "review":
      return "Review";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeError(error: PostgrestError | Error | null) {
  if (!error) return "Unknown error";
  return error.message;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    status: formatStatus(row.status),
    updatedAt: formatDate(row.updated_at),
    pointCount: row.point_count,
    owner: row.profiles?.full_name ?? "Workspace owner",
    color: row.color,
  };
}

function mapSurveyPoint(row: SurveyPointRow): SurveyPoint {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    northing: row.northing,
    easting: row.easting,
    elevation: row.elevation,
    collectedAt: formatDateTime(row.collected_at),
    collector: row.collector,
    solution: row.solution,
    rms: row.rms,
  };
}

function mapSurveySegment(row: SurveySegmentRow): SurveySegment {
  return {
    id: row.id,
    from: row.from_point_id,
    to: row.to_point_id,
    label: row.label,
  };
}

function palette(index: number) {
  const colors = [
    "rgba(54, 95, 194, 0.28)",
    "rgba(30, 141, 98, 0.26)",
    "rgba(201, 79, 79, 0.24)",
    "rgba(207, 151, 51, 0.24)",
  ];
  return colors[index % colors.length];
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function pointsValue(value: { points?: Array<{ x: number; y: number }> } | null | undefined) {
  return Array.isArray(value?.points) ? value.points : [];
}

function geometryPointsValue(
  value:
    | { points?: Array<{ x: number; y: number }>; coordinates?: Array<Array<[number, number]>> }
    | { coordinates?: Array<[number, number]> }
    | null
    | undefined,
) {
  if (Array.isArray((value as { points?: Array<{ x: number; y: number }> } | undefined)?.points)) {
    return (value as { points: Array<{ x: number; y: number }> }).points;
  }

  const coordinates = (value as { coordinates?: unknown[] } | undefined)?.coordinates;
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return [];
  }

  const first = coordinates[0];
  if (Array.isArray(first) && typeof first[0] === "number") {
    return (coordinates as Array<[number, number]>).map(([x, y]) => ({ x, y }));
  }

  if (Array.isArray(first) && Array.isArray(first[0])) {
    return (first as Array<[number, number]>).slice(0, -1).map(([x, y]) => ({ x, y }));
  }

  return [];
}

function mapParcelIntelligence(row: ParcelIntelligenceRow | undefined): ParcelIntelligence | null {
  if (!row) return null;
  return {
    grossAreaSqft: numberValue(row.gross_area_sqft, 0),
    grossAreaAcres: numberValue(row.gross_area_acres, 0),
    buildableAreaSqft: numberValue(row.buildable_area_sqft, 0),
    buildableAreaAcres: numberValue(row.buildable_area_acres, 0),
    frontageFt: numberValue(row.frontage_ft, 0),
    avgDepthFt: numberValue(row.avg_depth_ft, 0),
    minDepthFt: numberValue(row.min_depth_ft, 0),
    maxDepthFt: numberValue(row.max_depth_ft, 0),
    compactnessScore: numberValue(row.compactness_score, 0),
    irregularityScore: numberValue(row.irregularity_score, 0),
    constraintCoveragePercent: numberValue(row.constraint_coverage_percent, 0),
    shapeClassification: stringValue(row.shape_classification, "unknown"),
    accessClassification: stringValue(row.access_classification, "unknown"),
    bestSubdivisionStrategy: stringValue(row.best_subdivision_strategy, "manual_review"),
    buildabilityScore: numberValue(row.buildability_score, 0),
    riskScore: numberValue(row.risk_score, 0),
    warnings: Array.isArray(row.warnings)
      ? row.warnings.flatMap((value) => {
          if (typeof value === "string") {
            return [{ severity: "info", code: "LEGACY_WARNING", message: value }];
          }
          if (
            value &&
            typeof value === "object" &&
            "message" in value &&
            typeof (value as { message: unknown }).message === "string"
          ) {
            return [{
              severity: typeof (value as { severity?: unknown }).severity === "string" ? String((value as { severity?: unknown }).severity) : "info",
              code: typeof (value as { code?: unknown }).code === "string" ? String((value as { code?: unknown }).code) : "WARNING",
              message: String((value as { message: unknown }).message),
            }];
          }
          return [];
        })
      : [],
    metrics: row.metrics ?? {},
    recommendations: row.recommendations ?? {},
  };
}

function mapParcelFrontageEdges(rows: ParcelFrontageEdgeRow[]): ParcelFrontageEdge[] {
  return rows.map((row) => ({
    edgeIndex: row.edge_index,
    lengthFt: numberValue(row.length_ft, 0),
    role: row.edge_role,
    touchesPublicRow: Boolean(row.touches_public_row),
    isSelected: Boolean(row.is_selected),
    points: geometryPointsValue(row.line_geometry),
  }));
}

function mapParcelRecord(row: ParcelSnapshotRow, geometryRows: ParcelGeometryRow[], constraintRows: ParcelConstraintRow[], intelligenceRow: ParcelIntelligenceRow | undefined, frontageRows: ParcelFrontageEdgeRow[], index: number): ParcelRecord {
  const raw = row.raw_attributes ?? {};
  const rawGeometry = geometryRows.find((geometry) => geometry.geometry_role === "raw_boundary") ?? geometryRows[0];
  const normalizedGeometry = geometryRows.find((geometry) => geometry.geometry_role === "normalized_boundary");
  const buildableGeometry = geometryRows.find((geometry) => geometry.geometry_role === "buildable_envelope");
  return {
    id: row.id,
    name: row.name,
    source: row.source ?? "manual",
    apn: row.apn ?? "",
    address: row.address ?? "",
    jurisdiction: row.jurisdiction ?? "",
    zoning: row.zoning ?? "Unassigned",
    areaAcres: row.acreage,
    buildableAcres: row.buildable_acres,
    frontageFeet: row.frontage_ft,
    floodZone: row.flood_zone,
    lotCoverage: numberValue(raw.lotCoverage, 0),
    maxUnits: numberValue(raw.maxUnits, 0),
    overlayColor: palette(index),
    polygon: geometryPointsValue(rawGeometry?.geometry),
    normalizedBoundary: geometryPointsValue(normalizedGeometry?.geometry),
    buildableEnvelope: geometryPointsValue(buildableGeometry?.geometry),
    constraints: constraintRows.map((constraint) => ({
      id: constraint.id,
      type: constraint.constraint_type,
      label: constraint.label ?? constraint.constraint_type,
      points: geometryPointsValue(constraint.geometry),
      attributes: constraint.attributes ?? {},
    })),
    frontageEdges: mapParcelFrontageEdges(frontageRows),
    intelligence: mapParcelIntelligence(intelligenceRow),
  };
}

function mapYieldScenario(row: YieldScenarioRow): YieldScenario {
  const assumptions = row.assumptions ?? {};
  const results = row.results ?? {};
  return {
    id: row.id,
    parcelId: row.selected_parcel_snapshot_id,
    title: row.name,
    product: stringValue(assumptions.product, "Concept"),
    units: numberValue(results.units, 0),
    averageLot: numberValue(results.averageLot, 0),
    openSpacePercent: numberValue(results.openSpacePercent, numberValue(assumptions.openSpacePercent, 0)),
    density: numberValue(assumptions.density, 0),
    buildableArea: numberValue(results.buildableArea, 0),
    status: row.status,
  };
}

function mapProjectDocument(row: ProjectDocumentRow): ProjectDocument {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    type: row.document_type,
    role: row.document_role ?? "supporting",
    status: row.status,
    owner: stringValue(metadata.owner, "Workspace team"),
    updatedAt: stringValue(metadata.updatedAt, formatDate(row.updated_at)),
    storagePath: row.storage_path,
    fileName: row.file_name ?? "",
    mimeType: row.mime_type ?? "",
    fileSizeBytes: row.file_size_bytes ?? 0,
    externalReference: row.external_reference ?? "",
    parentDocumentId: row.parent_document_id,
  };
}

function mapRuleset(row: SubdivisionRulesetRow): SubdivisionRuleset {
  const rules = row.rules ?? {};
  return {
    id: row.id,
    name: row.name,
    jurisdiction: row.jurisdiction ?? "Workspace",
    minLotAreaSqft: numberValue(rules.minLotAreaSqft, 6000),
    minFrontageFt: numberValue(rules.minFrontageFt, 50),
    minDepthFt: numberValue(rules.minDepthFt, 100),
    roadWidthFt: numberValue(rules.roadWidthFt, 28),
    setbackFt: numberValue(rules.setbackFt, 12),
  };
}

function mapSitePlanElement(row: SitePlanElementRow): SitePlanElement {
  return {
    id: row.id,
    elementType: row.element_type,
    label: row.label ?? row.element_type,
    points: pointsValue(row.geometry),
    style: row.style ?? {},
    attributes: row.attributes ?? {},
  };
}

function mapSitePlanLayout(row: SitePlanLayoutRow, elements: SitePlanElementRow[]): SitePlanLayout {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    plannerSettings: row.planner_settings ?? {},
    metrics: row.metrics ?? {},
    elements: elements.filter((element) => element.site_plan_layout_id === row.id).map(mapSitePlanElement),
  };
}

function mapLayout(row: SubdivisionLayoutRow): SubdivisionLayout {
  const metrics = row.metrics ?? {};
  const layoutData = row.layout_data ?? {};
  const lots = Array.isArray(layoutData.lots) ? layoutData.lots : [];
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    parcelId: row.parcel_snapshot_id,
    rulesetId: row.ruleset_id,
    lotCount: numberValue(metrics.lotCount, lots.length),
    averageLotAreaSqft: numberValue(metrics.averageLotAreaSqft, 0),
    yieldUnits: numberValue(metrics.yieldUnits, numberValue(metrics.lotCount, lots.length)),
    warnings: Array.isArray(metrics.warnings) ? metrics.warnings.filter((value): value is string => typeof value === "string") : [],
    lots: lots.map((lot, index) => ({
      id: stringValue(lot.id, `lot-${index + 1}`),
      label: stringValue(lot.label, `${index + 1}`),
      polygon: Array.isArray(lot.polygon) ? lot.polygon : [],
    })),
    updatedAt: formatDate(row.updated_at),
  };
}

export async function fetchProjects(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,description,location,status,updated_at,point_count,color,profiles!projects_owner_id_fkey(full_name)")
    .order("updated_at", { ascending: false })
    .returns<ProjectRow[]>();
  if (error) throw new Error(normalizeError(error));
  return (data ?? []).map(mapProject);
}

export async function insertProject(supabase: SupabaseClient, values: CreateProjectInput) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: values.workspaceId,
      owner_id: values.ownerId,
      name: values.name,
      description: values.description,
      location: values.location,
      status: "draft",
      point_count: 0,
      color: "linear-gradient(135deg, #d7e4f4, #eef3fb 70%, #ffffff)",
    })
    .select("id,name,description,location,status,updated_at,point_count,color,profiles!projects_owner_id_fkey(full_name)")
    .returns<ProjectRow[]>()
    .single();
  if (error || !data) throw new Error(normalizeError(error));
  return mapProject(data);
}

export async function fetchProjectWorkspace(supabase: SupabaseClient, projectId: string): Promise<ProjectWorkspace> {
  const [{ data: settings, error: settingsError }, { data: spatialReference, error: spatialReferenceError }, { data: points, error: pointsError }, { data: segments, error: segmentsError }] = await Promise.all([
    supabase.from("project_map_settings").select("system,map_label,anchor_lng,anchor_lat,anchor_zoom").eq("project_id", projectId).maybeSingle<ProjectMapSettingsRow>(),
    supabase.from("project_spatial_reference").select("horizontal_epsg,horizontal_name,horizontal_datum,vertical_reference,units,geoid_model,transform_method,transform_last_verified_at,metadata").eq("project_id", projectId).maybeSingle<ProjectSpatialReferenceRow>(),
    supabase.from("survey_points").select("id,name,code,northing,easting,elevation,collected_at,collector,solution,rms").eq("project_id", projectId).order("collected_at", { ascending: true }).returns<SurveyPointRow[]>(),
    supabase.from("survey_segments").select("id,from_point_id,to_point_id,label").eq("project_id", projectId).order("label", { ascending: true }).returns<SurveySegmentRow[]>(),
  ]);
  if (settingsError) throw new Error(normalizeError(settingsError));
  if (spatialReferenceError) throw new Error(normalizeError(spatialReferenceError));
  if (pointsError) throw new Error(normalizeError(pointsError));
  if (segmentsError) throw new Error(normalizeError(segmentsError));

  return {
    system: settings?.system ?? emptyProjectWorkspace.system,
    mapLabel: settings?.map_label ?? emptyProjectWorkspace.mapLabel,
    anchor: {
      lng: settings?.anchor_lng ?? emptyProjectWorkspace.anchor.lng,
      lat: settings?.anchor_lat ?? emptyProjectWorkspace.anchor.lat,
      zoom: settings?.anchor_zoom ?? emptyProjectWorkspace.anchor.zoom,
    },
    spatialReference: {
      horizontalEpsg: spatialReference?.horizontal_epsg ?? emptyProjectWorkspace.spatialReference.horizontalEpsg,
      horizontalName: spatialReference?.horizontal_name ?? emptyProjectWorkspace.spatialReference.horizontalName,
      horizontalDatum: spatialReference?.horizontal_datum ?? emptyProjectWorkspace.spatialReference.horizontalDatum,
      verticalReference: spatialReference?.vertical_reference ?? emptyProjectWorkspace.spatialReference.verticalReference,
      units: spatialReference?.units ?? emptyProjectWorkspace.spatialReference.units,
      geoidModel: spatialReference?.geoid_model ?? emptyProjectWorkspace.spatialReference.geoidModel,
      transformMethod: spatialReference?.transform_method ?? emptyProjectWorkspace.spatialReference.transformMethod,
      transformLastVerifiedAt: spatialReference?.transform_last_verified_at ?? emptyProjectWorkspace.spatialReference.transformLastVerifiedAt,
      metadata: spatialReference?.metadata ?? emptyProjectWorkspace.spatialReference.metadata,
    },
    points: (points ?? []).map(mapSurveyPoint),
    segments: (segments ?? []).map(mapSurveySegment),
  };
}

export async function fetchProjectDevelopment(supabase: SupabaseClient, projectId: string): Promise<ProjectDevelopmentData> {
  const [snapshotsRes, geometriesRes, constraintsRes, intelligenceRes, frontageRes, scenariosRes, documentsRes, rulesetsRes, layoutsRes, sitePlansRes, sitePlanElementsRes] = await Promise.all([
    supabase.from("parcel_snapshots").select("id,name,source,apn,address,jurisdiction,zoning,acreage,buildable_acres,frontage_ft,flood_zone,raw_attributes").eq("project_id", projectId).order("created_at", { ascending: true }).returns<ParcelSnapshotRow[]>(),
    supabase.from("parcel_geometries").select("id,parcel_snapshot_id,geometry_role,geometry,geometry_type,area_sqft,perimeter_ft,bbox").returns<ParcelGeometryRow[]>(),
    supabase.from("parcel_constraints").select("id,parcel_snapshot_id,constraint_type,label,geometry,attributes").returns<ParcelConstraintRow[]>(),
    supabase.from("parcel_intelligence_records").select("parcel_snapshot_id,gross_area_sqft,gross_area_acres,buildable_area_sqft,buildable_area_acres,frontage_ft,avg_depth_ft,max_depth_ft,min_depth_ft,compactness_score,irregularity_score,constraint_coverage_percent,shape_classification,access_classification,best_subdivision_strategy,buildability_score,risk_score,warnings,metrics,recommendations").returns<ParcelIntelligenceRow[]>(),
    supabase.from("parcel_frontage_edges").select("parcel_snapshot_id,edge_index,line_geometry,length_ft,edge_role,touches_public_row,is_selected,metadata").returns<ParcelFrontageEdgeRow[]>(),
    supabase.from("yield_scenarios").select("id,selected_parcel_snapshot_id,name,status,assumptions,results").eq("project_id", projectId).order("created_at", { ascending: true }).returns<YieldScenarioRow[]>(),
    supabase.from("project_documents").select("id,document_type,document_role,title,status,metadata,storage_path,file_name,mime_type,file_size_bytes,external_reference,parent_document_id,updated_at").eq("project_id", projectId).order("updated_at", { ascending: false }).returns<ProjectDocumentRow[]>(),
    supabase.from("subdivision_rulesets").select("id,name,jurisdiction,rules").eq("project_id", projectId).order("created_at", { ascending: true }).returns<SubdivisionRulesetRow[]>(),
    supabase.from("subdivision_layouts").select("id,parcel_snapshot_id,ruleset_id,name,status,metrics,layout_data,updated_at").eq("project_id", projectId).order("updated_at", { ascending: false }).returns<SubdivisionLayoutRow[]>(),
    supabase.from("site_plan_layouts").select("id,name,status,planner_settings,metrics").eq("project_id", projectId).order("updated_at", { ascending: false }).returns<SitePlanLayoutRow[]>(),
    supabase.from("site_plan_elements").select("id,site_plan_layout_id,element_type,label,geometry,style,attributes").returns<SitePlanElementRow[]>(),
  ]);

  for (const response of [snapshotsRes, geometriesRes, constraintsRes, intelligenceRes, frontageRes, scenariosRes, documentsRes, rulesetsRes, layoutsRes, sitePlansRes, sitePlanElementsRes]) {
    if (response.error) throw new Error(normalizeError(response.error));
  }

  const snapshots = snapshotsRes.data ?? [];
  const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.id));
  const geometries = (geometriesRes.data ?? []).filter((row) => snapshotIds.has(row.parcel_snapshot_id));
  const constraints = (constraintsRes.data ?? []).filter((row) => snapshotIds.has(row.parcel_snapshot_id));
  const intelligenceRecords = (intelligenceRes.data ?? []).filter((row) => snapshotIds.has(row.parcel_snapshot_id));
  const frontageEdges = (frontageRes.data ?? []).filter((row) => snapshotIds.has(row.parcel_snapshot_id));
  const sitePlanLayouts = sitePlansRes.data ?? [];
  const sitePlanLayoutIds = new Set(sitePlanLayouts.map((row) => row.id));
  const sitePlanElements = (sitePlanElementsRes.data ?? []).filter((row) => sitePlanLayoutIds.has(row.site_plan_layout_id));

  return {
    parcels: snapshots.map((snapshot, index) =>
      mapParcelRecord(
        snapshot,
        geometries.filter((row) => row.parcel_snapshot_id === snapshot.id),
        constraints.filter((row) => row.parcel_snapshot_id === snapshot.id),
        intelligenceRecords.find((row) => row.parcel_snapshot_id === snapshot.id),
        frontageEdges.filter((row) => row.parcel_snapshot_id === snapshot.id),
        index,
      ),
    ),
    scenarios: (scenariosRes.data ?? []).map(mapYieldScenario),
    documents: (documentsRes.data ?? []).map(mapProjectDocument),
    rulesets: (rulesetsRes.data ?? []).map(mapRuleset),
    layouts: (layoutsRes.data ?? []).map(mapLayout),
    sitePlans: sitePlanLayouts.map((row) => mapSitePlanLayout(row, sitePlanElements)),
  };
}

export async function insertYieldScenario(supabase: SupabaseClient, values: CreateYieldScenarioInput) {
  const { data, error } = await supabase
    .from("yield_scenarios")
    .insert({
      project_id: values.projectId,
      selected_parcel_snapshot_id: values.parcelSnapshotId,
      name: values.name,
      status: values.status,
      assumptions: values.assumptions,
      results: values.results,
      created_by: values.ownerId,
    })
    .select("id,selected_parcel_snapshot_id,name,status,assumptions,results")
    .returns<YieldScenarioRow[]>()
    .single();
  if (error || !data) throw new Error(normalizeError(error));
  return mapYieldScenario(data);
}

export async function insertSubdivisionLayout(supabase: SupabaseClient, values: CreateSubdivisionLayoutInput) {
  const { data, error } = await supabase
    .from("subdivision_layouts")
    .insert({
      project_id: values.projectId,
      parcel_snapshot_id: values.parcelSnapshotId,
      ruleset_id: values.rulesetId,
      name: values.name,
      status: values.status,
      metrics: values.metrics,
      layout_data: values.layoutData,
      created_by: values.ownerId,
    })
    .select("id,parcel_snapshot_id,ruleset_id,name,status,metrics,layout_data,updated_at")
    .returns<SubdivisionLayoutRow[]>()
    .single();
  if (error || !data) throw new Error(normalizeError(error));
  return mapLayout(data);
}
