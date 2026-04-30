import { PARCEL_PROVIDERS } from "./types.mjs";

let regridRateLimitedUntil = 0;

export class HttpError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.extra = extra;
  }
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

function normalizeFeature(feature) {
  const properties = feature?.properties ?? {};
  const fields = properties.fields ?? {};
  const city = String(fields.city || fields.municipality || "");
  const state = String(fields.state2 || "");
  return {
    type: "Feature",
    geometry: feature?.geometry ?? null,
    properties: {
      id: String(properties.ll_uuid || feature?.id || ""),
      sourceKey: "regrid",
      parcelNumber: String(fields.parcelnumb || fields.parcelnumb_no_formatting || ""),
      apn: String(fields.parcelnumb || fields.parcelnumb_no_formatting || ""),
      scheduleNumber: String(fields.schedule_number || ""),
      situsAddress: String(fields.address || properties.headline || ""),
      ownerName: String(fields.owner || fields.owner_name || ""),
      acreage: Number(fields.ll_gisacre || fields.gisacre || 0),
      county: String(fields.county || ""),
      state,
      context: [city, state].filter(Boolean).join(", "),
      path: String(properties.path || ""),
      matchType: "provider",
      legacyProvider: "regrid",
      legacyLlUuid: String(properties.ll_uuid || feature?.id || ""),
      centroid: pickCentroid(feature?.geometry),
      fields,
    },
  };
}

function normalizeTypeaheadResult(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = feature?.geometry?.coordinates;
  return {
    llUuid: String(properties.ll_uuid || ""),
    address: String(properties.address || properties.ll_uuid || ""),
    context: String(properties.context || ""),
    path: String(properties.path || ""),
    score: typeof properties.score === "number" ? properties.score : Number(properties.score || 0),
    coordinates: Array.isArray(coordinates) && coordinates.length >= 2 ? [coordinates[0], coordinates[1]] : null,
    kind: "parcel",
    provider: PARCEL_PROVIDERS.REGRID,
  };
}

export function createRegridLegacyProvider(options) {
  const {
    token,
    apiBaseUrl = "https://app.regrid.com/api/v2",
    timeoutMs = 15000,
    rateLimitCooldownMs = 1000 * 60 * 2,
  } = options;

  if (!token) {
    return null;
  }

  async function fetchJson(pathname, params, signal) {
    if (Date.now() < regridRateLimitedUntil) {
      throw new HttpError(429, "Parcel provider is rate-limiting requests. Please retry shortly.", {
        retryAfterMs: regridRateLimitedUntil - Date.now(),
      });
    }

    const url = new URL(pathname, `${apiBaseUrl.replace(/\/+$/, "")}/`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
    url.searchParams.set("token", token);

    const timeout = withTimeout(signal, timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: timeout.signal,
      });

      const text = await response.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { raw: text };
      }

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterHeader = Number(response.headers.get("retry-after") || 0);
          const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader * 1000
            : rateLimitCooldownMs;
          regridRateLimitedUntil = Date.now() + retryAfterMs;
          throw new HttpError(429, "Parcel provider is rate-limiting requests. Please retry in a moment.", {
            retryAfterMs,
          });
        }

        throw new HttpError(response.status, `Regrid request failed (${response.status})`, {
          payload,
        });
      }

      return payload;
    } finally {
      timeout.cleanup();
    }
  }

  return {
    async lookupByPoint(input, signal) {
      const payload = await fetchJson("parcels/point", {
        lat: input.lat,
        lon: input.lng,
        radius: input.radius ?? 25,
        limit: input.limit ?? 5,
        return_geometry: true,
      }, signal);

      const features = Array.isArray(payload?.parcels?.features)
        ? payload.parcels.features.map(normalizeFeature)
        : [];

      return {
        status: features.length ? "found" : "not_found",
        provider: features.length ? PARCEL_PROVIDERS.REGRID : PARCEL_PROVIDERS.NONE,
        features,
        message: features.length
          ? "Parcel matched from legacy Regrid fallback."
          : "No parcel polygon returned from the legacy Regrid fallback.",
      };
    },

    async searchByText(query, signal) {
      const [typeaheadPayload, addressPayload] = await Promise.all([
        fetchJson("parcels/typeahead", { query }, signal),
        fetchJson("parcels/address", { query, limit: 10 }, signal),
      ]);

      const typeahead = Array.isArray(typeaheadPayload?.parcel_centroids?.features)
        ? typeaheadPayload.parcel_centroids.features.map(normalizeTypeaheadResult).filter((result) => result.llUuid)
        : [];

      const addressFeatures = Array.isArray(addressPayload?.parcels?.features)
        ? addressPayload.parcels.features.map(normalizeFeature)
        : [];

      return {
        searchResults: typeahead,
        lookup: {
          status: addressFeatures.length ? "found" : "not_found",
          provider: addressFeatures.length ? PARCEL_PROVIDERS.REGRID : PARCEL_PROVIDERS.NONE,
          features: addressFeatures,
          message: addressFeatures.length
            ? "Parcel matched from legacy Regrid address search."
            : "No parcel returned from the legacy Regrid address search.",
        },
      };
    },

    async detailByUuid(llUuid, signal) {
      const payload = await fetchJson(`parcels/${encodeURIComponent(llUuid)}`, {
        return_geometry: true,
      }, signal);
      return payload?.parcel ? normalizeFeature(payload.parcel) : null;
    },
  };
}
