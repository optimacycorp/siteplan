export type MapAnchor = {
  lng: number;
  lat: number;
  zoom: number;
};

export * from "./overlays/registry";

export type LocalPoint = {
  id: string;
  name: string;
  code: string;
  easting: number;
  northing: number;
};

export type LocalCoordinate = {
  x: number;
  y: number;
};

export type LocalExtents = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type SpatialTransformMethod = "anchor_normalized" | "projected_crs";

export type ProjectSpatialReference = {
  horizontalEpsg: number | null;
  horizontalName: string;
  horizontalDatum: string;
  verticalReference: string;
  units: string;
  geoidModel: string;
  transformMethod: SpatialTransformMethod;
  transformLastVerifiedAt: string | null;
  metadata: Record<string, unknown>;
};

export type ProjectDisplayTransform = {
  anchor: MapAnchor;
  spatialReference: ProjectSpatialReference;
  extents: LocalExtents;
};

export type LocalSegment = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export type MapPointProperties = {
  id: string;
  name: string;
  code: string;
};

export type MapLineProperties = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export type GeoJsonPointFeature = GeoJSON.Feature<GeoJSON.Point, MapPointProperties>;
export type GeoJsonLineFeature = GeoJSON.Feature<GeoJSON.LineString, MapLineProperties>;

export type ProjectMapCollections = {
  points: GeoJSON.FeatureCollection<GeoJSON.Point, MapPointProperties>;
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString, MapLineProperties>;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  zoom: number;
};

const defaultSpatialReference: ProjectSpatialReference = {
  horizontalEpsg: null,
  horizontalName: "Local grid",
  horizontalDatum: "",
  verticalReference: "",
  units: "us_survey_ft",
  geoidModel: "",
  transformMethod: "anchor_normalized",
  transformLastVerifiedAt: null,
  metadata: {},
};

function normalizeSpan(min: number, max: number) {
  return Math.max(max - min, 1);
}

export function computeLocalExtents(points: LocalCoordinate[]): LocalExtents {
  if (!points.length) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
    };
  }

  return points.reduce<LocalExtents>(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: points[0].x,
      maxX: points[0].x,
      minY: points[0].y,
      maxY: points[0].y,
    },
  );
}

export function createProjectDisplayTransform(
  anchor: MapAnchor,
  points: LocalCoordinate[],
  spatialReference: ProjectSpatialReference = defaultSpatialReference,
): ProjectDisplayTransform {
  return {
    anchor,
    spatialReference,
    extents: computeLocalExtents(points),
  };
}

export function projectLocalCoordinateWithTransform(
  point: LocalCoordinate,
  transform: ProjectDisplayTransform,
) {
  const { anchor, extents } = transform;
  const eastSpan = normalizeSpan(extents.minX, extents.maxX);
  const northSpan = normalizeSpan(extents.minY, extents.maxY);
  const lngOffset = ((point.x - extents.minX) / eastSpan - 0.5) * 0.018;
  const latOffset = ((point.y - extents.minY) / northSpan - 0.5) * 0.014;

  return {
    lng: anchor.lng + lngOffset,
    lat: anchor.lat + latOffset,
  };
}

export function projectLocalCoordinate(point: LocalCoordinate, extents: LocalExtents, anchor: MapAnchor) {
  return projectLocalCoordinateWithTransform(point, {
    anchor,
    extents,
    spatialReference: defaultSpatialReference,
  });
}

export function projectLocalRingToLngLatWithTransform(
  points: LocalCoordinate[],
  transform: ProjectDisplayTransform,
): [number, number][] {
  return points.map((point) => {
    const projected = projectLocalCoordinateWithTransform(point, transform);
    return [projected.lng, projected.lat];
  });
}

export function projectLocalRingToLngLat(points: LocalCoordinate[], extents: LocalExtents, anchor: MapAnchor): [number, number][] {
  return projectLocalRingToLngLatWithTransform(points, {
    anchor,
    extents,
    spatialReference: defaultSpatialReference,
  });
}

export function buildMapBoundsWithTransform(
  points: LocalCoordinate[],
  transform: ProjectDisplayTransform,
): [[number, number], [number, number]] {
  const { anchor } = transform;
  if (!points.length) {
    return [
      [anchor.lng - 0.001, anchor.lat - 0.001],
      [anchor.lng + 0.001, anchor.lat + 0.001],
    ];
  }

  const projected = points.map((point) => projectLocalCoordinateWithTransform(point, transform));
  const lngs = projected.map((point) => point.lng);
  const lats = projected.map((point) => point.lat);

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function buildMapBounds(points: LocalCoordinate[], extents: LocalExtents, anchor: MapAnchor): [[number, number], [number, number]] {
  return buildMapBoundsWithTransform(points, {
    anchor,
    extents,
    spatialReference: defaultSpatialReference,
  });
}

export function buildProjectMapCollections(
  points: LocalPoint[],
  segments: LocalSegment[],
  anchor: MapAnchor,
  spatialReference: ProjectSpatialReference = defaultSpatialReference,
): ProjectMapCollections {
  if (points.length === 0) {
    return {
      points: { type: "FeatureCollection", features: [] },
      lines: { type: "FeatureCollection", features: [] },
      bounds: [
        [anchor.lng - 0.001, anchor.lat - 0.001],
        [anchor.lng + 0.001, anchor.lat + 0.001],
      ],
      center: [anchor.lng, anchor.lat],
      zoom: anchor.zoom,
    };
  }

  const localCoordinates = points.map((point) => ({ x: point.easting, y: point.northing }));
  const transform = createProjectDisplayTransform(anchor, localCoordinates, spatialReference);

  const coordinateMap = new Map<string, { lng: number; lat: number }>();
  const pointFeatures: GeoJsonPointFeature[] = points.map((point) => {
    const coordinate = projectLocalCoordinateWithTransform(
      { x: point.easting, y: point.northing },
      transform,
    );
    coordinateMap.set(point.id, coordinate);

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [coordinate.lng, coordinate.lat],
      },
      properties: {
        id: point.id,
        name: point.name,
        code: point.code,
      },
    };
  });

  const lineFeatures: GeoJsonLineFeature[] = segments.flatMap((segment) => {
    const from = coordinateMap.get(segment.from);
    const to = coordinateMap.get(segment.to);
    if (!from || !to) {
      return [];
    }

    return [{
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
      properties: {
        id: segment.id,
        from: segment.from,
        to: segment.to,
        label: segment.label,
      },
    }];
  });

  return {
    points: { type: "FeatureCollection", features: pointFeatures },
    lines: { type: "FeatureCollection", features: lineFeatures },
    bounds: buildMapBoundsWithTransform(localCoordinates, transform),
    center: [anchor.lng, anchor.lat],
    zoom: anchor.zoom,
  };
}
