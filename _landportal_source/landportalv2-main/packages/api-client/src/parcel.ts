import type { SupabaseClient } from "@supabase/supabase-js";
import {
  processParcel,
  type ParcelConstraintInput,
  type PolygonGeometry,
} from "@landportal/core-parcel";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type CreateParcelSnapshotInput = {
  projectId: string;
  name?: string;
  sourceProvider?: string;
  sourceParcelId?: string;
  apn?: string;
  address?: string;
  jurisdiction?: string;
  county?: string;
  state?: string;
  zipCode?: string;
  zoningCode?: string;
  landUse?: string;
  acreage?: number;
  buildableAcres?: number;
  frontageFt?: number;
  floodZone?: string;
  rawAttributes?: Record<string, Json>;
};

export async function createParcelSnapshot(
  supabase: SupabaseClient,
  input: CreateParcelSnapshotInput,
) {
  const { data, error } = await supabase
    .from("parcel_snapshots")
    .insert({
      project_id: input.projectId,
      name: input.name ?? input.address ?? input.apn ?? "Imported parcel",
      source: input.sourceProvider ?? null,
      source_provider: input.sourceProvider ?? null,
      source_parcel_id: input.sourceParcelId ?? null,
      apn: input.apn ?? null,
      address: input.address ?? null,
      jurisdiction: input.jurisdiction ?? null,
      zoning: input.zoningCode ?? null,
      county: input.county ?? null,
      state: input.state ?? null,
      zip_code: input.zipCode ?? null,
      zoning_code: input.zoningCode ?? null,
      land_use: input.landUse ?? null,
      acreage: input.acreage ?? 0,
      buildable_acres: input.buildableAcres ?? 0,
      frontage_ft: input.frontageFt ?? 0,
      flood_zone: input.floodZone ?? "Unknown",
      raw_attributes: input.rawAttributes ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteParcelSnapshot(
  supabase: SupabaseClient,
  input: { parcelSnapshotId: string },
) {
  const { error } = await supabase
    .from("parcel_snapshots")
    .delete()
    .eq("id", input.parcelSnapshotId);

  if (error) throw error;
}

export async function upsertParcelGeometry(
  supabase: SupabaseClient,
  input: {
    parcelSnapshotId: string;
    geometryRole: string;
    geometry: PolygonGeometry;
    geometryType?: string;
    areaSqft?: number | null;
    perimeterFt?: number | null;
    bbox?: Record<string, Json> | null;
    srid?: number | null;
    metadata?: Record<string, Json>;
  },
) {
  const { data, error } = await supabase
    .from("parcel_geometries")
    .upsert(
      {
        parcel_snapshot_id: input.parcelSnapshotId,
        geometry_role: input.geometryRole,
        geometry: input.geometry,
        geometry_type: input.geometryType ?? input.geometry.type,
        area_sqft: input.areaSqft ?? null,
        perimeter_ft: input.perimeterFt ?? null,
        bbox: input.bbox ?? null,
        srid: input.srid ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "parcel_snapshot_id,geometry_role" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function replaceParcelConstraints(
  supabase: SupabaseClient,
  input: {
    parcelSnapshotId: string;
    constraints: ParcelConstraintInput[];
  },
) {
  const { error: deleteError } = await supabase
    .from("parcel_constraints")
    .delete()
    .eq("parcel_snapshot_id", input.parcelSnapshotId);

  if (deleteError) throw deleteError;

  if (!input.constraints.length) return [];

  const rows = input.constraints.map((constraint) => ({
    parcel_snapshot_id: input.parcelSnapshotId,
    constraint_type: constraint.constraintType,
    label: constraint.label ?? null,
    geometry: constraint.geometry ?? null,
    area_sqft: constraint.geometry ? estimateArea(constraint.geometry) : null,
    severity: constraint.severity ?? "hard",
    attributes: constraint.attributes ?? {},
  }));

  const { data, error } = await supabase
    .from("parcel_constraints")
    .insert(rows)
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function replaceParcelFrontageEdges(
  supabase: SupabaseClient,
  input: {
    parcelSnapshotId: string;
    frontageEdges: ReturnType<typeof processParcel>["frontageEdges"];
  },
) {
  const { error: deleteError } = await supabase
    .from("parcel_frontage_edges")
    .delete()
    .eq("parcel_snapshot_id", input.parcelSnapshotId);

  if (deleteError) throw deleteError;

  if (!input.frontageEdges.length) return [];

  const rows = input.frontageEdges.map((edge) => ({
    parcel_snapshot_id: input.parcelSnapshotId,
    edge_index: edge.edgeIndex,
    line_geometry: edge.lineGeometry,
    length_ft: edge.lengthFt,
    edge_role: edge.edgeRole,
    touches_public_row: edge.touchesPublicRow,
    is_selected: edge.isSelected,
    metadata: edge.metadata,
  }));

  const { data, error } = await supabase
    .from("parcel_frontage_edges")
    .insert(rows)
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function upsertParcelIntelligenceRecord(
  supabase: SupabaseClient,
  input: {
    parcelSnapshotId: string;
    intelligence: ReturnType<typeof processParcel>["intelligence"];
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("parcel_intelligence_records")
    .select("id")
    .eq("parcel_snapshot_id", input.parcelSnapshotId)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    parcel_snapshot_id: input.parcelSnapshotId,
    analysis_version: input.intelligence.analysisVersion,
    gross_area_sqft: input.intelligence.grossAreaSqft,
    gross_area_acres: input.intelligence.grossAreaAcres,
    buildable_area_sqft: input.intelligence.buildableAreaSqft,
    buildable_area_acres: input.intelligence.buildableAreaAcres,
    frontage_ft: input.intelligence.frontageFt,
    avg_depth_ft: input.intelligence.avgDepthFt,
    max_depth_ft: input.intelligence.maxDepthFt,
    min_depth_ft: input.intelligence.minDepthFt,
    compactness_score: input.intelligence.compactnessScore,
    irregularity_score: input.intelligence.irregularityScore,
    constraint_coverage_percent: input.intelligence.constraintCoveragePercent,
    shape_classification: input.intelligence.shapeClassification,
    access_classification: input.intelligence.accessClassification,
    best_subdivision_strategy: input.intelligence.bestSubdivisionStrategy,
    buildability_score: input.intelligence.buildabilityScore,
    risk_score: input.intelligence.riskScore,
    warnings: input.intelligence.warnings,
    metrics: input.intelligence.metrics,
    recommendations: input.intelligence.recommendations,
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? supabase.from("parcel_intelligence_records").update(payload).eq("id", existing.id)
    : supabase.from("parcel_intelligence_records").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function createParcelAnalysisRun(
  supabase: SupabaseClient,
  input: {
    parcelSnapshotId: string;
    engineVersion: string;
    ruleset?: Record<string, Json>;
    resultRecordId?: string | null;
    status?: string;
    notes?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("parcel_analysis_runs")
    .insert({
      parcel_snapshot_id: input.parcelSnapshotId,
      engine_version: input.engineVersion,
      ruleset: input.ruleset ?? {},
      result_record_id: input.resultRecordId ?? null,
      status: input.status ?? "completed",
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function runParcelAnalysis(
  supabase: SupabaseClient,
  input: {
    parcelSnapshotId: string;
    boundary: PolygonGeometry;
    constraints?: ParcelConstraintInput[];
    selectedFrontageEdgeIndex?: number | null;
    analysisVersion?: string;
  },
) {
  const result = processParcel({
    parcelSnapshotId: input.parcelSnapshotId,
    boundary: input.boundary,
    constraints: input.constraints ?? [],
    selectedFrontageEdgeIndex: input.selectedFrontageEdgeIndex ?? null,
    analysisVersion: input.analysisVersion ?? "v1",
  });

  const normalizedArea = estimateArea(result.normalizedBoundary);
  const normalizedPerimeter = estimatePerimeter(result.normalizedBoundary);
  const normalizedBox = estimateBBox(result.normalizedBoundary);

  const buildableArea = estimateArea(result.buildableEnvelope);
  const buildablePerimeter = estimatePerimeter(result.buildableEnvelope);
  const buildableBox = estimateBBox(result.buildableEnvelope);

  await upsertParcelGeometry(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    geometryRole: "raw_boundary",
    geometry: input.boundary,
    areaSqft: estimateArea(input.boundary),
    perimeterFt: estimatePerimeter(input.boundary),
    bbox: toJsonRecord(estimateBBox(input.boundary)),
  });

  await upsertParcelGeometry(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    geometryRole: "normalized_boundary",
    geometry: result.normalizedBoundary,
    areaSqft: normalizedArea,
    perimeterFt: normalizedPerimeter,
    bbox: toJsonRecord(normalizedBox),
  });

  await upsertParcelGeometry(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    geometryRole: "buildable_envelope",
    geometry: result.buildableEnvelope,
    areaSqft: buildableArea,
    perimeterFt: buildablePerimeter,
    bbox: toJsonRecord(buildableBox),
  });

  await replaceParcelConstraints(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    constraints: input.constraints ?? [],
  });

  await replaceParcelFrontageEdges(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    frontageEdges: result.frontageEdges,
  });

  const { error: snapshotUpdateError } = await supabase
    .from("parcel_snapshots")
    .update({
      acreage: result.intelligence.grossAreaAcres,
      buildable_acres: result.intelligence.buildableAreaAcres,
      frontage_ft: result.intelligence.frontageFt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.parcelSnapshotId);

  if (snapshotUpdateError) throw snapshotUpdateError;

  const intelligence = await upsertParcelIntelligenceRecord(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    intelligence: result.intelligence,
  });

  await createParcelAnalysisRun(supabase, {
    parcelSnapshotId: input.parcelSnapshotId,
    engineVersion: result.intelligence.analysisVersion,
    resultRecordId: String(intelligence.id),
    status: "completed",
  });

  return {
    ...result,
    intelligenceRecordId: String(intelligence.id),
  };
}

export async function fetchParcelIntelligence(
  supabase: SupabaseClient,
  parcelSnapshotId: string,
) {
  const { data, error } = await supabase
    .from("parcel_intelligence_records")
    .select("*")
    .eq("parcel_snapshot_id", parcelSnapshotId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function estimateArea(geometry: PolygonGeometry): number {
  const ring = geometry.coordinates[0];
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function estimatePerimeter(geometry: PolygonGeometry): number {
  const ring = geometry.coordinates[0];
  let total = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    total += Math.hypot(x2 - x1, y2 - y1);
  }
  return total;
}

function estimateBBox(geometry: PolygonGeometry) {
  const ring = geometry.coordinates[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function toJsonRecord(value: Record<string, unknown>): Record<string, Json> {
  return value as Record<string, Json>;
}
