import type { SupabaseClient } from "@supabase/supabase-js";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TitleCommitmentRecord = {
  id: string;
  projectId: string;
  parcelSnapshotId: string | null;
  primaryDocumentId: string | null;
  isPrimary: boolean;
  title: string;
  orderNumber: string;
  commitmentNumber: string;
  dateOfIssue: string | null;
  effectiveDate: string | null;
  effectiveTimestamp: string | null;
  propertyAddress: string;
  issuingCompany: string;
  fullPropertyDescription: string;
  status: string;
  importStatus: string;
  importError: string;
  childLinkCount: number;
  childFetchSuccessCount: number;
  childFetchFailureCount: number;
  notes: string;
  metadata: Record<string, Json>;
  createdAt: string;
  updatedAt: string;
};

export type TitleLinkedDocumentRecord = {
  id: string;
  projectDocumentId: string;
  titleCommitmentId: string;
  relationType: string;
  sourceReference: string;
  sourcePageNumber: number | null;
  sourceReferenceText: string;
  externalReference: string;
  notes: string;
  metadata: Record<string, Json>;
  createdAt: string;
};

export type TitleCommitmentReferenceRecord = {
  id: string;
  titleCommitmentId: string;
  expectedDocumentType: string;
  referenceText: string;
  referenceKey: string;
  briefDescription: string;
  scheduleSection: string;
  sourcePage: number | null;
  sourceSection: string;
  linkUrl: string;
  visitStatus: string;
  fetchStatus: string;
  fetchError: string;
  matchConfidence: number | null;
  visitedProjectDocumentId: string | null;
  metadata: Record<string, Json>;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentRecord = {
  id: string;
  projectId: string;
  title: string;
  documentType: string;
  documentRole: string;
  status: string;
  storagePath: string | null;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  externalReference: string;
  parentDocumentId: string | null;
  sourceCommitmentId: string | null;
  sourcePageNumber: number | null;
  sourceReferenceText: string;
  metadata: Record<string, Json>;
  updatedAt: string;
};

export type TitleCommitmentImportJobRecord = {
  id: string;
  projectId: string;
  titleCommitmentId: string;
  primaryDocumentId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string;
  stats: Record<string, Json>;
  createdAt: string;
  updatedAt: string;
};

type TitleCommitmentRow = {
  id: string;
  project_id: string;
  parcel_snapshot_id: string | null;
  primary_document_id: string | null;
  is_primary: boolean | null;
  title: string;
  order_number: string | null;
  commitment_number: string | null;
  date_of_issue: string | null;
  effective_date: string | null;
  effective_timestamp: string | null;
  property_address: string | null;
  issuing_company: string | null;
  full_property_description: string | null;
  status: string;
  import_status: string;
  import_error: string | null;
  child_link_count: number | null;
  child_fetch_success_count: number | null;
  child_fetch_failure_count: number | null;
  notes: string | null;
  metadata: Record<string, Json> | null;
  created_at: string;
  updated_at: string;
};

type TitleCommitmentLinkRow = {
  id: string;
  title_commitment_id: string;
  project_document_id: string;
  relation_type: string;
  source_reference: string | null;
  source_page_number: number | null;
  source_reference_text: string | null;
  external_reference: string | null;
  notes: string | null;
  metadata: Record<string, Json> | null;
  created_at: string;
};

type ProjectDocumentRow = {
  id: string;
  project_id: string;
  title: string;
  document_type: string;
  document_role: string;
  status: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  external_reference: string | null;
  parent_document_id: string | null;
  source_commitment_id: string | null;
  source_page_number: number | null;
  source_reference_text: string | null;
  metadata: Record<string, Json> | null;
  updated_at: string;
};

type TitleCommitmentReferenceRow = {
  id: string;
  title_commitment_id: string;
  expected_document_type: string;
  reference_text: string;
  reference_key: string;
  brief_description: string | null;
  schedule_section: string | null;
  source_page: number | null;
  source_section: string | null;
  link_url: string | null;
  visit_status: string;
  fetch_status: string;
  fetch_error: string | null;
  match_confidence: number | null;
  visited_project_document_id: string | null;
  metadata: Record<string, Json> | null;
  created_at: string;
  updated_at: string;
};

type TitleCommitmentImportJobRow = {
  id: string;
  project_id: string;
  title_commitment_id: string;
  primary_document_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  stats: Record<string, Json> | null;
  created_at: string;
  updated_at: string;
};

export type TitleWorkspaceData = {
  commitments: TitleCommitmentRecord[];
  linkedDocuments: TitleLinkedDocumentRecord[];
  documents: ProjectDocumentRecord[];
  references: TitleCommitmentReferenceRecord[];
  importJobs: TitleCommitmentImportJobRecord[];
};

export type CreateTitleCommitmentInput = {
  projectId: string;
  parcelSnapshotId?: string | null;
  primaryDocumentId?: string | null;
  isPrimary?: boolean;
  title: string;
  orderNumber?: string;
  commitmentNumber?: string;
  dateOfIssue?: string | null;
  effectiveDate?: string | null;
  effectiveTimestamp?: string | null;
  propertyAddress?: string;
  issuingCompany?: string;
  fullPropertyDescription?: string;
  status?: string;
  importStatus?: string;
  importError?: string;
  childLinkCount?: number;
  childFetchSuccessCount?: number;
  childFetchFailureCount?: number;
  notes?: string;
  metadata?: Record<string, Json>;
};

export type CreateProjectDocumentInput = {
  projectId: string;
  title: string;
  documentType: string;
  documentRole?: string;
  status?: string;
  storagePath?: string | null;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  externalReference?: string;
  parentDocumentId?: string | null;
  sourceCommitmentId?: string | null;
  sourcePageNumber?: number | null;
  sourceReferenceText?: string;
  metadata?: Record<string, Json>;
};

export type LinkTitleDocumentInput = {
  titleCommitmentId: string;
  projectDocumentId: string;
  relationType: string;
  sourceReference?: string;
  sourcePageNumber?: number | null;
  sourceReferenceText?: string;
  externalReference?: string;
  notes?: string;
  metadata?: Record<string, Json>;
};

export type CreateTitleCommitmentReferenceInput = {
  titleCommitmentId: string;
  expectedDocumentType: string;
  referenceText: string;
  referenceKey: string;
  briefDescription?: string;
  scheduleSection?: string;
  sourcePage?: number | null;
  sourceSection?: string;
  linkUrl?: string;
  visitStatus?: string;
  fetchStatus?: string;
  fetchError?: string;
  matchConfidence?: number | null;
  visitedProjectDocumentId?: string | null;
  metadata?: Record<string, Json>;
};

export type MarkTitleReferenceVisitedInput = {
  referenceId: string;
  visitedProjectDocumentId: string;
  visitStatus?: string;
  fetchStatus?: string;
  fetchError?: string;
  metadata?: Record<string, Json>;
};

export type UpdateTitleCommitmentInput = {
  titleCommitmentId: string;
  primaryDocumentId?: string | null;
  parcelSnapshotId?: string | null;
  title?: string;
  orderNumber?: string;
  commitmentNumber?: string;
  dateOfIssue?: string | null;
  effectiveDate?: string | null;
  effectiveTimestamp?: string | null;
  propertyAddress?: string;
  issuingCompany?: string;
  fullPropertyDescription?: string;
  status?: string;
  importStatus?: string;
  importError?: string;
  childLinkCount?: number;
  childFetchSuccessCount?: number;
  childFetchFailureCount?: number;
  notes?: string;
  isPrimary?: boolean;
  metadata?: Record<string, Json>;
};

export type UpdateTitleCommitmentReferenceInput = {
  referenceId: string;
  expectedDocumentType?: string;
  referenceText?: string;
  referenceKey?: string;
  briefDescription?: string;
  scheduleSection?: string;
  sourcePage?: number | null;
  sourceSection?: string;
  linkUrl?: string;
  visitStatus?: string;
  fetchStatus?: string;
  fetchError?: string;
  matchConfidence?: number | null;
  visitedProjectDocumentId?: string | null;
  metadata?: Record<string, Json>;
};

function mapCommitment(row: TitleCommitmentRow): TitleCommitmentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    parcelSnapshotId: row.parcel_snapshot_id,
    primaryDocumentId: row.primary_document_id,
    isPrimary: row.is_primary ?? false,
    title: row.title,
    orderNumber: row.order_number ?? "",
    commitmentNumber: row.commitment_number ?? "",
    dateOfIssue: row.date_of_issue,
    effectiveDate: row.effective_date,
    effectiveTimestamp: row.effective_timestamp,
    propertyAddress: row.property_address ?? "",
    issuingCompany: row.issuing_company ?? "",
    fullPropertyDescription: row.full_property_description ?? "",
    status: row.status,
    importStatus: row.import_status,
    importError: row.import_error ?? "",
    childLinkCount: row.child_link_count ?? 0,
    childFetchSuccessCount: row.child_fetch_success_count ?? 0,
    childFetchFailureCount: row.child_fetch_failure_count ?? 0,
    notes: row.notes ?? "",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLinkedDocument(row: TitleCommitmentLinkRow): TitleLinkedDocumentRecord {
  return {
    id: row.id,
    projectDocumentId: row.project_document_id,
    titleCommitmentId: row.title_commitment_id,
    relationType: row.relation_type,
    sourceReference: row.source_reference ?? "",
    sourcePageNumber: row.source_page_number,
    sourceReferenceText: row.source_reference_text ?? "",
    externalReference: row.external_reference ?? "",
    notes: row.notes ?? "",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function mapProjectDocument(row: ProjectDocumentRow): ProjectDocumentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    documentType: row.document_type,
    documentRole: row.document_role,
    status: row.status,
    storagePath: row.storage_path,
    fileName: row.file_name ?? "",
    mimeType: row.mime_type ?? "",
    fileSizeBytes: row.file_size_bytes ?? 0,
    externalReference: row.external_reference ?? "",
    parentDocumentId: row.parent_document_id,
    sourceCommitmentId: row.source_commitment_id,
    sourcePageNumber: row.source_page_number,
    sourceReferenceText: row.source_reference_text ?? "",
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at,
  };
}

function mapTitleCommitmentReference(row: TitleCommitmentReferenceRow): TitleCommitmentReferenceRecord {
  return {
    id: row.id,
    titleCommitmentId: row.title_commitment_id,
    expectedDocumentType: row.expected_document_type,
    referenceText: row.reference_text,
    referenceKey: row.reference_key,
    briefDescription: row.brief_description ?? "",
    scheduleSection: row.schedule_section ?? "",
    sourcePage: row.source_page,
    sourceSection: row.source_section ?? "",
    linkUrl: row.link_url ?? "",
    visitStatus: row.visit_status,
    fetchStatus: row.fetch_status,
    fetchError: row.fetch_error ?? "",
    matchConfidence: row.match_confidence,
    visitedProjectDocumentId: row.visited_project_document_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapImportJob(row: TitleCommitmentImportJobRow): TitleCommitmentImportJobRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    titleCommitmentId: row.title_commitment_id,
    primaryDocumentId: row.primary_document_id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error ?? "",
    stats: row.stats ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTitleWorkspace(
  supabase: SupabaseClient,
  projectId: string,
): Promise<TitleWorkspaceData> {
  const [commitmentsRes, linksRes, docsRes, referencesRes, importJobsRes] = await Promise.all([
    supabase
      .from("title_commitments")
      .select("id,project_id,parcel_snapshot_id,primary_document_id,is_primary,title,order_number,commitment_number,date_of_issue,effective_date,effective_timestamp,property_address,issuing_company,full_property_description,status,import_status,import_error,child_link_count,child_fetch_success_count,child_fetch_failure_count,notes,metadata,created_at,updated_at")
      .eq("project_id", projectId)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false })
      .returns<TitleCommitmentRow[]>(),
    supabase
      .from("title_commitment_document_links")
      .select("id,title_commitment_id,project_document_id,relation_type,source_reference,source_page_number,source_reference_text,external_reference,notes,metadata,created_at")
      .returns<TitleCommitmentLinkRow[]>(),
    supabase
      .from("project_documents")
      .select("id,project_id,title,document_type,document_role,status,storage_path,file_name,mime_type,file_size_bytes,external_reference,parent_document_id,source_commitment_id,source_page_number,source_reference_text,metadata,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .returns<ProjectDocumentRow[]>(),
    supabase
      .from("title_commitment_references")
      .select("id,title_commitment_id,expected_document_type,reference_text,reference_key,brief_description,schedule_section,source_page,source_section,link_url,visit_status,fetch_status,fetch_error,match_confidence,visited_project_document_id,metadata,created_at,updated_at")
      .returns<TitleCommitmentReferenceRow[]>(),
    supabase
      .from("title_commitment_import_jobs")
      .select("id,project_id,title_commitment_id,primary_document_id,status,started_at,finished_at,error,stats,created_at,updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .returns<TitleCommitmentImportJobRow[]>(),
  ]);

  if (commitmentsRes.error) throw commitmentsRes.error;
  if (linksRes.error) throw linksRes.error;
  if (docsRes.error) throw docsRes.error;
  if (referencesRes.error) throw referencesRes.error;
  if (importJobsRes.error) throw importJobsRes.error;

  const commitmentIds = new Set((commitmentsRes.data ?? []).map((row) => row.id));

  return {
    commitments: (commitmentsRes.data ?? []).map(mapCommitment),
    linkedDocuments: (linksRes.data ?? [])
      .filter((row) => commitmentIds.has(row.title_commitment_id))
      .map(mapLinkedDocument),
    documents: (docsRes.data ?? []).map(mapProjectDocument),
    references: (referencesRes.data ?? [])
      .filter((row) => commitmentIds.has(row.title_commitment_id))
      .map(mapTitleCommitmentReference),
    importJobs: (importJobsRes.data ?? [])
      .filter((row) => commitmentIds.has(row.title_commitment_id))
      .map(mapImportJob),
  };
}

export async function createProjectDocument(
  supabase: SupabaseClient,
  input: CreateProjectDocumentInput,
): Promise<ProjectDocumentRecord> {
  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: input.projectId,
      title: input.title,
      document_type: input.documentType,
      document_role: input.documentRole ?? "supporting",
      status: input.status ?? "uploaded",
      storage_path: input.storagePath ?? null,
      file_name: input.fileName ?? null,
      mime_type: input.mimeType ?? null,
      file_size_bytes: input.fileSizeBytes ?? null,
      external_reference: input.externalReference ?? null,
      parent_document_id: input.parentDocumentId ?? null,
      source_commitment_id: input.sourceCommitmentId ?? null,
      source_page_number: input.sourcePageNumber ?? null,
      source_reference_text: input.sourceReferenceText ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id,project_id,title,document_type,document_role,status,storage_path,file_name,mime_type,file_size_bytes,external_reference,parent_document_id,source_commitment_id,source_page_number,source_reference_text,metadata,updated_at")
    .single<ProjectDocumentRow>();

  if (error) throw error;
  return mapProjectDocument(data);
}

export async function createTitleCommitment(
  supabase: SupabaseClient,
  input: CreateTitleCommitmentInput,
): Promise<TitleCommitmentRecord> {
  const { data, error } = await supabase
    .from("title_commitments")
    .insert({
      project_id: input.projectId,
      parcel_snapshot_id: input.parcelSnapshotId ?? null,
      primary_document_id: input.primaryDocumentId ?? null,
      is_primary: input.isPrimary ?? false,
      title: input.title,
      order_number: input.orderNumber ?? null,
      commitment_number: input.commitmentNumber ?? null,
      date_of_issue: input.dateOfIssue ?? null,
      effective_date: input.effectiveDate ?? null,
      effective_timestamp: input.effectiveTimestamp ?? null,
      property_address: input.propertyAddress ?? null,
      issuing_company: input.issuingCompany ?? null,
      full_property_description: input.fullPropertyDescription ?? null,
      status: input.status ?? "draft",
      import_status: input.importStatus ?? "queued",
      import_error: input.importError ?? null,
      child_link_count: input.childLinkCount ?? 0,
      child_fetch_success_count: input.childFetchSuccessCount ?? 0,
      child_fetch_failure_count: input.childFetchFailureCount ?? 0,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id,project_id,parcel_snapshot_id,primary_document_id,is_primary,title,order_number,commitment_number,date_of_issue,effective_date,effective_timestamp,property_address,issuing_company,full_property_description,status,import_status,import_error,child_link_count,child_fetch_success_count,child_fetch_failure_count,notes,metadata,created_at,updated_at")
    .single<TitleCommitmentRow>();

  if (error) throw error;
  return mapCommitment(data);
}

export async function updateTitleCommitmentPrimaryDocument(
  supabase: SupabaseClient,
  titleCommitmentId: string,
  primaryDocumentId: string,
): Promise<TitleCommitmentRecord> {
  const { data, error } = await supabase
    .from("title_commitments")
    .update({
      primary_document_id: primaryDocumentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", titleCommitmentId)
    .select("id,project_id,parcel_snapshot_id,primary_document_id,is_primary,title,order_number,commitment_number,date_of_issue,effective_date,effective_timestamp,property_address,issuing_company,full_property_description,status,import_status,import_error,child_link_count,child_fetch_success_count,child_fetch_failure_count,notes,metadata,created_at,updated_at")
    .single<TitleCommitmentRow>();

  if (error) throw error;
  return mapCommitment(data);
}

export async function updateTitleCommitment(
  supabase: SupabaseClient,
  input: UpdateTitleCommitmentInput,
): Promise<TitleCommitmentRecord> {
  const payload: Record<string, Json | string | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.primaryDocumentId !== undefined) payload.primary_document_id = input.primaryDocumentId;
  if (input.parcelSnapshotId !== undefined) payload.parcel_snapshot_id = input.parcelSnapshotId;
  if (input.title !== undefined) payload.title = input.title;
  if (input.orderNumber !== undefined) payload.order_number = input.orderNumber;
  if (input.commitmentNumber !== undefined) payload.commitment_number = input.commitmentNumber;
  if (input.dateOfIssue !== undefined) payload.date_of_issue = input.dateOfIssue;
  if (input.effectiveDate !== undefined) payload.effective_date = input.effectiveDate;
  if (input.effectiveTimestamp !== undefined) payload.effective_timestamp = input.effectiveTimestamp;
  if (input.propertyAddress !== undefined) payload.property_address = input.propertyAddress;
  if (input.issuingCompany !== undefined) payload.issuing_company = input.issuingCompany;
  if (input.fullPropertyDescription !== undefined) payload.full_property_description = input.fullPropertyDescription;
  if (input.status !== undefined) payload.status = input.status;
  if (input.importStatus !== undefined) payload.import_status = input.importStatus;
  if (input.importError !== undefined) payload.import_error = input.importError;
  if (input.childLinkCount !== undefined) payload.child_link_count = input.childLinkCount;
  if (input.childFetchSuccessCount !== undefined) payload.child_fetch_success_count = input.childFetchSuccessCount;
  if (input.childFetchFailureCount !== undefined) payload.child_fetch_failure_count = input.childFetchFailureCount;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.isPrimary !== undefined) payload.is_primary = input.isPrimary;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  const { data, error } = await supabase
    .from("title_commitments")
    .update(payload)
    .eq("id", input.titleCommitmentId)
    .select("id,project_id,parcel_snapshot_id,primary_document_id,is_primary,title,order_number,commitment_number,date_of_issue,effective_date,effective_timestamp,property_address,issuing_company,full_property_description,status,import_status,import_error,child_link_count,child_fetch_success_count,child_fetch_failure_count,notes,metadata,created_at,updated_at")
    .single<TitleCommitmentRow>();

  if (error) throw error;
  return mapCommitment(data);
}

export async function setPrimaryTitleCommitment(
  supabase: SupabaseClient,
  input: { projectId: string; titleCommitmentId: string },
): Promise<TitleCommitmentRecord> {
  const { error: clearError } = await supabase
    .from("title_commitments")
    .update({
      is_primary: false,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", input.projectId);

  if (clearError) throw clearError;

  return updateTitleCommitment(supabase, {
    titleCommitmentId: input.titleCommitmentId,
    isPrimary: true,
  });
}

export async function linkDocumentToTitleCommitment(
  supabase: SupabaseClient,
  input: LinkTitleDocumentInput,
): Promise<TitleLinkedDocumentRecord> {
  const { data, error } = await supabase
    .from("title_commitment_document_links")
    .insert({
      title_commitment_id: input.titleCommitmentId,
      project_document_id: input.projectDocumentId,
      relation_type: input.relationType,
      source_reference: input.sourceReference ?? null,
      source_page_number: input.sourcePageNumber ?? null,
      source_reference_text: input.sourceReferenceText ?? null,
      external_reference: input.externalReference ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id,title_commitment_id,project_document_id,relation_type,source_reference,source_page_number,source_reference_text,external_reference,notes,metadata,created_at")
    .single<TitleCommitmentLinkRow>();

  if (error) throw error;
  return mapLinkedDocument(data);
}

export async function createTitleCommitmentReference(
  supabase: SupabaseClient,
  input: CreateTitleCommitmentReferenceInput,
): Promise<TitleCommitmentReferenceRecord> {
  const { data, error } = await supabase
    .from("title_commitment_references")
    .insert({
      title_commitment_id: input.titleCommitmentId,
      expected_document_type: input.expectedDocumentType,
      reference_text: input.referenceText,
      reference_key: input.referenceKey,
      brief_description: input.briefDescription ?? null,
      schedule_section: input.scheduleSection ?? null,
      source_page: input.sourcePage ?? null,
      source_section: input.sourceSection ?? null,
      link_url: input.linkUrl ?? null,
      visit_status: input.visitStatus ?? "pending",
      fetch_status: input.fetchStatus ?? "pending",
      fetch_error: input.fetchError ?? null,
      match_confidence: input.matchConfidence ?? null,
      visited_project_document_id: input.visitedProjectDocumentId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id,title_commitment_id,expected_document_type,reference_text,reference_key,brief_description,schedule_section,source_page,source_section,link_url,visit_status,fetch_status,fetch_error,match_confidence,visited_project_document_id,metadata,created_at,updated_at")
    .single<TitleCommitmentReferenceRow>();

  if (error) throw error;
  return mapTitleCommitmentReference(data);
}

export async function updateTitleCommitmentReference(
  supabase: SupabaseClient,
  input: UpdateTitleCommitmentReferenceInput,
): Promise<TitleCommitmentReferenceRecord> {
  const payload: Record<string, Json | string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.expectedDocumentType !== undefined) payload.expected_document_type = input.expectedDocumentType;
  if (input.referenceText !== undefined) payload.reference_text = input.referenceText;
  if (input.referenceKey !== undefined) payload.reference_key = input.referenceKey;
  if (input.briefDescription !== undefined) payload.brief_description = input.briefDescription;
  if (input.scheduleSection !== undefined) payload.schedule_section = input.scheduleSection;
  if (input.sourcePage !== undefined) payload.source_page = input.sourcePage;
  if (input.sourceSection !== undefined) payload.source_section = input.sourceSection;
  if (input.linkUrl !== undefined) payload.link_url = input.linkUrl;
  if (input.visitStatus !== undefined) payload.visit_status = input.visitStatus;
  if (input.fetchStatus !== undefined) payload.fetch_status = input.fetchStatus;
  if (input.fetchError !== undefined) payload.fetch_error = input.fetchError;
  if (input.matchConfidence !== undefined) payload.match_confidence = input.matchConfidence;
  if (input.visitedProjectDocumentId !== undefined) payload.visited_project_document_id = input.visitedProjectDocumentId;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  const { data, error } = await supabase
    .from("title_commitment_references")
    .update(payload)
    .eq("id", input.referenceId)
    .select("id,title_commitment_id,expected_document_type,reference_text,reference_key,brief_description,schedule_section,source_page,source_section,link_url,visit_status,fetch_status,fetch_error,match_confidence,visited_project_document_id,metadata,created_at,updated_at")
    .single<TitleCommitmentReferenceRow>();

  if (error) throw error;
  return mapTitleCommitmentReference(data);
}

export async function markTitleCommitmentReferenceVisited(
  supabase: SupabaseClient,
  input: MarkTitleReferenceVisitedInput,
): Promise<TitleCommitmentReferenceRecord> {
  const { data, error } = await supabase
    .from("title_commitment_references")
    .update({
      visited_project_document_id: input.visitedProjectDocumentId,
      visit_status: input.visitStatus ?? "visited",
      fetch_status: input.fetchStatus ?? "stored",
      fetch_error: input.fetchError ?? null,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.referenceId)
    .select("id,title_commitment_id,expected_document_type,reference_text,reference_key,brief_description,schedule_section,source_page,source_section,link_url,visit_status,fetch_status,fetch_error,match_confidence,visited_project_document_id,metadata,created_at,updated_at")
    .single<TitleCommitmentReferenceRow>();

  if (error) throw error;
  return mapTitleCommitmentReference(data);
}

export async function deleteTitleCommitmentReference(
  supabase: SupabaseClient,
  referenceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("title_commitment_references")
    .delete()
    .eq("id", referenceId);

  if (error) throw error;
}

export async function unlinkTitleDocumentFromCommitment(
  supabase: SupabaseClient,
  linkId: string,
): Promise<void> {
  const { error } = await supabase
    .from("title_commitment_document_links")
    .delete()
    .eq("id", linkId);

  if (error) throw error;
}

export async function deleteTitleCommitment(
  supabase: SupabaseClient,
  projectId: string,
  titleCommitmentId: string,
): Promise<{ deletedId: string; nextActiveCommitmentId: string | null }> {
  const { data, error } = await supabase.rpc("delete_title_commitment_stack", {
    p_project_id: projectId,
    p_title_commitment_id: titleCommitmentId,
  });

  if (!error) {
    const result = Array.isArray(data) ? data[0] : data;
    return {
      deletedId: result?.deleted_id ?? titleCommitmentId,
      nextActiveCommitmentId: result?.next_active_commitment_id ?? null,
    };
  }

  const errorMessage = [
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ");

  const rpcUnavailable =
    errorMessage.includes("delete_title_commitment_stack")
    || errorMessage.includes("Could not find the function")
    || errorMessage.includes("does not exist");

  if (!rpcUnavailable) {
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("title_commitments")
    .delete()
    .eq("project_id", projectId)
    .eq("id", titleCommitmentId);

  if (deleteError) throw deleteError;

  const { data: remainingCommitments, error: remainingError } = await supabase
    .from("title_commitments")
    .select("id")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (remainingError) throw remainingError;

  return {
    deletedId: titleCommitmentId,
    nextActiveCommitmentId: remainingCommitments?.[0]?.id ?? null,
  };
}
