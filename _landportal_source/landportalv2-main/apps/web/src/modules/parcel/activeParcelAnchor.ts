import type { ProjectParcelSelection } from "@landportal/api-client";

type ParcelLike = {
  id: string;
};

export function resolveActiveParcelId(
  parcelSelection: ProjectParcelSelection | null | undefined,
  workflowParcelId: string | null | undefined,
  parcels: ParcelLike[],
) {
  const anchorParcelId = parcelSelection?.parcelSnapshotId ?? null;
  const hasProviderOnlyAnchor = Boolean(parcelSelection?.providerParcelId && !parcelSelection?.parcelSnapshotId);

  if (anchorParcelId && parcels.some((parcel) => parcel.id === anchorParcelId)) {
    return anchorParcelId;
  }

  if (hasProviderOnlyAnchor) {
    return "";
  }

  if (workflowParcelId && parcels.some((parcel) => parcel.id === workflowParcelId)) {
    return workflowParcelId;
  }

  return parcels[0]?.id ?? "";
}
