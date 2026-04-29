import { createServer } from "node:http";
import { URL } from "node:url";

const port = Number(process.env.PORT || 8787);
const regridToken = process.env.REGRID_API_TOKEN || "";
const regridApiBaseUrl = (process.env.REGRID_API_BASE_URL || "https://app.regrid.com/api/v2").replace(/\/+$/, "");
const requestTimeoutMs = Number(process.env.REGRID_REQUEST_TIMEOUT_MS || 15000);
const censusGeocoderApiBaseUrl = (process.env.CENSUS_GEOCODER_API_BASE_URL || "https://geocoding.geo.census.gov").replace(/\/+$/, "");
const censusGeocoderBenchmark = process.env.CENSUS_GEOCODER_BENCHMARK || "Public_AR_Current";
const geocoderApiBaseUrl = (process.env.GEOCODER_API_BASE_URL || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
const geocoderUserAgent = process.env.GEOCODER_USER_AGENT || "OptimacyQuickSite/0.1 (+https://siteplan.gomil.com)";

if (!regridToken) {
  console.error("Missing REGRID_API_TOKEN environment variable.");
  process.exit(1);
}

const geocodeCache = new Map();
let nextGeocodeAllowedAt = 0;

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

const streetSuffixAliases = new Map([
  [" road", " rd"],
  [" rd", " road"],
  [" street", " st"],
  [" st", " street"],
  [" avenue", " ave"],
  [" ave", " avenue"],
  [" boulevard", " blvd"],
  [" blvd", " boulevard"],
  [" drive", " dr"],
  [" dr", " drive"],
  [" lane", " ln"],
  [" ln", " lane"],
  [" court", " ct"],
  [" ct", " court"],
  [" place", " pl"],
  [" pl", " place"],
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
      headers: { Accept: "application/json" },
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

function offsetCoordinate(lat, lng, eastMeters, northMeters) {
  const latRadians = (lat * Math.PI) / 180;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos(latRadians);

  return {
    lat: lat + northMeters / metersPerDegreeLat,
    lng: lng + eastMeters / Math.max(metersPerDegreeLng, 1e-6),
  };
}

function buildNearbyProbePoints(lat, lng) {
  const points = [{ lat, lng }];
  const distances = [8, 16, 32, 64];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const distance of distances) {
    for (const [eastScale, northScale] of directions) {
      points.push(offsetCoordinate(lat, lng, eastScale * distance, northScale * distance));
    }
  }

  return points;
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

function expandStreetVariants(street) {
  const variants = new Set([street.trim()]);
  const normalized = normalizeText(street);

  for (const [from, to] of streetSuffixAliases.entries()) {
    if (normalized.endsWith(from.trim())) {
      variants.add(normalized.replace(new RegExp(`${from}$`), to));
    }
  }

  return [...variants].filter(Boolean);
}

function buildGeocodeQueries(query) {
  const parts = parseQueryParts(query);
  const variants = new Set([query.trim()]);
  const streetVariants = expandStreetVariants(parts.street || query);
  const cityLabel = parts.city ? parts.city.replace(/\b\w/g, (char) => char.toUpperCase()) : "";
  const stateLabel = parts.state ? parts.state.toUpperCase() : "";
  const zipLabel = parts.zip || "";

  for (const street of streetVariants) {
    variants.add(street);

    if (cityLabel && stateLabel && zipLabel) {
      variants.add(`${street}, ${cityLabel}, ${stateLabel} ${zipLabel}`);
      variants.add(`${street}, ${cityLabel}, ${stateLabel}`);
    }

    if (cityLabel && stateLabel) {
      variants.add(`${street}, ${cityLabel}, ${stateLabel}`);
    }
  }

  return [...variants].filter(Boolean);
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

function normalizePointSearchResults(payload) {
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
      score: 1000,
      coordinates: pickCentroid(feature?.geometry) || null,
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

async function waitForGeocoderSlot() {
  const now = Date.now();
  const delayMs = Math.max(0, nextGeocodeAllowedAt - now);
  nextGeocodeAllowedAt = Math.max(now, nextGeocodeAllowedAt) + 1100;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function geocodeAddressWithCensus(query, signal) {
  const url = new URL("/geocoder/locations/onelineaddress", `${censusGeocoderApiBaseUrl}/`);
  url.searchParams.set("address", query);
  url.searchParams.set("benchmark", censusGeocoderBenchmark);
  url.searchParams.set("format", "json");

  const timeout = withTimeout(signal, requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": geocoderUserAgent,
      },
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new Error(`Census geocoder request failed (${response.status})`);
    }

    const payload = await response.json();
    const matches = payload?.result?.addressMatches;
    if (!Array.isArray(matches)) {
      return [];
    }

    return matches.flatMap((match) => {
      const lat = Number(match?.coordinates?.y);
      const lng = Number(match?.coordinates?.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      return [{
        lat,
        lng,
        displayName: String(match?.matchedAddress || query),
      }];
    });
  } finally {
    timeout.cleanup();
  }
}

async function geocodeAddressWithNominatim(query, signal) {
  await waitForGeocoderSlot();

  const url = new URL("/search", `${geocoderApiBaseUrl}/`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "3");
  url.searchParams.set("countrycodes", "us");

  const timeout = withTimeout(signal, requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": geocoderUserAgent,
      },
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new Error(`Geocoder request failed (${response.status})`);
    }

    const payload = await response.json();
    return Array.isArray(payload)
      ? payload.flatMap((entry) => {
          const lat = Number(entry?.lat);
          const lng = Number(entry?.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
          return [{
            lat,
            lng,
            displayName: String(entry?.display_name || query),
          }];
        })
      : [];
  } finally {
    timeout.cleanup();
  }
}

async function geocodeAddress(query, signal) {
  const geocodeQueries = buildGeocodeQueries(query);
  const cacheKey = geocodeQueries.map((value) => normalizeText(value)).join("|");
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const merged = [];
  const seen = new Set();

  for (const geocodeQuery of geocodeQueries) {
    let results = [];

    try {
      results = await geocodeAddressWithCensus(geocodeQuery, signal);
    } catch {
      results = [];
    }

    if (!results.length) {
      try {
        results = await geocodeAddressWithNominatim(geocodeQuery, signal);
      } catch {
        results = [];
      }
    }

    for (const result of results) {
      const key = `${result.lat.toFixed(6)},${result.lng.toFixed(6)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push({ ...result, query: geocodeQuery });
    }
  }

  geocodeCache.set(cacheKey, {
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    value: merged,
  });

  return merged;
}

async function fetchPointParcelsByCoordinate(lat, lng, signal) {
  const probePoints = buildNearbyProbePoints(lat, lng);
  const attempts = [
    { radius: 4, limit: 1 },
    { radius: 25, limit: 3 },
    { radius: 150, limit: 5 },
  ];

  for (const point of probePoints) {
    for (const attempt of attempts) {
      try {
        const payload = await fetchJson("parcels/point", {
          lat: point.lat,
          lon: point.lng,
          radius: attempt.radius,
          limit: attempt.limit,
          return_geometry: true,
        }, signal);
        const features = payload?.parcels?.features;
        if (Array.isArray(features) && features.length) {
          return payload;
        }
      } catch {
        // Continue probing nearby points.
      }
    }
  }

  return { parcels: { features: [] } };
}

async function handleSearch(requestUrl, response, signal) {
  const query = requestUrl.searchParams.get("query")?.trim() || "";
  if (!query) {
    sendJson(response, 200, []);
    return;
  }

  const merged = [];
  const geocodedPoints = await geocodeAddress(query, signal).catch(() => []);

  for (const geocodedPoint of geocodedPoints.slice(0, 3)) {
    try {
      const pointPayload = await fetchPointParcelsByCoordinate(geocodedPoint.lat, geocodedPoint.lng, signal);
      const pointResults = normalizePointSearchResults(pointPayload);
      if (pointResults.length) {
        merged.push(...pointResults);
        break;
      }
    } catch {
      continue;
    }
  }

  const [typeaheadResult, addressResult] = await Promise.allSettled([
    fetchJson("parcels/typeahead", { query }, signal),
    fetchJson("parcels/address", { query, limit: 20 }, signal),
  ]);

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

  const payload = await fetchPointParcelsByCoordinate(Number(lat), Number(lng), signal);

  const feature = payload?.parcels?.features?.[0] || null;
  sendJson(response, 200, { feature });
}

async function handleGeocode(requestUrl, response, signal) {
  const query = requestUrl.searchParams.get("query")?.trim() || "";
  if (!query) {
    sendJson(response, 400, { error: "Missing query" });
    return;
  }

  const results = await geocodeAddress(query, signal);
  sendJson(response, 200, {
    query,
    attemptedQueries: buildGeocodeQueries(query),
    results,
  });
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

    if (requestUrl.pathname === "/geocode") {
      await handleGeocode(requestUrl, response, request.signal);
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
