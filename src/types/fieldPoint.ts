export type PointImportFormat = "local-xy-csv" | "emlid-flow-360-csv";

export type ImportedPoint = {
  id: string;
  pointNumber: string;
  name: string;
  code?: string;
  note?: string;
  northing?: number;
  easting?: number;
  elevation?: number;
  lng: number;
  lat: number;
  source: PointImportFormat;
  createdAt: string;
};

export type LocalPointTransform = {
  mode: "local-xy";
  units: "feet" | "meters";
  origin: { lng: number; lat: number; label: string } | null;
  rotationDegrees: number;
  scaleFactor: number;
};

export type ParsedFieldPointRow = {
  pointNumber: string;
  name: string;
  code?: string;
  note?: string;
  northing?: number;
  easting?: number;
  elevation?: number;
  lng?: number;
  lat?: number;
  sourceFormat: PointImportFormat;
};
