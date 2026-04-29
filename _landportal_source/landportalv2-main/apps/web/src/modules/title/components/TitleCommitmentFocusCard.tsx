import type { TitleChainTileViewModel } from "@/modules/title/titleChainTileModel";
import { TitleChainDocumentTile } from "@/modules/title/components/TitleChainDocumentTile";

import styles from "./TitleCommitmentFocusCard.module.css";

type TitleCommitmentFocusCardProps = {
  commitmentDisplayTitle: string;
  titleDocumentCount: number;
  supportingDocumentCount: number;
  reviewNeededCount: number;
  activeChainTiles: TitleChainTileViewModel[];
  expectedReferencesCount: number;
  visitedReferencesCount: number;
  missingReferencesCount: number;
  completenessPercent: number;
  importStatusLabel: string;
  orderNumber: string;
  scheduleNumber: string;
  issueDate: string;
  propertyAddress: string;
  issuingCompany: string;
  childFetchSummary: string;
  latestImportJobStatus?: string | null;
  propertyDescription: string;
  primaryDocumentId?: string | null;
  onOpenCommitment?: (documentId: string) => void;
  onOpenStored?: (documentId: string) => void;
  onOpenOriginal?: (url: string) => void;
  onCopyOriginal?: (url: string) => void;
  onRetryFetch?: (referenceId: string) => void;
  truncateText: (value: string, limit: number) => string;
};

export function TitleCommitmentFocusCard(props: TitleCommitmentFocusCardProps) {
  return (
    <>
      <strong>Title commitment focus</strong>
      <div className={styles.kv}><span>Primary title commitment</span><span>{props.commitmentDisplayTitle || "Not set"}</span></div>
      <div className={styles.kv}><span>Title-related docs</span><span>{props.titleDocumentCount}</span></div>
      <div className={styles.kv}><span>Supporting records</span><span>{props.supportingDocumentCount}</span></div>
      <div className={styles.kv}><span>Review needed</span><span>{props.reviewNeededCount}</span></div>
      <div className={styles.kv}><span>Linked chain docs</span><span>{props.activeChainTiles.length}</span></div>
      <div className={styles.kv}><span>Expected references</span><span>{props.expectedReferencesCount}</span></div>
      <div className={styles.kv}><span>Visited references</span><span>{props.visitedReferencesCount}</span></div>
      <div className={styles.kv}><span>Missing references</span><span>{props.missingReferencesCount}</span></div>
      <div className={styles.kv}><span>Completeness</span><span>{props.completenessPercent}%</span></div>
      <div className={styles.kv}><span>Import status</span><span>{props.importStatusLabel || "Not started"}</span></div>
      <div className={styles.kv}><span>Order number</span><span>{props.orderNumber || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Schedule / account</span><span>{props.scheduleNumber || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Date of issue</span><span>{props.issueDate || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Property address</span><span>{props.propertyAddress || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Issuing company</span><span>{props.issuingCompany || "Not extracted"}</span></div>
      <div className={styles.kv}><span>Child fetch summary</span><span>{props.childFetchSummary}</span></div>
      {props.latestImportJobStatus ? (
        <div className={styles.kv}><span>Latest import job</span><span>{props.latestImportJobStatus}</span></div>
      ) : null}
      <span className={styles.muted}>
        {props.truncateText(props.propertyDescription, 300) || "Full property description has not been extracted yet."}
      </span>
      {props.primaryDocumentId && props.onOpenCommitment ? (
        <button
          className={styles.previewLink}
          onClick={() => props.onOpenCommitment?.(props.primaryDocumentId!)}
          type="button"
        >
          View commitment in popup
        </button>
      ) : null}
      <div className={styles.list}>
        {props.activeChainTiles.length ? props.activeChainTiles.map((tile) => (
          <TitleChainDocumentTile
            displayReference={tile.displayReference}
            fetchStatus={tile.fetchStatus}
            fullReference={tile.fullReference}
            key={`focus-${tile.id}`}
            matchConfidence={tile.matchConfidence}
            onCopyOriginal={tile.originalExternalReference && props.onCopyOriginal ? props.onCopyOriginal : undefined}
            onOpenOriginal={tile.originalExternalReference && props.onOpenOriginal ? props.onOpenOriginal : undefined}
            onOpenStored={tile.storedDocumentId && props.onOpenStored ? props.onOpenStored : undefined}
            onRetryFetch={tile.referenceId && props.onRetryFetch ? () => props.onRetryFetch?.(tile.referenceId!) : undefined}
            originalExternalReference={tile.originalExternalReference}
            originalSourceHost={tile.originalSourceHost}
            relationType={tile.relationType}
            sourcePageNumber={tile.sourcePageNumber}
            storedDocumentId={tile.storedDocumentId}
            title={tile.title}
          />
        )) : <span className={styles.muted}>No related chain documents are stored under this commitment yet.</span>}
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${props.completenessPercent}%` }} />
      </div>
    </>
  );
}
