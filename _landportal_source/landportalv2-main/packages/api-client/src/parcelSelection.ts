import type { SupabaseClient } from "@supabase/supabase-js";

type ProjectParcelSelectionRow = {
  id: string;
  project_id: string;
  parcel_snapshot_id: string | null;
  parcel_provider: string;
  provider_parcel_id: string;
  parcel_name: string | null;
  apn: string | null;
  address: string | null;
  jurisdiction: string | null;
  zoning_code: string | null;
  geometry: Record<string, unknown> | null;
  centroid: Record<string, unknown> | null;
  bbox: Record<string, unknown> | null;
  provider_path: string | null;
  provider_context: string | null;
  geometry_source: string | null;
  source_recorded_at: string | null;
  source_last_refreshed_at: string | null;
  metadata: Record<string, unknown> | null;
  selection_role: string;
  anchor_status: string | null;
  status: string;
  selected_at: string;
  updated_at: string;
};

export type ProjectParcelSelection = {
  id: string;
  projectId: string;
  parcelSnapshotId: string | null;
  parcelProvider: string;
  providerParcelId: string;
  parcelName: string;
  apn: string;
  address: string;
  jurisdiction: string;
  zoningCode: string;
  geometry: Record<string, unknown> | null;
  centroid: Record<string, unknown> | null;
  bbox: Record<string, unknown> | null;
  providerPath: string;
  providerContext: string;
  geometrySource: string;
  sourceRecordedAt: string | null;
  sourceLastRefreshedAt: string | null;
  metadata: Record<string, unknown>;
  selectionRole: string;
  anchorStatus: string;
  status: string;
  selectedAt: string;
  updatedAt: string;
};

export type UpsertProjectParcelSelectionInput = {
  projectId: string;
  parcelSnapshotId?: string | null;
  parcelProvider: string;
  providerParcelId: string;
  parcelName?: string | null;
  apn?: string | null;
  address?: string | null;
  jurisdiction?: string | null;
  zoningCode?: string | null;
  geometry?: Record<string, unknown> | null;
  centroid?: Record<string, unknown> | null;
  bbox?: Record<string, unknown> | null;
  providerPath?: string | null;
  providerContext?: string | null;
  geometrySource?: string;
  sourceRecordedAt?: string | null;
  sourceLastRefreshedAt?: string | null;
  metadata?: Record<string, unknown>;
  selectionRole?: string;
  anchorStatus?: string;
  status?: string;
};

function mapProjectParcelSelection(row: ProjectParcelSelectionRow): ProjectParcelSelection {
  return {
    id: row.id,
    projectId: row.project_id,
    parcelSnapshotId: row.parcel_snapshot_id,
    parcelProvider: row.parcel_provider,
    providerParcelId: row.provider_parcel_id,
    parcelName: row.parcel_name ?? "",
    apn: row.apn ?? "",
    address: row.address ?? "",
    jurisdiction: row.jurisdiction ?? "",
    zoningCode: row.zoning_code ?? "",
    geometry: row.geometry,
    centroid: row.centroid,
    bbox: row.bbox,
    providerPath: row.provider_path ?? "",
    providerContext: row.provider_context ?? "",
    geometrySource: row.geometry_source ?? "provider",
    sourceRecordedAt: row.source_recorded_at,
    sourceLastRefreshedAt: row.source_last_refreshed_at,
    metadata: row.metadata ?? {},
    selectionRole: row.selection_role,
    anchorStatus: row.anchor_status ?? "active",
    status: row.status,
    selectedAt: row.selected_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectParcelSelection(
  supabase: SupabaseClient,
  projectId: string,
  selectionRole = "primary",
) {
  const { data, error } = await supabase
    .from("project_parcel_selection")
    .select(
      "id,project_id,parcel_snapshot_id,parcel_provider,provider_parcel_id,parcel_name,apn,address,jurisdiction,zoning_code,geometry,centroid,bbox,provider_path,provider_context,geometry_source,source_recorded_at,source_last_refreshed_at,metadata,selection_role,anchor_status,status,selected_at,updated_at",
    )
    .eq("project_id", projectId)
    .eq("selection_role", selectionRole)
    .maybeSingle<ProjectParcelSelectionRow>();

  if (error) throw error;
  return data ? mapProjectParcelSelection(data) : null;
}

export async function fetchProjectParcelSelections(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("project_parcel_selection")
    .select(
      "id,project_id,parcel_snapshot_id,parcel_provider,provider_parcel_id,parcel_name,apn,address,jurisdiction,zoning_code,geometry,centroid,bbox,provider_path,provider_context,geometry_source,source_recorded_at,source_last_refreshed_at,metadata,selection_role,anchor_status,status,selected_at,updated_at",
    )
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .returns<ProjectParcelSelectionRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapProjectParcelSelection);
}

export async function upsertProjectParcelSelection(
  supabase: SupabaseClient,
  input: UpsertProjectParcelSelectionInput,
) {
  const { data, error } = await supabase
    .from("project_parcel_selection")
    .upsert(
      {
        project_id: input.projectId,
        parcel_snapshot_id: input.parcelSnapshotId ?? null,
        parcel_provider: input.parcelProvider,
        provider_parcel_id: input.providerParcelId,
        parcel_name: input.parcelName ?? null,
        apn: input.apn ?? null,
        address: input.address ?? null,
        jurisdiction: input.jurisdiction ?? null,
        zoning_code: input.zoningCode ?? null,
        geometry: input.geometry ?? null,
        centroid: input.centroid ?? null,
        bbox: input.bbox ?? null,
        provider_path: input.providerPath ?? null,
        provider_context: input.providerContext ?? null,
        geometry_source: input.geometrySource ?? "provider",
        source_recorded_at: input.sourceRecordedAt ?? new Date().toISOString(),
        source_last_refreshed_at: input.sourceLastRefreshedAt ?? new Date().toISOString(),
        metadata: input.metadata ?? {},
        selection_role: input.selectionRole ?? "primary",
        anchor_status: input.anchorStatus ?? "active",
        status: input.status ?? "attached",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,selection_role" },
    )
    .select(
      "id,project_id,parcel_snapshot_id,parcel_provider,provider_parcel_id,parcel_name,apn,address,jurisdiction,zoning_code,geometry,centroid,bbox,provider_path,provider_context,geometry_source,source_recorded_at,source_last_refreshed_at,metadata,selection_role,anchor_status,status,selected_at,updated_at",
    )
    .single<ProjectParcelSelectionRow>();

  if (error) throw error;
  return mapProjectParcelSelection(data);
}

export async function deleteProjectParcelSelectionBySnapshot(
  supabase: SupabaseClient,
  input: { projectId: string; parcelSnapshotId: string },
) {
  const { error } = await supabase
    .from("project_parcel_selection")
    .delete()
    .eq("project_id", input.projectId)
    .eq("parcel_snapshot_id", input.parcelSnapshotId);

  if (error) throw error;
}
