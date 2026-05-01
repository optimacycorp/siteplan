export async function upsertParcel({ supabaseUrl, serviceRoleKey, parcel, signal }) {
  const baseUrl = String(supabaseUrl || "").replace(/\/+$/, "");
  if (!baseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for parcel upserts.");
  }

  const payload = {
    source_key: parcel.source_key,
    external_id: parcel.external_id || null,
    parcel_number: parcel.parcel_number || null,
    apn: parcel.apn || null,
    schedule_number: parcel.schedule_number || null,
    situs_address: parcel.situs_address || null,
    owner_name: parcel.owner_name || null,
    legal_description: parcel.legal_description || null,
    land_use: parcel.land_use || null,
    zoning: parcel.zoning || null,
    acreage: Number.isFinite(parcel.acreage) ? parcel.acreage : null,
    properties: {
      ...parcel.properties,
      county: parcel.properties?.county || "El Paso",
      state: parcel.properties?.state || "CO",
    },
    geom: parcel.geometry,
  };

  const response = await fetch(`${baseUrl}/rest/v1/parcels?on_conflict=source_key,external_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase parcel upsert failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}
