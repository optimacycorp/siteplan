import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  buildSurveyParcel,
  reviewDescriptionReconstruction,
  type ControlPoint,
  type DescriptionReconstruction,
  type SurveyAlignment,
  type SurveyAuditEntry,
  type SurveyCoordinate,
  type SurveyIssue,
  type SurveyMeasurementUnit,
  type SurveyParcel,
  type SurveyReferenceSystem,
} from "@landportal/core-survey";

export type SurveyMode = "view" | "draw" | "edit" | "analyze" | "export";

type ProjectSurveySelection = {
  mode: SurveyMode;
  activeSurveyParcelId?: string;
  referenceSystem: SurveyReferenceSystem;
  measurementUnit: SurveyMeasurementUnit;
  parcels: SurveyParcel[];
  alignments: SurveyAlignment[];
  controlPoints: ControlPoint[];
  issues: SurveyIssue[];
  auditTrail: SurveyAuditEntry[];
};

type ProjectSurveyState = {
  selections: Record<string, ProjectSurveySelection>;
  setMode: (projectId: string, mode: SurveyMode) => void;
  setActiveSurveyParcelId: (projectId: string, parcelId?: string) => void;
  setReferenceSystem: (projectId: string, referenceSystem: SurveyReferenceSystem) => void;
  setMeasurementUnit: (projectId: string, measurementUnit: SurveyMeasurementUnit) => void;
  syncSurveyParcelFromBoundary: (projectId: string, parcelId: string, boundary: SurveyCoordinate[]) => void;
  recordDescriptionReview: (
    projectId: string,
    reviewId: string,
    reconstruction: DescriptionReconstruction,
    ignoredLineCount: number,
  ) => void;
  promoteDescriptionParcel: (
    projectId: string,
    parcelId: string,
    reconstruction: DescriptionReconstruction,
  ) => void;
  upsertAlignment: (projectId: string, alignment: SurveyAlignment) => void;
  upsertControlPoint: (projectId: string, controlPoint: ControlPoint) => void;
  clearProjectSurvey: (projectId: string) => void;
};

function defaultSurveySelection(): ProjectSurveySelection {
  return {
    mode: "view",
    referenceSystem: "local-grid",
    measurementUnit: "us_survey_ft",
    parcels: [],
    alignments: [],
    controlPoints: [],
    issues: [],
    auditTrail: [],
  };
}

function updateSelection(
  selections: Record<string, ProjectSurveySelection>,
  projectId: string,
  patch: Partial<ProjectSurveySelection>,
) {
  return {
    ...selections,
    [projectId]: {
      ...defaultSurveySelection(),
      ...selections[projectId],
      ...patch,
    },
  };
}

function sameBoundary(left: SurveyCoordinate[], right: SurveyCoordinate[]) {
  if (left.length !== right.length) return false;
  return left.every((point, index) => {
    const other = right[index];
    return other?.x === point.x && other?.y === point.y;
  });
}

