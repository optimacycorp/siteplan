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
    apn: detectFieldName(properties, config.apnCandidates ?? []),
    scheduleNumber: detectFieldName(properties, config.scheduleCandidates ?? []),
    situsAddress: detectFieldName(properties, config.addressCandidates),
    ownerName: detectFieldName(properties, config.ownerCandidates),
    legalDescription: detectFieldName(properties, config.legalCandidates),
    zoning: detectFieldName(properties, config.zoningCandidates ?? []),
    landUse: detectFieldName(properties, config.landUseCandidates ?? []),
    sourceUrl: detectFieldName(properties, config.sourceUrlCandidates ?? []),
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

  const cleanedParcelNumber = pickValue(properties, mapping.parcelNumber);
  const cleanedApn = pickValue(properties, mapping.apn) || cleanedParcelNumber;
  const cleanedScheduleNumber = pickValue(properties, mapping.scheduleNumber) || cleanedParcelNumber;
  const cleanedAddress = pickValue(properties, mapping.situsAddress);
  const cleanedOwner = pickValue(properties, mapping.ownerName);
  const cleanedLegal = pickValue(properties, mapping.legalDescription);
  const cleanedZoning = pickValue(properties, mapping.zoning);
  const cleanedLandUse = pickValue(properties, mapping.landUse);
  const cleanedSourceUrl = pickValue(properties, mapping.sourceUrl) || pickValue(properties, "HYPERLINK");

  return {
    source_key: config.sourceKey,
    external_id: pickValue(properties, mapping.externalId),
    parcel_number: cleanedParcelNumber,
    apn: cleanedApn,
    schedule_number: cleanedScheduleNumber,
    situs_address: cleanedAddress,
    owner_name: cleanedOwner,
    legal_description: cleanedLegal,
    land_use: cleanedLandUse,
    zoning: cleanedZoning,
    acreage: derivedAcreage,
    geometry,
    properties: {
      ...properties,
      PARCEL: cleanedParcelNumber || properties.PARCEL || "",
      APN: cleanedApn || properties.APN || "",
      SCHEDULE: cleanedScheduleNumber || properties.SCHEDULE || "",
      ZONING: cleanedZoning || properties.ZONING || "",
      LAND_USE: cleanedLandUse || properties.LAND_USE || "",
      HYPERLINK: cleanedSourceUrl || properties.HYPERLINK || "",
      county: String(properties.county || "El Paso"),
      state: String(properties.state || "CO"),
    },
    fieldMapping: mapping,
  };
}
