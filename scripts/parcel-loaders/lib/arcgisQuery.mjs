function buildWhereClause({ changedSince } = {}) {
  if (!changedSince) return "1=1";
  return `EditDate >= DATE '${changedSince}'`;
}

function buildGeometryClause(bbox) {
  if (!bbox) return null;
  const [xmin, ymin, xmax, ymax] = bbox;
  return JSON.stringify({
    xmin,
    ymin,
    xmax,
    ymax,
    spatialReference: { wkid: 4326 },
  });
}

async function fetchPage(serviceUrl, params, signal) {
  const url = new URL(`${serviceUrl.replace(/\/+$/, "")}/query`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`ArcGIS query failed (${response.status})`);
  }

  return response.json();
}

function parseGeoJsonFeatures(payload) {
  return Array.isArray(payload?.features) ? payload.features : [];
}

function parseEsriJsonFeatures(payload) {
  if (!Array.isArray(payload?.features)) return [];
  return payload.features.map((feature) => ({
    type: "Feature",
    geometry: feature?.geometry
      ? {
          type: "Polygon",
          coordinates: (feature.geometry.rings || []).map((ring) =>
            ring.map(([x, y]) => [Number(x), Number(y)]),
          ),
        }
      : null,
    properties: feature?.attributes ?? {},
  }));
}

export async function queryArcgisLayer(config, options = {}) {
  const {
    limit = config.pageSize || 1000,
    offset = 0,
    bbox = null,
    changedSince = "",
    signal,
  } = options;

  const baseParams = {
    where: buildWhereClause({ changedSince }),
    outFields: "*",
    returnGeometry: "true",
    outSR: String(config.targetSrid || 4326),
    resultOffset: String(offset),
    resultRecordCount: String(limit),
    geometry: buildGeometryClause(bbox),
    geometryType: bbox ? "esriGeometryEnvelope" : undefined,
    spatialRel: bbox ? "esriSpatialRelIntersects" : undefined,
  };

  try {
    const payload = await fetchPage(config.serviceUrl, {
      ...baseParams,
      f: "geojson",
    }, signal);

    return {
      format: "geojson",
      features: parseGeoJsonFeatures(payload),
      raw: payload,
    };
  } catch {
    const payload = await fetchPage(config.serviceUrl, {
      ...baseParams,
      f: "json",
    }, signal);

    return {
      format: "esri-json",
      features: parseEsriJsonFeatures(payload),
      raw: payload,
    };
  }
}
