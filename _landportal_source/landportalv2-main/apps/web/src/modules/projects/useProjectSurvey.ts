import { useMemo } from "react";

import { useProjectSurveyStore, type SurveyMode } from "./projectSurveyStore";

export function useProjectSurvey(projectId: string) {
  const selection = useProjectSurveyStore((state) => state.selections[projectId]);
  const setMode = useProjectSurveyStore((state) => state.setMode);
  const setActiveSurveyParcelId = useProjectSurveyStore((state) => state.setActiveSurveyParcelId);
  const setReferenceSystem = useProjectSurveyStore((state) => state.setReferenceSystem);
  const setMeasurementUnit = useProjectSurveyStore((state) => state.setMeasurementUnit);
  const syncSurveyParcelFromBoundary = useProjectSurveyStore((state) => state.syncSurveyParcelFromBoundary);
  const recordDescriptionReview = useProjectSurveyStore((state) => state.recordDescriptionReview);
  const promoteDescriptionParcel = useProjectSurveyStore((state) => state.promoteDescriptionParcel);
  const upsertAlignment = useProjectSurveyStore((state) => state.upsertAlignment);
  const upsertControlPoint = useProjectSurveyStore((state) => state.upsertControlPoint);
  const clearProjectSurvey = useProjectSurveyStore((state) => state.clearProjectSurvey);

  return useMemo(() => ({
    mode: selection?.mode ?? "view",
    activeSurveyParcelId: selection?.activeSurveyParcelId ?? "",
    referenceSystem: selection?.referenceSystem ?? "local-grid",
    measurementUnit: selection?.measurementUnit ?? "us_survey_ft",
    parcels: selection?.parcels ?? [],
    alignments: selection?.alignments ?? [],
    controlPoints: selection?.controlPoints ?? [],
    issues: selection?.issues ?? [],
    auditTrail: selection?.auditTrail ?? [],
    setMode: (mode: SurveyMode) => setMode(projectId, mode),
    setActiveSurveyParcelId: (parcelId?: string) => setActiveSurveyParcelId(projectId, parcelId),
    setReferenceSystem: (referenceSystem: "local-grid" | "state-plane" | "utm" | "assumed-basis") =>
      setReferenceSystem(projectId, referenceSystem),
    setMeasurementUnit: (measurementUnit: "us_survey_ft" | "international_ft" | "meters") =>
      setMeasurementUnit(projectId, measurementUnit),
    syncSurveyParcelFromBoundary: (parcelId: string, boundary: Array<{ x: number; y: number }>) =>
      syncSurveyParcelFromBoundary(projectId, parcelId, boundary),
    recordDescriptionReview: (
      reviewId: string,
      reconstruction: Parameters<typeof recordDescriptionReview>[2],
      ignoredLineCount: number,
    ) => recordDescriptionReview(projectId, reviewId, reconstruction, ignoredLineCount),
    promoteDescriptionParcel: (
      parcelId: string,
      reconstruction: Parameters<typeof promoteDescriptionParcel>[2],
    ) => promoteDescriptionParcel(projectId, parcelId, reconstruction),
    upsertAlignment: (alignment: Parameters<typeof upsertAlignment>[1]) => upsertAlignment(projectId, alignment),
    upsertControlPoint: (controlPoint: Parameters<typeof upsertControlPoint>[1]) => upsertControlPoint(projectId, controlPoint),
    clearProjectSurvey: () => clearProjectSurvey(projectId),
  }), [
    clearProjectSurvey,
    projectId,
    selection?.activeSurveyParcelId,
    selection?.measurementUnit,
    selection?.referenceSystem,
    selection?.alignments,
    selection?.controlPoints,
    selection?.issues,
    selection?.auditTrail,
    selection?.mode,
    selection?.parcels,
    setActiveSurveyParcelId,
    setMeasurementUnit,
    setMode,
    setReferenceSystem,
    syncSurveyParcelFromBoundary,
    recordDescriptionReview,
    promoteDescriptionParcel,
    upsertAlignment,
    upsertControlPoint,
  ]);
}
