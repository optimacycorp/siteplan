import { createServer } from "node:http";
import { URL } from "node:url";
import { PARCEL_PROVIDERS } from "./parcelProviders/types.mjs";
import { createRegridLegacyProvider, HttpError } from "./parcelProviders/regridLegacyProvider.mjs";
import { createLocalPostgisProvider } from "./parcelProviders/localPostgisProvider.mjs";

const port = Number(process.env.PORT || 8787);
const requestTimeoutMs = Number(process.env.REGRID_REQUEST_TIMEOUT_MS || 15000);
const searchCacheTtlMs = Number(process.env.SEARCH_CACHE_TTL_MS || 1000 * 60 * 10);
const censusGeocoderApiBaseUrl = (process.env.CENSUS_GEOCODER_API_BASE_URL || "https://geocoding.geo.census.gov").replace(/\/+$/, "");
const censusGeocoderBenchmark = process.env.CENSUS_GEOCODER_BENCHMARK || "Public_AR_Current";
const geocoderApiBaseUrl = (process.env.GEOCODER_API_BASE_URL || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
const geocoderUserAgent = process.env.GEOCODER_USER_AGENT || "OptimacyQuickSite/0.1 (+https://siteplan.gomil.com)";
const defaultState = process.env.OPEN_PARCEL_DEFAULT_STATE || "CO";
const defaultCounty = process.env.OPEN_PARCEL_DEFAULT_COUNTY || "El Paso";
const enableRegridFallback = /^true$/i.test(process.env.OPEN_PARCEL_ENABLE_REGRID_FALLBACK || "false");
const supabasePointToleranceMeters = Number(process.env.OPEN_PARCEL_POINT_TOLERANCE_METERS || 25);
const supabaseNeighborRadiusMeters = Number(process.env.OPEN_PARCEL_NEIGHBOR_RADIUS_METERS || 150);
const supabaseNeighborLimit = Number(process.env.OPEN_PARCEL_NEIGHBOR_LIMIT || 8);

const geocodeCache = new Map();
const searchCache = new Map();
let nextGeocodeAllowedAt = 0;

const regridLegacyProvider = createRegridLegacyProvider({
  token: process.env.REGRID_API_TOKEN || "",
  apiBaseUrl: process.env.REGRID_API_BASE_URL || "https://app.regrid.com/api/v2",
  timeoutMs: requestTimeoutMs,
  rateLimitCooldownMs: Number(process.env.REGRID_RATE_LIMIT_COOLDOWN_MS || 1000 * 60 * 2),
});

const localPostgisProvider = createLocalPostgisProvider({
  supabaseUrl: process.env.SUPABASE_URL || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  timeoutMs: requestTimeoutMs,
  pointToleranceMeters: supabasePointToleranceMeters,
  neighborRadiusMeters: supabaseNeighborRadiusMeters,
  neighborLimit: supabaseNeighborLimit,
});

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

  return { street, city, state, zip };
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
  const stateLabel = (parts.state || defaultState).toUpperCase();
  const zipLabel = parts.zip || "";

  for (const street of streetVariants) {
    variants.add(street);
    if (cityLabel && zipLabel) {
      variants.add(`${street}, ${cityLabel}, ${stateLabel} ${zipLabel}`);
    }
    if (cityLabel) {
      variants.add(`${street}, ${cityLabel}, ${stateLabel}`);
    }
  }

  return [...variants].filter(Boolean);
}

function getSearchCacheEntry(query) {
  const key = normalizeText(query);
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  return cached.value;
}

