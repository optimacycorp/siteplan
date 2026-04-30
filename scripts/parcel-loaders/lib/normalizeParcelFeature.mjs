function detectFieldName(properties, candidates) {
  const keys = Object.keys(properties || {});
  const lowered = new Map(keys.map((key) => [key.toLowerCase(), key]));
  for (const candidate of candidates) {
    const match = lowered.get(String(candidate).toLowerCase());
    if (match) return match;
  }
  return "";
}

function pickValue(properties, fieldName) {
  if (!fieldName) return "";
  const value = properties?.[fieldName];
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeGeometry(geometry) {
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return null;
  }

  if (geometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [geometry.coordinates],
    };
  }

  return geometry;
}

export function detectFieldMapping(config, properties) {
  return {
    externalId: detectFieldName(properties, config.idFieldCandidates),
    parcelNumber: detectFieldName(properties, config.parcelNumberCandidates),
    situsAddress: detectFieldName(properties, config.addressCandidates),
    ownerName: detectFieldName(properties, config.ownerCandidates),
    legalDescription: detectFieldName(properties, config.legalCandidates),
  };
}

export function normalizeParcelFeature(feature, config, fieldMapping = null) {
  const properties = feature?.properties ?? {};
  const mapping = fieldMapping ?? detectFieldMapping(config, properties);
  const geometry = normalizeGeometry(feature?.geometry ?? null);
  const acreageValue = Number(properties.ACRES ?? properties.ACREAGE ?? 0);
  const shapeAreaSqft = Number(properties["Shape.STArea()"] ?? properties.Shape_Area ?? 0);
  const derivedAcreage = Number.isFinite(acreageValue) && acreageValue > 0
    ? acreageValue
    : Number.isFinite(shapeAreaSqft) && shapeAreaSqft > 0
      ? shapeAreaSqft / 43560
      : 0;

  return {
    source_key: config.sourceKey,
    external_id: pickValue(properties, mapping.externalId),
    parcel_number: pickValue(properties, mapping.parcelNumber),
    situs_address: pickValue(properties, mapping.situsAddress),
    owner_name: pickValue(properties, mapping.ownerName),
    legal_description: pickValue(properties, mapping.legalDescription),
    acreage: derivedAcreage,
    geometry,
    properties,
    fieldMapping: mapping,
  };
}
