export type OverlayCategory = "parcel" | "constraint" | "site" | "survey";

export type OverlayDefinition = {
  key: string;
  label: string;
  category: OverlayCategory;
  defaultVisible: boolean;
  defaultOpacity: number;
};

export const overlayRegistry: OverlayDefinition[] = [
  { key: "raw_parcel", label: "Raw parcel", category: "parcel", defaultVisible: true, defaultOpacity: 1 },
  { key: "normalized_parcel", label: "Normalized parcel", category: "parcel", defaultVisible: false, defaultOpacity: 0.95 },
  { key: "buildable_envelope", label: "Buildable envelope", category: "parcel", defaultVisible: true, defaultOpacity: 0.95 },
  { key: "frontage_edges", label: "Frontage edges", category: "parcel", defaultVisible: true, defaultOpacity: 1 },
  { key: "constraints", label: "Constraints", category: "constraint", defaultVisible: true, defaultOpacity: 0.85 },
  { key: "roads", label: "Roads", category: "site", defaultVisible: true, defaultOpacity: 0.9 },
  { key: "buildings", label: "Buildings", category: "site", defaultVisible: true, defaultOpacity: 0.9 },
  { key: "trees", label: "Trees", category: "site", defaultVisible: false, defaultOpacity: 0.8 },
  { key: "utilities", label: "Utilities", category: "site", defaultVisible: false, defaultOpacity: 0.85 },
  { key: "contours", label: "Contours", category: "survey", defaultVisible: false, defaultOpacity: 0.8 },
  { key: "lot_labels", label: "Lot labels", category: "survey", defaultVisible: true, defaultOpacity: 1 },
  { key: "block_labels", label: "Block labels", category: "survey", defaultVisible: false, defaultOpacity: 1 },
];
