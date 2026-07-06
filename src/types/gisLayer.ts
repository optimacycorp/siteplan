export type GisLayerSourceType =
  | "geojson"
  | "csv"
  | "arcgis"
  | "kml"
  | "shapefile"
  | "dxf";

export type GisLayer = {
  id: string;
  name: string;
  sourceType: GisLayerSourceType;
  sourceName: string;
  sourceUrl?: string;
  geometryTypes: string[];
  featureCount: number;
  visible: boolean;
  crsName?: string;
  warnings: string[];
  importedAt: string;
  data: GeoJSON.FeatureCollection;
};
