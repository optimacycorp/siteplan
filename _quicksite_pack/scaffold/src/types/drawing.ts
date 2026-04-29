export type DrawingMode = "select" | "structure-polygon" | "driveway-line" | "easement-line" | "dimension-line" | "label-point";

export type LngLatPoint = { lng: number; lat: number };

export type DrawingFeature = {
  id: string;
  type: DrawingMode;
  label: string;
  points: LngLatPoint[];
  createdAt: string;
};
