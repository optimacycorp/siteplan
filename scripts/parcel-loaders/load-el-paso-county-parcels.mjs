import { queryArcgisLayer } from "./lib/arcgisQuery.mjs";
import { detectFieldMapping, normalizeParcelFeature } from "./lib/normalizeParcelFeature.mjs";
import { upsertParcel } from "./lib/upsertParcel.mjs";

export const EL_PASO_COUNTY_PARCELS = {
  sourceKey: "co-el-paso-county-parcels",
  sourceName: "El Paso County GIS Parcels",
  providerType: "arcgis_rest",
  serviceUrl: "https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/Parcels/MapServer/0",
  sourceWkid: 2232,
  targetSrid: 4326,
  pageSize: 1000,
  idFieldCandidates: ["OBJECTID", "FID", "PARCEL_ID", "SCHEDULE"],
  parcelNumberCandidates: ["PARCEL", "PARCEL_NO", "PARCEL_NUM", "SCHEDULE", "ACCOUNT"],
  addressCandidates: ["SITUS", "SITEADDR", "ADDRESS", "PROP_ADDR"],
  ownerCandidates: ["OWNER", "OWNER_NAME", "TAXPAYER"],
  legalCandidates: ["LEGAL", "LEGAL_DESC"],
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: 25,
    all: false,
    bbox: null,
    changedSince: "",
    pageSize: EL_PASO_COUNTY_PARCELS.pageSize,
    maxPages: 50,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--all") args.all = true;
    if (arg === "--limit") args.limit = Number(argv[index + 1] || args.limit);
    if (arg === "--page-size") args.pageSize = Number(argv[index + 1] || args.pageSize);
    if (arg === "--max-pages") args.maxPages = Number(argv[index + 1] || args.maxPages);
    if (arg === "--bbox") {
      args.bbox = String(argv[index + 1] || "")
        .split(",")
        .map((value) => Number(value.trim()));
    }
    if (arg === "--changed-since") args.changedSince = String(argv[index + 1] || "");
  }

  if (args.all) {
    args.limit = Number.POSITIVE_INFINITY;
  }

  return args;
}

async function ensureSourceRecord(config) {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return;

  await fetch(`${supabaseUrl}/rest/v1/parcel_sources?on_conflict=source_key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      source_key: config.sourceKey,
      source_name: config.sourceName,
      source_url: config.serviceUrl,
      jurisdiction: "county",
      state: "CO",
      county: "El Paso",
      provider_type: config.providerType,
      refresh_mode: "manual",
    }),
  });
}

async function createImportRun({ supabaseUrl, serviceRoleKey, mode, metadata }) {
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/parcel_import_runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      source_key: EL_PASO_COUNTY_PARCELS.sourceKey,
      status: "running",
      mode,
      metadata,
    }),
  });

  if (!response.ok) return null;
  const payload = await response.json().catch(() => []);
  return Array.isArray(payload) && payload[0]?.id ? String(payload[0].id) : null;
}

async function updateImportRun({ supabaseUrl, serviceRoleKey, id, status, fetchedCount, upsertedCount, errorMessage }) {
  if (!supabaseUrl || !serviceRoleKey || !id) return;

  await fetch(`${supabaseUrl}/rest/v1/parcel_import_runs?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      status,
      finished_at: new Date().toISOString(),
      fetched_count: fetchedCount,
      upserted_count: upsertedCount,
      error_message: errorMessage || null,
    }),
  }).catch(() => {});
}

async function loadFeatures(config, args) {
  const features = [];
  let offset = 0;
  let pageCount = 0;
  let format = "geojson";
  let lastRaw = null;

  while (pageCount < args.maxPages && features.length < args.limit) {
    const remaining = Number.isFinite(args.limit)
      ? Math.max(0, args.limit - features.length)
      : args.pageSize;
    const pageLimit = Math.max(1, Math.min(args.pageSize, remaining || args.pageSize));

    const page = await queryArcgisLayer(config, {
      limit: pageLimit,
      offset,
      bbox: Array.isArray(args.bbox) && args.bbox.length === 4 ? args.bbox : null,
      changedSince: args.changedSince,
    });

    format = page.format;
    lastRaw = page.raw;
    features.push(...page.features);
    pageCount += 1;

    if (page.features.length < pageLimit) {
      break;
    }

    offset += page.features.length;
  }

  return {
    features,
    format,
    raw: lastRaw,
    pageCount,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const page = await loadFeatures(EL_PASO_COUNTY_PARCELS, args);

  const sampleFeature = page.features[0] ?? null;
  const fieldMapping = sampleFeature
    ? detectFieldMapping(EL_PASO_COUNTY_PARCELS, sampleFeature.properties ?? {})
    : {};
  const normalized = sampleFeature
    ? normalizeParcelFeature(sampleFeature, EL_PASO_COUNTY_PARCELS, fieldMapping)
    : null;

  console.log(JSON.stringify({
    dryRun: args.dryRun,
    fetchedCount: page.features.length,
    format: page.format,
    pageCount: page.pageCount,
    geometryType: sampleFeature?.geometry?.type || null,
    detectedFieldMapping: fieldMapping,
    sampleNormalizedRecord: normalized,
  }, null, 2));

  if (args.dryRun) {
    return;
  }

  await ensureSourceRecord(EL_PASO_COUNTY_PARCELS);

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for non-dry-run loads.");
  }

  const importRunId = await createImportRun({
    supabaseUrl,
    serviceRoleKey,
    mode: args.bbox ? "on_demand" : "manual",
    metadata: {
      bbox: args.bbox,
      changedSince: args.changedSince || null,
      requestedLimit: Number.isFinite(args.limit) ? args.limit : null,
      pageSize: args.pageSize,
      pageCount: page.pageCount,
    },
  });

  let upsertedCount = 0;
  try {
    for (const feature of page.features) {
      const record = normalizeParcelFeature(feature, EL_PASO_COUNTY_PARCELS, fieldMapping);
      if (!record.geometry || !record.external_id) {
        continue;
      }
      await upsertParcel({ supabaseUrl, serviceRoleKey, parcel: record });
      upsertedCount += 1;
    }

    await updateImportRun({
      supabaseUrl,
      serviceRoleKey,
      id: importRunId,
      status: "succeeded",
      fetchedCount: page.features.length,
      upsertedCount,
    });
  } catch (error) {
    await updateImportRun({
      supabaseUrl,
      serviceRoleKey,
      id: importRunId,
      status: "failed",
      fetchedCount: page.features.length,
      upsertedCount,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  console.log(JSON.stringify({
    fetchedCount: page.features.length,
    upsertedCount,
    pageCount: page.pageCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
