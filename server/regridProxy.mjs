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

const stateAliases = new Map([
  ["alabama", "al"], ["alaska", "ak"], ["arizona", "az"], ["arkansas", "ar"],
  ["california", "ca"], ["colorado", "co"], ["connecticut", "ct"], ["delaware", "de"],
  ["florida", "fl"], ["georgia", "ga"], ["hawaii", "hi"], ["idaho", "id"],
  ["illinois", "il"], ["indiana", "in"], ["iowa", "ia"], ["kansas", "ks"],
  ["kentucky", "ky"], ["louisiana", "la"], ["maine", "me"], ["maryland", "md"],
  ["massachusetts", "ma"], ["michigan", "mi"], ["minnesota", "mn"], ["mississippi", "ms"],
  ["missouri", "mo"], ["montana", "mt"], ["nebraska", "ne"], ["nevada", "nv"],
  ["new hampshire", "nh"], ["new jersey", "nj"], ["new mexico", "nm"], ["new york", "ny"],
  ["north carolina", "nc"], ["north dakota", "nd"], ["ohio", "oh"], ["oklahoma", "ok"],
  ["oregon", "or"], ["pennsylvania", "pa"], ["rhode island", "ri"], ["south carolina", "sc"],
  ["south dakota", "sd"], ["tennessee", "tn"], ["texas", "tx"], ["utah", "ut"],
  ["vermont", "vt"], ["virginia", "va"], ["washington", "wa"], ["west virginia", "wv"],
  ["wisconsin", "wi"], ["wyoming", "wy"], ["district of columbia", "dc"],
]);

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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function parseQueryParts(query) {
  const segments = query.split(",").map((segment) => segment.trim()).filter(Boolean);
  const street = segments[0] || query.trim();
  const zipMatch = query.match(/\b\d{5}(?:-\d{4})?\b/);
  const zip = zipMatch?.[0] || "";
  const normalizedQuery = normalizeText(query);

  let state = "";
  for (const [name, abbreviation] of stateAliases.entries()) {
    if (normalizedQuery.includes(name)) {
      state = abbreviation;
      break;
    }
  }

  if (!state) {
    const stateToken = tokenize(query).find((token) => token.length === 2 && [...stateAliases.values()].includes(token));
    state = stateToken || "";
  }

  let city = "";
  if (segments.length >= 2) {
    const possibleCity = segments[segments.length >= 3 ? segments.length - 2 : 1];
    if (possibleCity && !/\d/.test(possibleCity)) {
      city = normalizeText(possibleCity);
    }
  }

  const streetTokens = tokenize(street).filter((token) => token.length > 1);

  return {
    raw: query,
    street,
    streetNormalized: normalizeText(street),
    streetTokens,
    city,
    state,
    zip,
  };
}

function isUnitAddress(address) {
  return /\b(?:apt|unit|suite|ste|lot|#)\b/i.test(address);
}

function scoreResult(result, queryParts) {
  const address = normalizeText(result.address);
  const context = normalizeText(result.context);
  const combined = `${address} ${context}`.trim();
  let score = Number(result.score || 0);

  if (queryParts.streetNormalized && address.includes(queryParts.streetNormalized)) {
    score += 40;
  }

  const matchedStreetTokens = queryParts.streetTokens.filter((token) => combined.includes(token)).length;
  score += matchedStreetTokens * 6;

  if (queryParts.city && context.includes(queryParts.city)) {
    score += 25;
  } else if (queryParts.city) {
    score -= 20;
  }

  if (queryParts.state) {
    const statePattern = new RegExp(`\\b${queryParts.state}\\b`, "i");
    if (statePattern.test(result.address) || statePattern.test(result.context)) {
      score += 16;
    } else {
      score -= 14;
    }
  }

  if (queryParts.zip) {
    if (result.address.includes(queryParts.zip)) {
      score += 30;
    } else {
      score -= 25;
    }
  }

  if (isUnitAddress(result.address)) {
    score -= 8;
  }

  return score;
}

function dedupeAndRankResults(results, query) {
  const queryParts = parseQueryParts(query);
  const rankedByUuid = new Map();

  for (const result of results) {
    const relevance = scoreResult(result, queryParts);
    const candidate = { ...result, relevance };
    const existing = rankedByUuid.get(candidate.llUuid);

    if (!existing) {
      rankedByUuid.set(candidate.llUuid, candidate);
      continue;
    }

    if (
      candidate.relevance > existing.relevance ||
      (candidate.relevance === existing.relevance && candidate.address.length < existing.address.length)
    ) {
      rankedByUuid.set(candidate.llUuid, candidate);
    }
  }

  return [...rankedByUuid.values()]
    .sort((left, right) => {
      if (right.relevance !== left.relevance) {
        return right.relevance - left.relevance;
      }
      return left.address.length - right.address.length;
    })
    .slice(0, 20)
    .map(({ relevance: _relevance, ...result }) => result);
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
    const city = String(fields.city || fields.municipality || "");
    const state = String(fields.state2 || "");
    const context = [city, state].filter(Boolean).join(", ");
    return [{
      llUuid: String(llUuid),
      address: String(fields.address || properties.headline || llUuid),
      context,
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

  const [typeaheadResult, addressResult] = await Promise.allSettled([
    fetchJson("parcels/typeahead", { query }, signal),
    fetchJson("parcels/address", { query, limit: 20 }, signal),
  ]);

  const merged = [];

  if (typeaheadResult.status === "fulfilled") {
    merged.push(...normalizeTypeaheadResults(typeaheadResult.value));
  }

  if (addressResult.status === "fulfilled") {
    merged.push(...normalizeAddressResults(addressResult.value));
  }

  if (!merged.length) {
    const reason =
      typeaheadResult.status === "rejected"
        ? typeaheadResult.reason
        : addressResult.status === "rejected"
          ? addressResult.reason
          : new Error("No search results available");
    throw reason;
  }

  sendJson(response, 200, dedupeAndRankResults(merged, query));
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