export const useProjectSurveyStore = create<ProjectSurveyState>()(
  persist(
    (set) => ({
      selections: {},
      setMode: (projectId, mode) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { mode }),
        })),
      setActiveSurveyParcelId: (projectId, activeSurveyParcelId) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { activeSurveyParcelId }),
        })),
      setReferenceSystem: (projectId, referenceSystem) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { referenceSystem }),
        })),
      setMeasurementUnit: (projectId, measurementUnit) =>
        set((state) => ({
          selections: updateSelection(state.selections, projectId, { measurementUnit }),
        })),
      syncSurveyParcelFromBoundary: (projectId, parcelId, boundary) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultSurveySelection();
          const existingParcel = current.parcels.find((parcel) => parcel.id === parcelId);
          if (
            existingParcel
            && existingParcel.source === "parcel_analysis"
            && sameBoundary(existingParcel.boundary, boundary)
          ) {
            if (current.activeSurveyParcelId) {
              return state;
            }

            return {
              selections: updateSelection(state.selections, projectId, {
                activeSurveyParcelId: parcelId,
              }),
            };
          }

          const nextParcel = buildSurveyParcel(parcelId, boundary, "parcel_analysis");
          const parcels = current.parcels.some((parcel) => parcel.id === parcelId)
            ? current.parcels.map((parcel) => parcel.id === parcelId ? nextParcel : parcel)
            : [...current.parcels, nextParcel];
          const issues = [
            ...current.issues.filter((issue) => issue.id !== `${parcelId}-closure`),
            ...(nextParcel.closure.withinTolerance
              ? []
              : [{
                id: `${parcelId}-closure`,
                severity: "error" as const,
                code: "PARCEL_NON_CLOSURE",
                message: `${parcelId}: closure error ${nextParcel.closure.closureError.toFixed(3)} exceeds tolerance.`,
                source: "parcel" as const,
              }]),
          ];
          const auditTrail = [
            {
              id: `audit-${Date.now()}`,
              action: "parcel_sync",
              detail: `Synced parcel ${parcelId} into canonical survey state.`,
              timestamp: new Date().toISOString(),
            },
            ...current.auditTrail,
          ].slice(0, 25);

          return {
            selections: updateSelection(state.selections, projectId, {
              parcels,
              issues,
              activeSurveyParcelId: current.activeSurveyParcelId || parcelId,
              auditTrail,
            }),
          };
        }),
      recordDescriptionReview: (projectId, reviewId, reconstruction, ignoredLineCount) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultSurveySelection();
          const reviewIssues = reviewDescriptionReconstruction(reconstruction, ignoredLineCount).map((issue) => ({
            ...issue,
            id: `${reviewId}-${issue.id}`,
          }));
          const issues = [
            ...current.issues.filter((issue) => !issue.id.startsWith(`${reviewId}-`)),
            ...reviewIssues,
          ];
          const auditTrail = [
            {
              id: `audit-${Date.now()}`,
              action: "description_review",
              detail: `Saved description review with ${reconstruction.parsedCallCount} parsed call${reconstruction.parsedCallCount === 1 ? "" : "s"}.`,
              timestamp: new Date().toISOString(),
            },
            ...current.auditTrail,
          ].slice(0, 25);

          return {
            selections: updateSelection(state.selections, projectId, {
              issues,
              auditTrail,
            }),
          };
        }),
      promoteDescriptionParcel: (projectId, parcelId, reconstruction) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultSurveySelection();
          const promotedParcel = buildSurveyParcel(parcelId, reconstruction.points, "title_reconstruction");
          const parcels = current.parcels.some((parcel) => parcel.id === parcelId)
            ? current.parcels.map((parcel) => (parcel.id === parcelId ? promotedParcel : parcel))
            : [...current.parcels, promotedParcel];
          const auditTrail = [
            {
              id: `audit-${Date.now()}`,
              action: "description_promote",
              detail: `Promoted reconstructed description into survey parcel ${parcelId}.`,
              timestamp: new Date().toISOString(),
            },
            ...current.auditTrail,
          ].slice(0, 25);

          return {
            selections: updateSelection(state.selections, projectId, {
              parcels,
              activeSurveyParcelId: parcelId,
              auditTrail,
            }),
          };
        }),
      upsertAlignment: (projectId, alignment) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultSurveySelection();
          const alignments = current.alignments.some((item) => item.id === alignment.id)
            ? current.alignments.map((item) => item.id === alignment.id ? alignment : item)
            : [...current.alignments, alignment];
          const auditTrail = [
            {
              id: `audit-${Date.now()}`,
              action: "alignment_upsert",
              detail: `Updated survey alignment ${alignment.id}.`,
              timestamp: new Date().toISOString(),
            },
            ...current.auditTrail,
          ].slice(0, 25);

          return {
            selections: updateSelection(state.selections, projectId, { alignments, auditTrail }),
          };
        }),
      upsertControlPoint: (projectId, controlPoint) =>
        set((state) => {
          const current = state.selections[projectId] ?? defaultSurveySelection();
          const controlPoints = current.controlPoints.some((item) => item.id === controlPoint.id)
            ? current.controlPoints.map((item) => item.id === controlPoint.id ? controlPoint : item)
            : [...current.controlPoints, controlPoint];
          const auditTrail = [
            {
              id: `audit-${Date.now()}`,
              action: "control_point_upsert",
              detail: `Updated control point ${controlPoint.id}.`,
              timestamp: new Date().toISOString(),
            },
            ...current.auditTrail,
          ].slice(0, 25);

          return {
            selections: updateSelection(state.selections, projectId, { controlPoints, auditTrail }),
          };
        }),
      clearProjectSurvey: (projectId) =>
        set((state) => {
          const next = { ...state.selections };
          delete next[projectId];
          return { selections: next };
        }),
    }),
    {
      name: "landportal-project-survey",
      partialize: (state) => ({ selections: state.selections }),
    },
  ),
);
