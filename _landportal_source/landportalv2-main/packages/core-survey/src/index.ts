import { distance, lineLength, normalizeAzimuth, polygonArea, toRadians, type Point2D } from "@landportal/core-geometry";

import { buildSurveyCopilotSummary, type SurveyCopilotSummary } from "./assistant";
import { bearingFromPoints, bearingLabelFromAzimuth, type SurveyBearingLabel } from "./bearings";
import { computeClosureMetrics, validateClosure, type ClosureMetrics } from "./closures";
import { parseDescriptionCalls, type ParsedDescriptionCall } from "./descriptionParser";
import { buildClosedPolygon } from "./geometry";
import { generateDraftLegalDescription, generateLegalCalls, type LegalCall } from "./legalDescription";
import {
  buildSurveyReviewSummary,
  exportReconstructedPointsCsv,
  renderSurveyAuditTrail,
  renderSurveyReviewSummary,
  type SurveyReviewSummaryModel,
} from "./outputs";
import { reconstructDescriptionBoundary, type DescriptionReconstruction } from "./reconstruction";
import { reviewDescriptionReconstruction, type SurveyIssue, type SurveyIssueSeverity } from "./validation";

export type SurveyCoordinate = Point2D;
export type SurveyMeasurementUnit = "us_survey_ft" | "international_ft" | "meters";
export type SurveyReferenceSystem = "local-grid" | "state-plane" | "utm" | "assumed-basis";
export type SurveyBoundarySource = "parcel_analysis" | "title_reconstruction" | "manual";
export type SurveyBearing = {
  azimuth: number;
  label: string;
  length: number;
};

export type SurveyParcel = {
  id: string;
  boundary: SurveyCoordinate[];
  area: number;
  bearings: SurveyBearing[];
  closure: ReturnType<typeof validateClosure>;
  source: SurveyBoundarySource;
};

export type SurveyAlignment = {
  id: string;
  start: SurveyCoordinate;
  end: SurveyCoordinate;
  length: number;
  bearing: string;
};

export type ControlPoint = {
  id: string;
  northing: number;
  easting: number;
  elevation?: number;
};

export type SurveyAnnotation = {
  id: string;
  type: "bearing" | "distance" | "note" | "leader";
  text: string;
  geometry: SurveyCoordinate[];
};

export type SurveyProjectState = {
  referenceSystem: SurveyReferenceSystem;
  measurementUnit: SurveyMeasurementUnit;
  parcels: SurveyParcel[];
  alignments: SurveyAlignment[];
  controlPoints: ControlPoint[];
  issues: SurveyIssue[];
  auditTrail: SurveyAuditEntry[];
};

export type SurveyAuditEntry = {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
};

export type TraverseOrigin = {
  label: string;
  easting: number;
  northing: number;
};

export type TraverseSegmentInput = {
  id: string;
  label: string;
  azimuth: number;
  distance: number;
};

export type TraversePoint = {
  id: string;
  label: string;
  easting: number;
  northing: number;
};

export type ClosureResult = {
  points: TraversePoint[];
  totalDistance: number;
  closureDistance: number;
  precisionRatio: number | null;
  deltaEasting: number;
  deltaNorthing: number;
};

export { normalizeAzimuth };
export { bearingFromPoints, bearingLabelFromAzimuth, computeClosureMetrics, generateDraftLegalDescription, generateLegalCalls, validateClosure };
export { buildSurveyCopilotSummary };
export { buildSurveyReviewSummary, exportReconstructedPointsCsv, renderSurveyAuditTrail, renderSurveyReviewSummary };
export { parseDescriptionCalls, reconstructDescriptionBoundary };
export { reviewDescriptionReconstruction };
export type {
  ClosureMetrics,
  DescriptionReconstruction,
  LegalCall,
  ParsedDescriptionCall,
  SurveyBearingLabel,
  SurveyCopilotSummary,
  SurveyIssue,
  SurveyIssueSeverity,
  SurveyReviewSummaryModel,
};

export function buildSurveyParcel(
  id: string,
  boundary: SurveyCoordinate[],
  source: SurveyBoundarySource = "manual",
): SurveyParcel {
  const polygon = buildClosedPolygon(boundary);
  const bearings = polygon.points.length
    ? polygon.points.slice(0, -1).map((point, index) => {
      const next = polygon.points[index + 1] as SurveyCoordinate;
      const bearing = bearingFromPoints(point, next);
      return {
        azimuth: bearing.azimuth,
        label: bearing.label,
        length: bearing.length,
      };
    })
    : [];

  return {
    id,
    boundary: polygon.points,
    area: polygonArea(polygon.points),
    bearings,
    closure: validateClosure(polygon.points),
    source,
  };
}

export function buildSurveyAlignment(id: string, start: SurveyCoordinate, end: SurveyCoordinate): SurveyAlignment {
  const azimuth = normalizeAzimuth((Math.atan2(end.x - start.x, end.y - start.y) * 180) / Math.PI);
  return {
    id,
    start,
    end,
    length: lineLength(start, end),
    bearing: azimuth.toFixed(2),
  };
}

export function computeTraverse(origin: TraverseOrigin, segments: TraverseSegmentInput[]): ClosureResult {
  const points: TraversePoint[] = [
    {
      id: "origin",
      label: origin.label,
      easting: origin.easting,
      northing: origin.northing,
    },
  ];

  let currentEasting = origin.easting;
  let currentNorthing = origin.northing;
  let totalDistance = 0;

  segments.forEach((segment, index) => {
    const azimuth = normalizeAzimuth(segment.azimuth);
    const radians = toRadians(azimuth);
    const deltaNorthing = Math.cos(radians) * segment.distance;
    const deltaEasting = Math.sin(radians) * segment.distance;

    currentEasting += deltaEasting;
    currentNorthing += deltaNorthing;
    totalDistance += segment.distance;

    points.push({
      id: segment.id,
      label: segment.label || `PT-${index + 1}`,
      easting: currentEasting,
      northing: currentNorthing,
    });
  });

  const deltaEasting = currentEasting - origin.easting;
  const deltaNorthing = currentNorthing - origin.northing;
  const closureDistance = distance(deltaEasting, deltaNorthing);

  return {
    points,
    totalDistance,
    closureDistance,
    precisionRatio: closureDistance === 0 ? null : totalDistance / closureDistance,
    deltaEasting,
    deltaNorthing,
  };
}

export function formatPrecisionRatio(value: number | null) {
  if (!value || !Number.isFinite(value)) {
    return "Perfect closure";
  }

  return `1:${Math.round(value).toLocaleString()}`;
}

export function exportTraverseCsv(origin: TraverseOrigin, segments: TraverseSegmentInput[], result: ClosureResult) {
  const header = [
    "type",
    "label",
    "azimuth_deg",
    "distance_ft",
    "easting_ft",
    "northing_ft",
  ];

  const rows = [header.join(",")];
  rows.push([
    "origin",
    origin.label,
    "",
    "",
    origin.easting.toFixed(3),
    origin.northing.toFixed(3),
  ].join(","));

  segments.forEach((segment, index) => {
    const point = result.points[index + 1];
    rows.push([
      "segment",
      segment.label,
      normalizeAzimuth(segment.azimuth).toFixed(4),
      segment.distance.toFixed(3),
      point?.easting.toFixed(3) ?? "",
      point?.northing.toFixed(3) ?? "",
    ].join(","));
  });

  return rows.join("\n");
}
