import { createServer } from "node:http";
import { URL } from "node:url";

const port = Number(process.env.PORT || 8787);
const regridToken = process.env.REGRID_API_TOKEN || "";
const regridApiBaseUrl = (process.env.REGRID_API_BASE_URL || "https://app.regrid.com/api/v2").replace(/\/+$/, "");
const requestTimeoutMs = Number(process.env.REGRID_REQUEST_TIMEOUT_MS || 15000);

if (!regridToken) {
  console.error("Missing REGRID_API_TOKEN environment variable.");
  process.exit(1);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout),
  };
}

async function fetchJson(pathname, params, signal) {
  const url = new URL(pathname, `${regridApiBaseUrl}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("token", regridToken);

  const timeout = withTimeout(signal, requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: timeout.signal,
    });

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`Regrid request failed (${response.status})`);
    }

    return json;
  } finally {
    timeout.cleanup();
  }
}

function normalizeTypeaheadResults(payload) {
  const features = payload?.parcel_centroids?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature) => {
    const properties = feature?.properties;
    const coords = feature?.geometry?.coordinates;
    const llUuid = properties?.ll_uuid;
    if (!llUuid) return [];
    return [{
      llUuid: String(llUuid),
      address: String(properties.address || llUuid),
      context: String(properties.context || ""),
      path: String(properties.path || ""),
      score: typeof properties.score === "number" ? properties.score : Number(properties.score || 0),
      coordinates: Array.isArray(coords) && coords.length >= 2 ? [coords[0], coords[1]] : null,
    }];
  });
}

function normalizeAddressResults(payload) {
  const features = payload?.parcels?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature) => {
    const properties = feature?.properties;
    const fields = properties?.fields || {};
    const llUuid = properties?.ll_uuid;
    if (!llUuid) return [];
    return [{
      llUuid: String(llUuid),
      address: String(fields.address || properties.headline || llUuid),
      context: String(properties.context?.headline || properties.context?.name || ""),
      path: String(properties.path || ""),
      score: 0,
      coordinates: [Number(fields.lon || feature?.geometry?.coordinates?.[0] || 0), Number(fields.lat || feature?.geometry?.coordinates?.[1] || 0)],
    }];
  });
}

function featureToDetail(feature) {
  if (!feature?.properties) return null;
  const fields = feature.properties.fields || {};
  const geometry = feature.geometry || null;
  return {
    llUuid: String(feature.properties.ll_uuid || feature.id || ""),
    headline: String(feature.properties.headline || fields.address || "Selected parcel"),
    address: String(fields.address || feature.properties.headline || ""),
    apn: String(fields.parcelnumb || fields.parcelnumb_no_formatting || ""),
    zoning: String(fields.zoning || fields.ll_zoning_backup || ""),
    floodZone: String(fields.fema_flood_zone || ""),
    areaAcres: Number(fields.ll_gisacre || fields.gisacre || 0),
    areaSqft: Number(fields.ll_gissqft || fields.sqft || 0),
    county: String(fields.county || ""),
    state: String(fields.state2 || ""),
    path: String(feature.properties.path || ""),
    geometry,
    centroid: pickCentroid(geometry),
    fields,
  };
}

function pickCentroid(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    return [geometry.coordinates[0], geometry.coordinates[1]];
  }
  if (geometry.type === "Polygon") {
    const first = geometry.coordinates?.[0]?.[0];
    return first ? [first[0], first[1]] : null;
  }
  if (geometry.type === "MultiPolygon") {
    const first = geometry.coordinates?.[0]?.[0]?.[0];
    return first ? [first[0], first[1]] : null;
  }
  return null;
}

async function handleSearch(requestUrl, response, signal) {
  const query = requestUrl.searchParams.get("query")?.trim() || "";
  if (!query) {
    sendJson(response, 200, []);
    return;
  }

  try {
    const typeaheadPayload = await fetchJson("parcels/typeahead", { query }, signal);
    sendJson(response, 200, normalizeTypeaheadResults(typeaheadPayload));
  } catch (error) {
    try {
      const addressPayload = await fetchJson("parcels/address", { query, limit: 10 }, signal);
      sendJson(response, 200, normalizeAddressResults(addressPayload));
    } catch {
      throw error;
    }
  }
}

async function handleDetail(llUuid, response, signal) {
  if (!llUuid) {
    sendJson(response, 400, { error: "Missing llUuid" });
    return;
  }

  const payload = await fetchJson(`parcels/${encodeURIComponent(llUuid)}`, {}, signal);
  const detail = featureToDetail(payload?.parcel);
  sendJson(response, 200, { feature: detail ? payload.parcel : null, detail });
}

async function handleNeighbors(requestUrl, response, signal) {
  const lat = requestUrl.searchParams.get("lat");
  const lng = requestUrl.searchParams.get("lng");
  const radius = requestUrl.searchParams.get("radius") || "250";
  const limit = requestUrl.searchParams.get("limit") || "24";
  const exclude = requestUrl.searchParams.get("exclude") || "";

  if (!lat || !lng) {
    sendJson(response, 400, { error: "Missing lat/lng" });
    return;
  }

  const payload = await fetchJson("parcels/point", {
    lat,
    lon: lng,
    radius,
    limit,
    return_geometry: true,
    return_stacked: false,
  }, signal);

  const features = Array.isArray(payload?.parcels?.features) ? payload.parcels.features : [];
  const filtered = features.filter((feature) => String(feature?.properties?.ll_uuid || feature?.id || "") !== exclude);
  sendJson(response, 200, { features: filtered });
}

async function handlePoint(requestUrl, response, signal) {
  const lat = requestUrl.searchParams.get("lat");
  const lng = requestUrl.searchParams.get("lng");
  const radius = requestUrl.searchParams.get("radius") || "4";

  if (!lat || !lng) {
    sendJson(response, 400, { error: "Missing lat/lng" });
    return;
  }

  const payload = await fetchJson("parcels/point", {
    lat,
    lon: lng,
    radius,
    limit: 1,
    return_geometry: true,
  }, signal);

  const feature = payload?.parcels?.features?.[0] || null;
  sendJson(response, 200, { feature });
}

const server = createServer(async (request, response) => {
  if (!request.url || !request.method) {
    sendText(response, 400, "Bad request");
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (request.method !== "GET") {
    sendText(response, 405, "Method not allowed");
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  try {
    if (requestUrl.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (requestUrl.pathname === "/search") {
      await handleSearch(requestUrl, response, request.signal);
      return;
    }

    if (requestUrl.pathname === "/neighbors") {
      await handleNeighbors(requestUrl, response, request.signal);
      return;
    }

    if (requestUrl.pathname === "/point") {
      await handlePoint(requestUrl, response, request.signal);
      return;
    }

    const detailMatch = requestUrl.pathname.match(/^\/detail\/([^/]+)$/);
    if (detailMatch) {
      await handleDetail(detailMatch[1], response, request.signal);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    console.error(message);
    sendJson(response, 502, { error: message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Regrid proxy listening on http://127.0.0.1:${port}`);
});
