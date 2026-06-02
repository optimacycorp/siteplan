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

function parseJsonEnv(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
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

function chooseRandom(items) {
  if (!Array.isArray(items) || !items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function coerceSeed(seed, fallback) {
  if (!seed || typeof seed !== "object") return fallback;
  const lng = Number(seed.lng);
  const lat = Number(seed.lat);
  return {
    name: String(seed.name || fallback.name),
    queryText: String(seed.queryText || fallback.queryText),
    identifier: String(seed.identifier || fallback.identifier),
    lng: Number.isFinite(lng) ? lng : fallback.lng,
    lat: Number.isFinite(lat) ? lat : fallback.lat,
  };
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const timeoutMs = optionalNumber("OPEN_PARCEL_KEEPALIVE_TIMEOUT_MS", 20000);
  const pointToleranceMeters = optionalNumber("OPEN_PARCEL_POINT_TOLERANCE_METERS", 25);
  const neighborRadiusMeters = optionalNumber("OPEN_PARCEL_NEIGHBOR_RADIUS_METERS", 150);
  const neighborLimit = optionalNumber("OPEN_PARCEL_NEIGHBOR_LIMIT", 5);
  const cleanupDays = optionalNumber("OPEN_PARCEL_KEEPALIVE_RETENTION_DAYS", 14);

  const defaultSeed = {
    name: "el-paso-default",
    queryText: process.env.OPEN_PARCEL_KEEPALIVE_QUERY_TEXT || "733320000",
    identifier: process.env.OPEN_PARCEL_KEEPALIVE_IDENTIFIER || "7333200002",
    lng: optionalNumber("OPEN_PARCEL_KEEPALIVE_LNG", -104.897322),
    lat: optionalNumber("OPEN_PARCEL_KEEPALIVE_LAT", 38.87837),
  };

  const seeds = parseJsonEnv("OPEN_PARCEL_KEEPALIVE_SEEDS_JSON", [defaultSeed])
    .map((seed) => coerceSeed(seed, defaultSeed))
    .filter(Boolean);
  const activeSeed = chooseRandom(seeds) || defaultSeed;

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const checks = [];
  const runToken = `keepalive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let keepaliveRunId = null;

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

  async function restGet(path, useRepresentation = false) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method: "GET",
      headers: useRepresentation ? headers : { ...headers, Prefer: undefined },
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(`REST ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
    }
    return payload;
  }

  async function restInsert(path, body) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(`INSERT ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
    }
    return payload;
  }

  async function restPatch(path, body) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(`PATCH ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
    }
    return payload;
  }

  async function restDelete(path) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method: "DELETE",
      headers: {
        ...headers,
        Prefer: "return=minimal",
      },
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(`DELETE ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
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
    console.log(`Starting Supabase exerciser against ${supabaseUrl}`);
    console.log(`Using seed ${activeSeed.name} (${activeSeed.lat}, ${activeSeed.lng})`);

    const insertedRuns = await runCheck(
      "parcel_import_runs.insert",
      () =>
        restInsert("/rest/v1/parcel_import_runs", {
          source_key: "siteplan-supabase-keepalive",
          status: "running",
          mode: "scheduled",
          started_at: new Date().toISOString(),
          fetched_count: 0,
          upserted_count: 0,
          metadata: {
            activity_type: "keepalive",
            origin: "siteplan-supabase-keepalive",
            run_token: runToken,
            seed_name: activeSeed.name,
            query_text: activeSeed.queryText,
            identifier: activeSeed.identifier,
            point: {
              lng: activeSeed.lng,
              lat: activeSeed.lat,
            },
          },
        }),
    );
    keepaliveRunId = insertedRuns?.[0]?.id || null;

    await runCheck(
      "parcel_sources.select",
      () => restGet("/rest/v1/parcel_sources?select=source_key,source_name,refresh_mode,county,state&limit=5"),
    );

    const parcelRows = await runCheck(
      "parcels.select",
      () =>
        restGet(
          "/rest/v1/parcels?select=id,source_key,external_id,parcel_number,apn,owner_name,situs_address,created_at,updated_at&order=updated_at.desc&limit=5",
        ),
    );

    await runCheck(
      "parcel_import_runs.select",
      () =>
        restGet(
          "/rest/v1/parcel_import_runs?select=id,source_key,status,mode,started_at,finished_at,metadata&order=started_at.desc&limit=5",
        ),
    );

    const randomizedLimit = Math.max(3, Math.min(10, 3 + Math.floor(Math.random() * 5)));

    const textMatches = await runCheck(
      "rpc.search_open_parcels_text",
      () => rpc("search_open_parcels_text", { p_query: activeSeed.queryText, p_limit: randomizedLimit }),
    );

    const idMatches = await runCheck(
      "rpc.search_open_parcel_by_identifier",
      () =>
        rpc("search_open_parcel_by_identifier", {
          p_identifier: activeSeed.identifier,
          p_limit: randomizedLimit,
        }),
    );

    const pointMatches = await runCheck(
      "rpc.lookup_parcel_by_point",
      () =>
        rpc("lookup_parcel_by_point", {
          p_lng: activeSeed.lng,
          p_lat: activeSeed.lat,
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
      await runCheck("rpc.get_open_parcel_detail", () => rpc("get_open_parcel_detail", { p_id: detailId }));
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
          p_lng: activeSeed.lng,
          p_lat: activeSeed.lat,
          p_exclude_id: detailId,
          p_radius_meters: neighborRadiusMeters,
          p_limit: neighborLimit,
        }),
    );

    if (keepaliveRunId) {
      await runCheck(
        "parcel_import_runs.update",
        () =>
          restPatch(`/rest/v1/parcel_import_runs?id=eq.${keepaliveRunId}`, {
            status: "succeeded",
            finished_at: new Date().toISOString(),
            fetched_count: checks.reduce((sum, check) => sum + (check.rowCount || 0), 0),
            upserted_count: checks.filter((check) => check.ok).length,
            metadata: {
              activity_type: "keepalive",
              origin: "siteplan-supabase-keepalive",
              run_token: runToken,
              seed_name: activeSeed.name,
              completed_checks: checks.length,
              successful_checks: checks.filter((check) => check.ok).length,
              random_limit: randomizedLimit,
              query_text: activeSeed.queryText,
              identifier: activeSeed.identifier,
              point: {
                lng: activeSeed.lng,
                lat: activeSeed.lat,
              },
            },
          }),
      );
    }

    if (cleanupDays > 0) {
      const cutoff = new Date(Date.now() - cleanupDays * 24 * 60 * 60 * 1000).toISOString();
      await runCheck(
        "parcel_import_runs.cleanup_old_keepalive_rows",
        () =>
          restDelete(
            `/rest/v1/parcel_import_runs?source_key=eq.siteplan-supabase-keepalive&started_at=lt.${encodeURIComponent(cutoff)}`,
          ),
        { sample: false },
      );
    }

    const summary = {
      ok: true,
      checkedAt: new Date().toISOString(),
      supabaseUrl,
      runToken,
      activeSeed,
      checks,
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (keepaliveRunId) {
      try {
        await restPatch(`/rest/v1/parcel_import_runs?id=eq.${keepaliveRunId}`, {
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
          metadata: {
            activity_type: "keepalive",
            origin: "siteplan-supabase-keepalive",
            run_token: runToken,
            failed: true,
            seed_name: activeSeed.name,
          },
        });
      } catch (patchError) {
        console.error(
          `Failed to update keepalive run status: ${patchError instanceof Error ? patchError.message : String(patchError)}`,
        );
      }
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase keepalive failed: ${message}`);
  process.exitCode = 1;
});
