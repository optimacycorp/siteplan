const usgsContourQueryUrl =
  process.env.USGS_CONTOUR_QUERY_URL ||
  "https://cartowfs.nationalmap.gov/arcgis/rest/services/contours/MapServer/0/query";

function normalizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectElevationFeet(attributes) {
  const feetKeys = ["ELEV_FT", "CONTOUR_FT", "ELEVATION_FT", "ELEVFT"];
  for (const key of feetKeys) {
    const value = normalizeNumber(attributes?.[key]);
    if (value !== null) return value;
  }

  const meters = detectElevationMeters(attributes);
  return meters !== null ? meters * 3.28084 : null;
}

function detectElevationMeters(attributes) {
  const meterKeys = [
    "CONTOURELE",
    "Contour",
    "CONTOUR",
    "ELEV",
    "ELEV_M",
    "ELEVATION",
    "Z",
  ];

  for (const key of meterKeys) {
    const value = normalizeNumber(attributes?.[key]);
    if (value !== null) return value;
  }

  return null;
}

function toGeoJsonGeometry(geometry) {
  if (!geometry?.paths?.length) return null;
  if (geometry.paths.length === 1) {
    return {
      type: "LineString",
      coordinates: geometry.paths[0],
    };
  }
  return {
    type: "MultiLineString",
    coordinates: geometry.paths,
  };
}

function buildLabel(attributes, units) {
  const value =
    units === "feet" ? detectElevationFeet(attributes) : detectElevationMeters(attributes);
  if (value === null) return "";
  return `${Math.round(value)} ${units === "feet" ? "ft" : "m"}`;
}

function convertArcGisFeaturesToGeoJson(features, units) {
  return {
    type: "FeatureCollection",
    features: (features || []).flatMap((feature, index) => {
      const geometry = toGeoJsonGeometry(feature.geometry);
      if (!geometry) return [];
      return [
        {
          type: "Feature",
          properties: {
            id: String(feature.attributes?.OBJECTID ?? feature.attributes?.FID ?? index),
            elevationFeet: detectElevationFeet(feature.attributes),
            elevationMeters: detectElevationMeters(feature.attributes),
            label: buildLabel(feature.attributes, units),
          },
          geometry,
        },
      ];
    }),
  };
}

export async function fetchUsgsContourGeoJson({ bbox, units = "feet", signal }) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const requestUrl = new URL(usgsContourQueryUrl);
  requestUrl.searchParams.set("f", "json");
  requestUrl.searchParams.set("where", "1=1");
  requestUrl.searchParams.set("returnGeometry", "true");
  requestUrl.searchParams.set("outFields", "*");
  requestUrl.searchParams.set("geometryType", "esriGeometryEnvelope");
  requestUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  requestUrl.searchParams.set("inSR", "4326");
  requestUrl.searchParams.set("outSR", "4326");
  requestUrl.searchParams.set("geometry", `${minLng},${minLat},${maxLng},${maxLat}`);

  const response = await fetch(requestUrl, {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": process.env.GEOCODER_USER_AGENT || "OptimacyQuickSite/0.1 (+https://siteplan.gomil.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`USGS contour query failed (${response.status})`);
  }

  const payload = await response.json();
  return convertArcGisFeaturesToGeoJson(payload.features, units);
}
