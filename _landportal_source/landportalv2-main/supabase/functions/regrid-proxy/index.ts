const REGRID_API_TOKEN = Deno.env.get("REGRID_API_TOKEN") ?? "";
const REGRID_PARCEL_API_BASE = (Deno.env.get("REGRID_PARCEL_API_BASE") ?? "https://app.regrid.com").replace(/\/$/, "");
const REGRID_TILE_API_BASE = (Deno.env.get("REGRID_TILE_API_BASE") ?? "https://tiles.regrid.com").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TileJsonResponse = {
  id?: string;
  name?: string;
  tiles?: string[];
  vector?: string[];
  minzoom?: number;
  maxzoom?: number;
  attribution?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function text(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: corsHeaders,
  });
}

function requireToken() {
  if (!REGRID_API_TOKEN) {
    throw new Error("REGRID_API_TOKEN is not configured for the regrid-proxy function.");
  }
}

function upstreamParcelUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, REGRID_PARCEL_API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set("token", REGRID_API_TOKEN);
  return url.toString();
}

function upstreamTileUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, REGRID_TILE_API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set("token", REGRID_API_TOKEN);
  return url.toString();
}

async function fetchUpstream(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upstream Regrid request failed (${response.status}): ${body}`);
  }
  return response;
}

function inferFunctionBase(url: URL) {
  const marker = "/functions/v1/regrid-proxy";
  const index = url.pathname.indexOf(marker);
  const forwardedProto = url.protocol === "http:" ? "https:" : url.protocol;
  const origin = `${forwardedProto}//${url.host}`;
  if (index === -1) return `${origin}/functions/v1/regrid-proxy`;
  return `${origin}${url.pathname.slice(0, index + marker.length)}`;
}

function resolveRoutePath(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const patterns = [
    /^.*\/functions\/v1\/regrid-proxy(\/.*)?$/i,
    /^\/regrid-proxy(\/.*)?$/i,
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match) {
      return match[1] && match[1].length ? match[1] : "/";
    }
  }

  return pathname;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    requireToken();

    const url = new URL(request.url);
    const functionBase = inferFunctionBase(url);
    const routePath = resolveRoutePath(url);

    if (routePath === "/tilejson") {
      const upstream = await fetchUpstream(upstreamTileUrl("/api/v1/parcels", { format: "mvt" }));
      const tileJson = await upstream.json() as TileJsonResponse;
      const tileUrl = `${functionBase}/tiles/{z}/{x}/{y}.mvt`;

      return json({
        id: tileJson.id ?? "parcels",
        attribution: tileJson.attribution ?? "&copy; Regrid",
        minzoom: tileJson.minzoom ?? 10,
        maxzoom: tileJson.maxzoom ?? 21,
        tiles: [tileUrl],
      });
    }

    if (routePath.startsWith("/tiles/")) {
      const tilePath = routePath.replace(/^\/tiles\//, "");
      const upstream = await fetchUpstream(upstreamTileUrl(`/api/v1/parcels/${tilePath}`, {}));
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("Content-Type") ?? "application/vnd.mapbox-vector-tile",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    if (routePath === "/search") {
      const query = url.searchParams.get("query") ?? "";
      const upstream = await fetchUpstream(upstreamParcelUrl("/api/v2/parcels/typeahead", { query }));
      const data = await upstream.json() as {
        parcel_centroids?: {
          features?: Array<{
            geometry?: { coordinates?: [number, number] };
            properties?: {
              ll_uuid?: string;
              address?: string;
              context?: string;
              path?: string;
              score?: number;
            };
          }>;
        };
      };

      const seen = new Set<string>();
      const results = (data.parcel_centroids?.features ?? []).flatMap((feature) => {
        const llUuid = feature.properties?.ll_uuid;
        if (!llUuid || seen.has(llUuid)) return [];
        seen.add(llUuid);
        return [{
          llUuid,
          address: String(feature.properties?.address ?? ""),
          context: String(feature.properties?.context ?? ""),
          path: String(feature.properties?.path ?? ""),
          score: Number(feature.properties?.score ?? 0),
          coordinates:
            Array.isArray(feature.geometry?.coordinates) && feature.geometry.coordinates.length >= 2
              ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
              : null,
        }];
      });

      return json(results);
    }

    if (routePath === "/point") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      const radius = url.searchParams.get("radius") ?? "4";
      if (!lat || !lng) return text("Missing lat/lng", 400);

      const upstream = await fetchUpstream(upstreamParcelUrl("/api/v2/parcels/point", {
        lat,
        lon: lng,
        radius,
        limit: 1,
        return_geometry: true,
      }));
      const data = await upstream.json() as { parcels?: { features?: Array<unknown> } };
      return json({
        feature: data.parcels?.features?.[0] ?? null,
      });
    }

    if (routePath === "/neighbors") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      const radius = url.searchParams.get("radius") ?? "250";
      const limit = url.searchParams.get("limit") ?? "24";
      const exclude = url.searchParams.get("exclude") ?? "";
      if (!lat || !lng) return text("Missing lat/lng", 400);

      const upstream = await fetchUpstream(upstreamParcelUrl("/api/v2/parcels/point", {
        lat,
        lon: lng,
        radius,
        limit,
        return_geometry: true,
      }));
      const data = await upstream.json() as { parcels?: { features?: Array<Record<string, unknown>> } };
      const features = (data.parcels?.features ?? []).filter((feature) => {
        const properties = feature.properties as { ll_uuid?: string } | undefined;
        return properties?.ll_uuid !== exclude;
      });

      return json({
        features,
      });
    }

    if (routePath.startsWith("/detail/")) {
      const llUuid = decodeURIComponent(routePath.replace("/detail/", ""));
      if (!llUuid) return text("Missing ll_uuid", 400);

      const upstream = await fetchUpstream(upstreamParcelUrl(`/api/v2/parcels/${llUuid}`, {
        return_geometry: true,
      }));
      const data = await upstream.json() as { parcels?: { features?: Array<unknown> } };
      return json({
        feature: data.parcels?.features?.[0] ?? null,
      });
    }

    return text("Not found", 404);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unexpected regrid-proxy error" },
      500,
    );
  }
});