function setSearchCacheEntry(query, value) {
  searchCache.set(normalizeText(query), {
    expiresAt: Date.now() + searchCacheTtlMs,
    value,
  });
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
      headers: { Accept: "application/json", "User-Agent": geocoderUserAgent },
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new HttpError(response.status, `Census geocoder request failed (${response.status})`);
    }

    const payload = await response.json();
    const matches = payload?.result?.addressMatches;
    if (!Array.isArray(matches)) return [];

    return matches.flatMap((match) => {
      const lat = Number(match?.coordinates?.y);
      const lng = Number(match?.coordinates?.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      return [{ lat, lng, displayName: String(match?.matchedAddress || query) }];
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
      headers: { Accept: "application/json", "User-Agent": geocoderUserAgent },
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new HttpError(response.status, `Geocoder request failed (${response.status})`);
    }

    const payload = await response.json();
    return Array.isArray(payload)
      ? payload.flatMap((entry) => {
          const lat = Number(entry?.lat);
          const lng = Number(entry?.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
          return [{ lat, lng, displayName: String(entry?.display_name || query) }];
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
      if (seen.has(key)) continue;
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

function convertProviderFeaturesToSearchResults(features, provider) {
  return features.flatMap((feature) => {
    const properties = feature?.properties ?? {};
    const centroid = properties.centroid;
    const parcelNumber = String(properties.parcelNumber || properties.apn || properties.scheduleNumber || "").trim();
    const situsAddress = String(properties.situsAddress || properties.address || "").trim();
    const fallbackLabel = parcelNumber ? `Parcel ${parcelNumber}` : String(properties.id || "");
    const county = String(properties.county || "").trim();
    const state = String(properties.state || "").trim();
    const acreage = Number(properties.acreage || 0);
    const matchType = String(properties.matchType || "provider");
    return [{
      llUuid: String(properties.id || ""),
      headline: situsAddress || fallbackLabel,
      address: situsAddress || fallbackLabel,
      context: [
        county && state ? `${county}, ${state}` : String(properties.context || county || provider),
        parcelNumber ? `APN ${parcelNumber}` : "",
      ].filter(Boolean).join(" • "),
      path: String(properties.path || ""),
      score: Number(properties.searchScore || 1000),
      coordinates: Array.isArray(centroid) ? [centroid[0], centroid[1]] : null,
      parcelNumber: parcelNumber || undefined,
      acreage: Number.isFinite(acreage) && acreage > 0 ? acreage : undefined,
      matchType: ["contains", "near", "provider"].includes(matchType) ? matchType : "provider",
      sourceKey: String(properties.sourceKey || ""),
      kind: "parcel",
      provider,
    }];
  });
}

function buildGeocodeSearchResult(entry) {
  return {
    llUuid: `geocode:${entry.lat.toFixed(6)},${entry.lng.toFixed(6)}`,
    headline: "Use mapped address location",
    address: entry.displayName,
    context: "Geocoded address",
    path: "",
    score: 5000,
    coordinates: [entry.lng, entry.lat],
    kind: "geocode",
    provider: PARCEL_PROVIDERS.NONE,
  };
}

function normalizeIdentifier(value) {
  return String(value || "").replace(/[^0-9A-Za-z]/g, "");
}

function looksLikeParcelIdentifier(query) {
  const normalized = normalizeIdentifier(query);
  return normalized.length >= 8 && /^\d+[A-Za-z0-9]*$/.test(normalized);
}

function looksLikeAddressQuery(query) {
  const normalized = normalizeText(query);
  if (!normalized) return false;
  const hasStreetNumber = /\b\d{1,6}\b/.test(normalized);
  const hasStreetWord = /\b(road|rd|street|st|avenue|ave|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|way|circle|cir|trail|trl)\b/.test(normalized);
  const hasComma = query.includes(",");
  return (hasStreetNumber && hasStreetWord) || hasComma;
}

async function lookupParcel(input, signal) {
  if (localPostgisProvider.enabled) {
    const localLookup = await localPostgisProvider.lookupByPoint(input, signal);
    if (localLookup.status === "found" && localLookup.features.length) {
      return localLookup;
    }
  }

  if (enableRegridFallback && regridLegacyProvider) {
    return regridLegacyProvider.lookupByPoint(input, signal);
  }

  return {
    status: "not_found",
    provider: PARCEL_PROVIDERS.NONE,
    features: [],
    center: { lat: input.lat, lng: input.lng },
    message: "Address located, but no parcel polygon was found. Zoomed to the area for manual selection.",
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(fromLat, fromLng, toLat, toLng) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreSearchFeature(feature, geocodedEntry) {
  const properties = feature?.properties ?? {};
  const centroid = Array.isArray(properties.centroid) ? properties.centroid : null;
  const acreage = Number(properties.acreage || 0);
  const matchType = String(properties.matchType || "provider");
  const centroidDistance = centroid
    ? distanceMeters(geocodedEntry.lat, geocodedEntry.lng, Number(centroid[1]), Number(centroid[0]))
    : 5000;
  const acreagePenalty = Number.isFinite(acreage) && acreage > 0
    ? Math.min(1500, acreage * 2)
    : 250;
  const matchBonus = matchType === "contains" ? -125 : matchType === "near" ? 0 : 125;

  return centroidDistance + acreagePenalty + matchBonus;
}

function scoreGeocodedEntry(entry, query) {
  const normalizedQuery = normalizeText(query);
  const normalizedDisplay = normalizeText(entry?.displayName || "");
  let penalty = 0;

  const queryZipMatch = query.match(/\b\d{5}(?:-\d{4})?\b/);
  const displayZipMatch = String(entry?.displayName || "").match(/\b\d{5}(?:-\d{4})?\b/);
  const queryZip = queryZipMatch?.[0] || "";
  const displayZip = displayZipMatch?.[0] || "";

  if (queryZip && displayZip && queryZip !== displayZip) {
    penalty += 2500;
  }

  if (normalizedQuery.includes("colorado springs") && !normalizedDisplay.includes("colorado springs")) {
    penalty += 3500;
  }

  if (normalizedQuery.includes("rampart range") && !normalizedDisplay.includes("rampart range")) {
    penalty += 3000;
  }

  return penalty;
}

function dedupeFeatures(features) {
  const seen = new Set();
  const deduped = [];
  for (const feature of features) {
    const id = String(feature?.properties?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(feature);
  }
  return deduped;
}

async function searchLocalCandidates(input, signal) {
  if (!localPostgisProvider.enabled) return [];

  const lookup = await localPostgisProvider.lookupByPoint(input, signal);
  const neighbors = await localPostgisProvider.neighborsByPoint({
    lat: input.lat,
    lng: input.lng,
  }, signal);

  return dedupeFeatures([
    ...(lookup.features || []),
    ...neighbors,
  ]);
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

async function handleParcelLookup(requestUrl, response, signal) {
  const lat = Number(requestUrl.searchParams.get("lat"));
  const lng = Number(requestUrl.searchParams.get("lng"));
  const query = requestUrl.searchParams.get("query")?.trim() || "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    sendJson(response, 400, { error: "Missing lat/lng" });
    return;
  }

  const result = await lookupParcel({
    lat,
    lng,
    query,
    state: requestUrl.searchParams.get("state") || defaultState,
    county: requestUrl.searchParams.get("county") || defaultCounty,
  }, signal);

  sendJson(response, 200, result);
}

async function handleSearch(requestUrl, response, signal) {
  const query = requestUrl.searchParams.get("query")?.trim() || "";
  if (!query) {
    sendJson(response, 200, []);
    return;
  }

  const cached = getSearchCacheEntry(query);
  if (cached) {
    sendJson(response, 200, cached);
    return;
  }

  if (looksLikeParcelIdentifier(query) && localPostgisProvider.enabled) {
    const exactMatches = await localPostgisProvider.searchByIdentifier(query, signal);
    if (exactMatches.length) {
      const identifierResults = convertProviderFeaturesToSearchResults(exactMatches, PARCEL_PROVIDERS.LOCAL_POSTGIS);
      setSearchCacheEntry(query, identifierResults);
      sendJson(response, 200, identifierResults);
      return;
    }
  }

  if (!looksLikeAddressQuery(query) && localPostgisProvider.enabled) {
    const localTextMatches = await localPostgisProvider.searchByText(query, signal);
    if (localTextMatches.length) {
      const textResults = convertProviderFeaturesToSearchResults(localTextMatches, PARCEL_PROVIDERS.LOCAL_POSTGIS);
      setSearchCacheEntry(query, textResults);
      sendJson(response, 200, textResults);
      return;
    }
  }

  const geocoded = await geocodeAddress(query, signal).catch(() => []);
  const results = [];

  if (geocoded[0]) {
    const scoredGeocodes = geocoded
      .map((entry) => ({
        entry,
        score: scoreGeocodedEntry(entry, query),
      }))
      .sort((left, right) => left.score - right.score)
      .slice(0, 4);

    const aggregatedCandidates = [];
    for (const { entry } of scoredGeocodes) {
      const localCandidates = await searchLocalCandidates({
        lat: entry.lat,
        lng: entry.lng,
        query,
        state: defaultState,
        county: defaultCounty,
      }, signal);

      aggregatedCandidates.push(...localCandidates.map((feature) => ({
        feature,
        geocodedEntry: entry,
      })));
    }

    const dedupedById = new Map();
    for (const candidate of aggregatedCandidates) {
      const id = String(candidate.feature?.properties?.id || "");
      if (!id) continue;
      const searchScore = scoreSearchFeature(candidate.feature, candidate.geocodedEntry) + scoreGeocodedEntry(candidate.geocodedEntry, query);
      const current = dedupedById.get(id);
      if (!current || searchScore < current.searchScore) {
        dedupedById.set(id, { ...candidate, searchScore });
      }
    }

    if (dedupedById.size > 0) {
      const rankedCandidates = [...dedupedById.values()]
        .sort((left, right) => left.searchScore - right.searchScore)
        .slice(0, 5)
        .map((candidate) => ({
          ...candidate.feature,
          properties: {
            ...(candidate.feature.properties ?? {}),
            searchScore: Math.round(100000 - candidate.searchScore),
          },
        }));

      results.push(...convertProviderFeaturesToSearchResults(rankedCandidates, PARCEL_PROVIDERS.LOCAL_POSTGIS));
      results.push(buildGeocodeSearchResult(scoredGeocodes[0].entry));
    } else {
      results.push(buildGeocodeSearchResult(scoredGeocodes[0].entry));
    }
  } else if (enableRegridFallback && regridLegacyProvider) {
    const fallback = await regridLegacyProvider.searchByText(query, signal);
    results.push(...fallback.searchResults);
  }

  setSearchCacheEntry(query, results);
  sendJson(response, 200, results);
}

async function handlePoint(requestUrl, response, signal) {
  const lat = Number(requestUrl.searchParams.get("lat"));
  const lng = Number(requestUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    sendJson(response, 400, { error: "Missing lat/lng" });
    return;
  }

  const lookup = await lookupParcel({ lat, lng }, signal);
  sendJson(response, 200, { feature: lookup.features[0] ?? null });
}

async function handleDetail(response, signal, llUuid) {
  if (!llUuid || llUuid.startsWith("geocode:")) {
    sendJson(response, 200, { feature: null, detail: null });
    return;
  }

  if (localPostgisProvider.enabled) {
    const feature = await localPostgisProvider.detailById(llUuid, signal);
    if (feature) {
      sendJson(response, 200, { feature, detail: feature });
      return;
    }
  }

  if (enableRegridFallback && regridLegacyProvider) {
    const feature = await regridLegacyProvider.detailByUuid(llUuid, signal);
    sendJson(response, 200, { feature, detail: feature });
    return;
  }

  sendJson(response, 200, { feature: null, detail: null });
}

async function handleNeighbors(requestUrl, response, signal) {
  const lat = Number(requestUrl.searchParams.get("lat"));
  const lng = Number(requestUrl.searchParams.get("lng"));
  const excludeId = requestUrl.searchParams.get("excludeLlUuid")?.trim() || "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    sendJson(response, 400, { error: "Missing lat/lng" });
    return;
  }

  if (localPostgisProvider.enabled) {
    const features = await localPostgisProvider.neighborsByPoint({
      lat,
      lng,
      excludeId,
    }, signal);
    sendJson(response, 200, { features });
    return;
  }

  sendJson(response, 200, { features: [] });
}

function handleError(response, error) {
  const message = error instanceof Error ? error.message : "Unknown parcel proxy error";
  const statusCode = error instanceof HttpError ? error.statusCode : 502;
  const extra = error instanceof HttpError ? error.extra : {};
  console.error(message);
  sendJson(response, statusCode, { error: message, ...extra });
}

export function startOpenParcelProxy() {
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
        sendJson(response, 200, {
          ok: true,
          providerMode: enableRegridFallback ? "open-plus-regrid-fallback" : "open-only",
        });
        return;
      }

      if (requestUrl.pathname === "/geocode") {
        await handleGeocode(requestUrl, response, request.signal);
        return;
      }

      if (requestUrl.pathname === "/parcel/lookup") {
        await handleParcelLookup(requestUrl, response, request.signal);
        return;
      }

      if (requestUrl.pathname === "/search") {
        await handleSearch(requestUrl, response, request.signal);
        return;
      }

      if (requestUrl.pathname === "/point") {
        await handlePoint(requestUrl, response, request.signal);
        return;
      }

      if (requestUrl.pathname === "/neighbors") {
        await handleNeighbors(requestUrl, response, request.signal);
        return;
      }

      const detailMatch = requestUrl.pathname.match(/^\/detail\/([^/]+)$/);
      if (detailMatch) {
        await handleDetail(response, request.signal, detailMatch[1]);
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      handleError(response, error);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Open parcel proxy listening on http://127.0.0.1:${port}`);
  });

  return server;
}
