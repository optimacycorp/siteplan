#!/usr/bin/env node

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function optionalNumber(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDuration(ms) {
  return `${ms.toFixed(0)}ms`;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function summarizeRows(rows, limit = 2) {
  if (!Array.isArray(rows)) return rows;
  return rows.slice(0, limit).map((row) => {
    if (!row || typeof row !== "object") return row;
    const source =
      row.source_key ||
      row.sourceKey ||
      row.source ||
      row.provider ||
      null;
    const id =
      row.id ||
      row.ll_uuid ||
      row.llUuid ||
      row.external_id ||
      row.externalId ||
      null;
    const parcel =
      row.parcel_number ||
      row.parcelNumber ||
      row.apn ||
      null;
    const status = row.status || row.match_type || row.matchType || null;
    const summary = {};
    if (id) summary.id = id;
    if (source) summary.source = source;
    if (parcel) summary.parcel = parcel;
    if (status) summary.status = status;
    return Object.keys(summary).length ? summary : row;
  });
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const queryText = process.env.OPEN_PARCEL_KEEPALIVE_QUERY_TEXT || "733320000";
  const identifier = process.env.OPEN_PARCEL_KEEPALIVE_IDENTIFIER || "7333200002";
  const lng = optionalNumber("OPEN_PARCEL_KEEPALIVE_LNG", -104.897322);
  const lat = optionalNumber("OPEN_PARCEL_KEEPALIVE_LAT", 38.87837);
  const pointToleranceMeters = optionalNumber("OPEN_PARCEL_POINT_TOLERANCE_METERS", 25);
  const neighborRadiusMeters = optionalNumber("OPEN_PARCEL_NEIGHBOR_RADIUS_METERS", 150);
  const neighborLimit = optionalNumber("OPEN_PARCEL_NEIGHBOR_LIMIT", 5);
  const timeoutMs = optionalNumber("OPEN_PARCEL_KEEPALIVE_TIMEOUT_MS", 20000);

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const checks = [];

  async function runCheck(name, execute, options = {}) {
    const startedAt = Date.now();
    try {
      const data = await execute();
      const durationMs = Date.now() - startedAt;
      const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      const entry = {
        name,
        ok: true,
        durationMs,
        rowCount,
        sample: options.sample === false ? undefined : summarizeRows(data),
      };
      checks.push(entry);
      console.log(`[ok] ${name} ${formatDuration(durationMs)} rows=${rowCount}`);
      return data;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const entry = {
        name,
        ok: false,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      };
      checks.push(entry);
      console.error(`[fail] ${name} ${formatDuration(durationMs)} ${entry.error}`);
      throw error;
    }
  }

  async function restGet(path) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(`REST ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
    }
    return payload;
  }

  async function rpc(functionName, payload) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await readJson(response);
    if (!response.ok) {
      throw new Error(`RPC ${functionName} failed (${response.status}): ${JSON.stringify(result)}`);
    }
    return result;
  }

  try {
    console.log(`Starting Supabase keepalive against ${supabaseUrl}`);

    await runCheck(
      "parcel_sources.select",
      () => restGet("/rest/v1/parcel_sources?select=source_key&limit=3"),
    );

    const parcelRows = await runCheck(
      "parcels.select",
      () => restGet("/rest/v1/parcels?select=id,ll_uuid,source_key,external_id,parcel_number,apn,county,state&limit=3"),
    );

    await runCheck(
      "parcel_import_runs.select",
      () =>
        restGet(
          "/rest/v1/parcel_import_runs?select=id,source_key,status,mode,started_at&order=started_at.desc&limit=3",
        ),
    );

    const textMatches = await runCheck(
      "rpc.search_open_parcels_text",
      () => rpc("search_open_parcels_text", { p_query: queryText, p_limit: 3 }),
    );

    const idMatches = await runCheck(
      "rpc.search_open_parcel_by_identifier",
      () => rpc("search_open_parcel_by_identifier", { p_identifier: identifier, p_limit: 3 }),
    );

    const pointMatches = await runCheck(
      "rpc.lookup_parcel_by_point",
      () =>
        rpc("lookup_parcel_by_point", {
          p_lng: lng,
          p_lat: lat,
          p_tolerance_meters: pointToleranceMeters,
        }),
    );

    const detailId =
      idMatches?.[0]?.id ||
      pointMatches?.[0]?.id ||
      textMatches?.[0]?.id ||
      parcelRows?.[0]?.id ||
      null;

    if (detailId) {
      await runCheck(
        "rpc.get_open_parcel_detail",
        () => rpc("get_open_parcel_detail", { p_id: detailId }),
      );
    } else {
      checks.push({
        name: "rpc.get_open_parcel_detail",
        ok: true,
        durationMs: 0,
        rowCount: 0,
        sample: "skipped: no parcel id available from earlier checks",
      });
      console.log("[ok] rpc.get_open_parcel_detail skipped (no parcel id available)");
    }

    await runCheck(
      "rpc.lookup_open_parcel_neighbors",
      () =>
        rpc("lookup_open_parcel_neighbors", {
          p_lng: lng,
          p_lat: lat,
          p_exclude_id: null,
          p_radius_meters: neighborRadiusMeters,
          p_limit: neighborLimit,
        }),
    );

    const summary = {
      ok: true,
      checkedAt: new Date().toISOString(),
      supabaseUrl,
      checks,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase keepalive failed: ${message}`);
  process.exitCode = 1;
});
