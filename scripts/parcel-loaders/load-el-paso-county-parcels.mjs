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
  apnCandidates: ["APN", "PARCEL", "PARCEL_NO", "PARCEL_NUM", "ACCOUNT"],
  scheduleCandidates: ["SCHEDULE", "SCHEDULE_NO", "SCHEDNUM", "PARCEL"],
  addressCandidates: ["SITUS", "SITEADDR", "ADDRESS", "PROP_ADDR"],
  ownerCandidates: ["OWNER", "OWNER_NAME", "TAXPAYER"],
  legalCandidates: ["LEGAL", "LEGAL_DESC"],
  zoningCandidates: ["ZONING", "ZONE", "ZONECLASS", "ZONE_DESC"],
  landUseCandidates: ["LANDUSE", "LAND_USE", "USE_CODE", "USE_DESC"],
  sourceUrlCandidates: ["HYPERLINK", "URL", "SOURCE_URL", "PROPERTY_URL"],
};

const IMPORT_PRESETS = {
  "cedar-heights-rampart": {
    description: "Cedar Heights / Rampart Range corridor around the current Colorado Springs target parcels.",
    bbox: [-104.905, 38.874, -104.894, 38.881],
    limit: 750,
    pageSize: 100,
    maxPages: 10,
  },
  "cedar-heights-broad": {
    description: "Broader Cedar Heights area for nearby parcel candidates and surrounding roads.",
    bbox: [-104.915, 38.868, -104.888, 38.890],
    limit: 1500,
    pageSize: 150,
    maxPages: 15,
  },
  "rampart-click-7333200002": {
    description: "Tight import around the clicked parcel 7333200002 and adjacent parcels.",
    around: [38.87837, -104.897322],
    radiusMeters: 300,
    limit: 600,
    pageSize: 100,
    maxPages: 10,
  },
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    listPresets: false,
    preset: "",
    limit: 25,
    all: false,
    bbox: null,
    changedSince: "",
    parcelId: "",
    around: null,
    radiusMeters: 120,
    pageSize: EL_PASO_COUNTY_PARCELS.pageSize,
    maxPages: 50,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--list-presets") args.listPresets = true;
    if (arg === "--all") args.all = true;
    if (arg === "--preset") args.preset = String(argv[index + 1] || "").trim();
    if (arg === "--limit") args.limit = Number(argv[index + 1] || args.limit);
    if (arg === "--page-size") args.pageSize = Number(argv[index + 1] || args.pageSize);
    if (arg === "--max-pages") args.maxPages = Number(argv[index + 1] || args.maxPages);
    if (arg === "--parcel-id") args.parcelId = String(argv[index + 1] || "").trim();
    if (arg === "--around") {
      args.around = String(argv[index + 1] || "")
        .split(",")
        .map((value) => Number(value.trim()));
    }
    if (arg === "--radius-meters") args.radiusMeters = Number(argv[index + 1] || args.radiusMeters);
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

  if (args.preset) {
    const preset = IMPORT_PRESETS[args.preset];
    if (!preset) {
      throw new Error(`Unknown preset "${args.preset}". Use --list-presets to see available presets.`);
    }
    if (!args.bbox && preset.bbox) args.bbox = [...preset.bbox];
    if (!args.around && preset.around) args.around = [...preset.around];
    if ((!args.radiusMeters || args.radiusMeters === 120) && preset.radiusMeters) args.radiusMeters = preset.radiusMeters;
    if (args.limit === 25 && Number.isFinite(preset.limit)) args.limit = preset.limit;
    if (args.pageSize === EL_PASO_COUNTY_PARCELS.pageSize && Number.isFinite(preset.pageSize)) args.pageSize = preset.pageSize;
    if (args.maxPages === 50 && Number.isFinite(preset.maxPages)) args.maxPages = preset.maxPages;
  }

  return args;
}

function bboxFromPoint(lat, lng, radiusMeters) {
  const safeRadius = Math.max(25, Number(radiusMeters || 0));
  const latDelta = safeRadius / 111320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta = safeRadius / (111320 * Math.max(0.2, cosLat));
  return [
    Number((lng - lngDelta).toFixed(6)),
    Number((lat - latDelta).toFixed(6)),
    Number((lng + lngDelta).toFixed(6)),
    Number((lat + latDelta).toFixed(6)),
  ];
}

function escapeSqlLiteral(value) {
  return String(value || "").replace(/'/g, "''");
}

function buildParcelIdVariants(parcelId) {
  const raw = String(parcelId || "").trim().toUpperCase();
  const compact = raw.replace(/[^0-9A-Z]/g, "");
  const variants = new Set([raw, compact].filter(Boolean));

  if (/^\d{10}$/.test(compact)) {
    variants.add(`${compact.slice(0, 5)}-${compact.slice(5, 7)}-${compact.slice(7)}`);
    variants.add(`${compact.slice(0, 5)} ${compact.slice(5, 7)} ${compact.slice(7)}`);
  }

  if (/^\d{9}$/.test(compact)) {
    variants.add(`${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6)}`);
    variants.add(`${compact.slice(0, 3)} ${compact.slice(3, 6)} ${compact.slice(6)}`);
  }

  return Array.from(variants);
}

function buildParcelIdWhere(config, parcelId) {
  const normalized = String(parcelId || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  const variants = buildParcelIdVariants(parcelId);
  if (!normalized && !variants.length) return "";

  const exactVariantClauses = [];
  const normalizedClauses = [];

  for (const fieldName of config.parcelNumberCandidates) {
    normalizedClauses.push(
      `REPLACE(REPLACE(REPLACE(UPPER(${fieldName}), ' ', ''), '-', ''), '.', '') = '${escapeSqlLiteral(normalized)}'`,
    );

    for (const variant of variants) {
      exactVariantClauses.push(`${fieldName} = '${escapeSqlLiteral(variant)}'`);
      exactVariantClauses.push(`UPPER(${fieldName}) = '${escapeSqlLiteral(variant)}'`);
    }
  }

  const hyperlinkClauses = [];
  if (normalized) {
    hyperlinkClauses.push(`HYPERLINK LIKE '%${escapeSqlLiteral(normalized)}%'`);
  }
  for (const variant of variants) {
    hyperlinkClauses.push(`HYPERLINK LIKE '%${escapeSqlLiteral(variant)}%'`);
  }

  return [
    ...normalizedClauses,
    ...exactVariantClauses,
    ...hyperlinkClauses,
  ].join(" OR ");
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
  const effectiveBbox = Array.isArray(args.bbox) && args.bbox.length === 4
    ? args.bbox
    : Array.isArray(args.around) && args.around.length === 2
      ? bboxFromPoint(args.around[0], args.around[1], args.radiusMeters)
      : null;
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
      bbox: effectiveBbox,
      changedSince: args.changedSince,
      where: args.parcelId ? buildParcelIdWhere(config, args.parcelId) : "",
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
  if (args.listPresets) {
    console.log(JSON.stringify({
      presets: Object.entries(IMPORT_PRESETS).map(([key, preset]) => ({
        key,
        ...preset,
      })),
    }, null, 2));
    return;
  }
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
    preset: args.preset || null,
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
      preset: args.preset || null,
      bbox: args.bbox,
      around: args.around,
      radiusMeters: args.radiusMeters,
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
