const proxyBaseUrl =
  import.meta.env.VITE_PARCEL_PROXY_BASE_URL ??
  import.meta.env.VITE_REGRID_PROXY_BASE_URL ??
  "/regrid/";

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const base = proxyBaseUrl.endsWith("/") ? proxyBaseUrl : `${proxyBaseUrl}/`;
  const resolvedBase = /^https?:\/\//i.test(base)
    ? base
    : new URL(base.replace(/^\.\//, "").replace(/^\/?/, "/"), window.location.origin).toString();
  const url = new URL(path.replace(/^\/+/, ""), resolvedBase);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export async function fetchTerrainContours(input: {
  bbox: [number, number, number, number];
  units: "feet" | "meters";
  signal?: AbortSignal;
}) {
  const response = await fetch(
    buildUrl("terrain/contours", {
      bbox: input.bbox.join(","),
      units: input.units,
    }),
    {
      signal: input.signal,
    },
  );

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new Error(
      (payload && typeof payload.error === "string" && payload.error) ||
        `Terrain request failed (${response.status})`,
    );
  }

  return response.json() as Promise<GeoJSON.FeatureCollection>;
}
