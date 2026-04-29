import { Button } from "@/components/ui/Button";
import { TitleChainDocumentTile } from "@/modules/title/components/TitleChainDocumentTile";
import type { TitleCommitmentStackItem } from "@/modules/title/titleCommitmentViewModel";

import styles from "./TitleCommitmentStackCard.module.css";

type TitleCommitmentStackCardProps = {
  item: TitleCommitmentStackItem;
  isActive: boolean;
  primaryActionPending?: boolean;
  deleteActionPending?: boolean;
  onReview: (commitmentId: string) => void;
  onSetPrimary: (commitmentId: string) => void;
  onDelete: (commitmentId: string) => void;
  onOpenCommitment: (documentId: string) => void;
  onOpenStored: (documentId: string) => void;
  onOpenOriginal?: (url: string) => void;
  onCopyOriginal?: (url: string) => void;
  onRetryFetch?: (referenceId: string) => void;
  truncateText: (value: string, limit: number) => string;
};

export function TitleCommitmentStackCard(props: TitleCommitmentStackCardProps) {
  const { item, isActive } = props;
  const { commitment, chainTiles } = item;

  return (
    <div className={styles.card}>
      <strong>{item.displayTitle}</strong>
      <div className={styles.kv}><span>Status</span><span>{item.statusLabel}</span></div>
      <div className={styles.kv}><span>Import status</span><span>{item.importStatusLabel}</span></div>
      <div className={styles.kv}><span>Order number</span><span>{item.orderNumber || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Schedule / account</span><span>{item.scheduleNumber || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Date of issue</span><span>{item.issueDate || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Effective date</span><span>{item.effectiveDate || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Property address</span><span>{item.propertyAddress || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Issuing company</span><span>{item.issuingCompany || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Parcel snapshot</span><span>{commitment.parcelSnapshotId ?? "Not linked"}</span></div>
      <div className={styles.kv}><span>Role</span><span>{commitment.isPrimary ? "Primary" : "Secondary"}</span></div>
      <span className={styles.muted}>
        {props.truncateText(item.propertyDescription, 240) || "Full property description has not been extracted yet."}
      </span>
      <div className={styles.kv}>
        <span>Related docs</span>
        <span>{chainTiles.length}</span>
      </div>
      <div className={styles.kv}>
        <span>Fetch summary</span>
        <span>{commitment.childLinkCount} found / {commitment.childFetchSuccessCount} stored / {commitment.childFetchFailureCount} review</span>
      </div>
      {commitment.primaryDocumentId ? (
        <button
          className={styles.previewLink}
          onClick={() => props.onOpenCommitment(commitment.primaryDocumentId!)}
          type="button"
        >
          View commitment in popup
        </button>
      ) : null}
      {chainTiles.length ? (
        <div className={styles.tileList}>
          {chainTiles.map((tile) => (
            <TitleChainDocumentTile
              displayReference={tile.displayReference}
              fetchStatus={tile.fetchStatus}
              fullReference={tile.fullReference}
              key={tile.id}
              matchConfidence={tile.matchConfidence}
              onCopyOriginal={tile.originalExternalReference && props.onCopyOriginal ? props.onCopyOriginal : undefined}
              onOpenOriginal={tile.originalExternalReference && props.onOpenOriginal ? props.onOpenOriginal : undefined}
              onOpenStored={tile.storedDocumentId ? props.onOpenStored : undefined}
              onRetryFetch={tile.referenceId && props.onRetryFetch ? () => props.onRetryFetch?.(tile.referenceId!) : undefined}
              originalExternalReference={tile.originalExternalReference}
              originalSourceHost={tile.originalSourceHost}
              relationType={tile.relationType}
              sourcePageNumber={tile.sourcePageNumber}
              storedDocumentId={tile.storedDocumentId}
              title={tile.title}
            />
          ))}
        </div>
      ) : null}
      <div className={styles.actions}>
        <Button
          onClick={() => props.onReview(commitment.id)}
          variant={isActive ? "primary" : "ghost"}
        >
          {isActive ? "Active commitment" : "Review this commitment"}
        </Button>
        {!commitment.isPrimary ? (
          <Button
            disabled={props.primaryActionPending}
            onClick={() => props.onSetPrimary(commitment.id)}
            variant="secondary"
          >
            {props.primaryActionPending ? "Updating..." : "Set as primary"}
          </Button>
        ) : null}
        <Button
          disabled={props.deleteActionPending}
          onClick={() => props.onDelete(commitment.id)}
          variant="ghost"
        >
          {props.deleteActionPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
