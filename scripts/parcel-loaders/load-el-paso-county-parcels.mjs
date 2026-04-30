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
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--all") args.all = true;
    if (arg === "--limit") args.limit = Number(argv[index + 1] || args.limit);
    if (arg === "--bbox") {
      args.bbox = String(argv[index + 1] || "")
        .split(",")
        .map((value) => Number(value.trim()));
    }
    if (arg === "--changed-since") args.changedSince = String(argv[index + 1] || "");
  }

  if (args.all) {
    args.limit = EL_PASO_COUNTY_PARCELS.pageSize;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const page = await queryArcgisLayer(EL_PASO_COUNTY_PARCELS, {
    limit: args.limit,
    bbox: Array.isArray(args.bbox) && args.bbox.length === 4 ? args.bbox : null,
    changedSince: args.changedSince,
  });

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

  let upsertedCount = 0;
  for (const feature of page.features) {
    const record = normalizeParcelFeature(feature, EL_PASO_COUNTY_PARCELS, fieldMapping);
    if (!record.geometry || !record.external_id) {
      continue;
    }
    await upsertParcel({ supabaseUrl, serviceRoleKey, parcel: record });
    upsertedCount += 1;
  }

  console.log(JSON.stringify({
    fetchedCount: page.features.length,
    upsertedCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
