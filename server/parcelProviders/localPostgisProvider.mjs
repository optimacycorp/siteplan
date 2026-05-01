import { PARCEL_PROVIDERS } from "./types.mjs";
import { HttpError } from "./regridLegacyProvider.mjs";

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

function toObject(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? value : null;
}

function computeCentroidFromGeometry(geometry) {
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return null;
  }

  const polygon = geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.coordinates[0];
  const ring = Array.isArray(polygon?.[0]) ? polygon[0] : [];
  if (!ring.length) return null;

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const coordinate of ring) {
    const [lng, lat] = coordinate;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    return null;
  }

  return [
    Number(((minLng + maxLng) / 2).toFixed(9)),
    Number(((minLat + maxLat) / 2).toFixed(9)),
  ];
}

function toFeature(row) {
  const properties = toObject(row?.properties) ?? {};
  const geometry = toObject(row?.geojson);
  const centroid = toObject(row?.centroid);

  const centroidCoordinates = Array.isArray(centroid?.coordinates)
    ? centroid.coordinates
    : computeCentroidFromGeometry(geometry);

  return {
    type: "Feature",
    geometry: geometry && typeof geometry.type === "string" ? geometry : null,
    properties: {
      id: String(row?.id || ""),
      sourceKey: String(row?.source_key || ""),
      externalId: row?.external_id ? String(row.external_id) : "",
      parcelNumber: row?.parcel_number ? String(row.parcel_number) : "",
      apn: row?.apn ? String(row.apn) : "",
      scheduleNumber: row?.schedule_number ? String(row.schedule_number) : "",
      situsAddress: row?.situs_address ? String(row.situs_address) : "",
      ownerName: row?.owner_name ? String(row.owner_name) : "",
      legalDescription: row?.legal_description ? String(row.legal_description) : "",
      zoning: row?.zoning ? String(row.zoning) : String(properties.zoning || ""),
      acreage: Number(row?.acreage || 0),
      county: row?.county ? String(row.county) : String(properties.county || ""),
      state: row?.state ? String(row.state) : String(properties.state || ""),
      context: [
        row?.county ? String(row.county) : String(properties.county || ""),
        row?.state ? String(row.state) : String(properties.state || ""),
      ].filter(Boolean).join(", "),
      centroid: centroidCoordinates && centroidCoordinates.length >= 2
        ? [Number(centroidCoordinates[0]), Number(centroidCoordinates[1])]
        : null,
      matchType: row?.match_type ? String(row.match_type) : "provider",
      distanceMeters: Number.isFinite(Number(row?.distance_meters))
        ? Number(row.distance_meters)
        : null,
      fields: properties,
    },
  };
}

function getFeatureRank(feature) {
  const properties = feature?.properties ?? {};
  const matchType = String(properties.matchType || "provider");
  const acreage = Number(properties.acreage || 0);
  const distanceMeters = Number(properties.distanceMeters || 0);
  const normalizedArea = Number.isFinite(acreage) && acreage > 0 ? acreage : Number.POSITIVE_INFINITY;
  const matchWeight = matchType === "contains" ? 0 : matchType === "near" ? 1 : 2;
  return [matchWeight, normalizedArea, distanceMeters];
}

function compareFeatureRank(left, right) {
  const leftRank = getFeatureRank(left);
  const rightRank = getFeatureRank(right);
  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] < rightRank[index]) return -1;
    if (leftRank[index] > rightRank[index]) return 1;
  }
  return 0;
}

function normalizeIdentifier(value) {
  return String(value || "").replace(/[^0-9A-Za-z]/g, "");
}

export function createLocalPostgisProvider({
  supabaseUrl,
  serviceRoleKey,
  timeoutMs = 15000,
  pointToleranceMeters = 25,
  neighborRadiusMeters = 150,
  neighborLimit = 8,
} = {}) {
  const baseUrl = String(supabaseUrl || "").replace(/\/+$/, "");
  const enabled = Boolean(baseUrl && serviceRoleKey);

  async function postRpc(functionName, payload, signal) {
    if (!enabled) {
      throw new HttpError(500, "Supabase local parcel provider is not configured.");
    }

    const timeout = withTimeout(signal, timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(payload),
        signal: timeout.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new HttpError(response.status, `Supabase RPC ${functionName} failed (${response.status})`, {
          detail: text || undefined,
        });
      }

      return response.json();
    } finally {
      timeout.cleanup();
    }
  }

  return {
    enabled,
    async lookupByPoint(input, signal) {
      if (!enabled) {
        return {
          status: "not_found",
          provider: PARCEL_PROVIDERS.NONE,
          features: [],
        };
      }

      const rows = await postRpc("lookup_parcel_by_point", {
        p_lng: input.lng,
        p_lat: input.lat,
        p_tolerance_meters: pointToleranceMeters,
      }, signal);

      const features = Array.isArray(rows)
        ? rows.map(toFeature).filter(Boolean).sort(compareFeatureRank)
        : [];
      if (!features.length) {
        return {
          status: "not_found",
          provider: PARCEL_PROVIDERS.NONE,
          features: [],
        };
      }

      return {
        status: "found",
        provider: PARCEL_PROVIDERS.LOCAL_POSTGIS,
        features,
        message: "Parcel matched from local parcel cache.",
      };
    },

    async detailById(id, signal) {
      if (!enabled || !id) return null;
      const rows = await postRpc("get_open_parcel_detail", { p_id: id }, signal);
      return Array.isArray(rows) && rows[0] ? toFeature(rows[0]) : null;
    },

    async searchByIdentifier(identifier, signal) {
      if (!enabled) return [];
      const normalizedIdentifier = normalizeIdentifier(identifier);
      if (!normalizedIdentifier) return [];

      const rows = await postRpc("search_open_parcel_by_identifier", {
        p_identifier: normalizedIdentifier,
        p_limit: 5,
      }, signal);

      return Array.isArray(rows) ? rows.map(toFeature).filter(Boolean) : [];
    },

    async searchByText(query, signal) {
      if (!enabled) return [];
      const trimmedQuery = String(query || "").trim();
      if (!trimmedQuery) return [];

      const rows = await postRpc("search_open_parcels_text", {
        p_query: trimmedQuery,
        p_limit: 8,
      }, signal);

      return Array.isArray(rows) ? rows.map(toFeature).filter(Boolean) : [];
    },

    async neighborsByPoint(input, signal) {
      if (!enabled) return [];
      const rows = await postRpc("lookup_open_parcel_neighbors", {
        p_lng: input.lng,
        p_lat: input.lat,
        p_exclude_id: input.excludeId || null,
        p_radius_meters: neighborRadiusMeters,
        p_limit: neighborLimit,
      }, signal);
      return Array.isArray(rows) ? rows.map(toFeature).filter(Boolean) : [];
    },
  };
}
