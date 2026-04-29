export type DrawingMode =
  | "select"
  | "structure-polygon"
  | "driveway-line"
  | "easement-line"
  | "dimension-line"
  | "label-point";

export type DrawingFeatureType = Exclude<DrawingMode, "select">;

export type LngLatPoint = { lng: number; lat: number };

export type DrawingFeature = {
  id: string;
  type: DrawingFeatureType;
  label: string;
  points: LngLatPoint[];
  createdAt: string;
};
