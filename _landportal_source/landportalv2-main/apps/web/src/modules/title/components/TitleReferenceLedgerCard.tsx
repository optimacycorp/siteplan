import type { TitleCommitmentReferenceRecord } from "@landportal/api-client";

import { Button } from "@/components/ui/Button";

import styles from "./TitleReferenceLedgerCard.module.css";

type TitleReferenceLedgerCardProps = {
  reference: TitleCommitmentReferenceRecord;
  deletePending?: boolean;
  onEdit: (referenceId: string) => void;
  onDelete: (referenceId: string) => void;
  onOpenStored?: (documentId: string) => void;
};

export function TitleReferenceLedgerCard(props: TitleReferenceLedgerCardProps) {
  const { reference } = props;

  return (
    <div className={styles.card}>
      <strong>{reference.referenceText}</strong>
      <div className={styles.kv}><span>Type</span><span>{reference.expectedDocumentType}</span></div>
      <div className={styles.kv}><span>Status</span><span>{reference.visitStatus}</span></div>
      <div className={styles.kv}><span>Fetch status</span><span>{reference.fetchStatus}</span></div>
      <div className={styles.kv}><span>Section</span><span>{reference.scheduleSection || "Not set"}</span></div>
      <div className={styles.kv}><span>Source page</span><span>{reference.sourcePage ?? "Unknown"}</span></div>
      {reference.visitedProjectDocumentId && props.onOpenStored ? (
        <button
          className={styles.previewLink}
          onClick={() => props.onOpenStored?.(reference.visitedProjectDocumentId!)}
          type="button"
        >
          View in popup
        </button>
      ) : null}
      <span className={styles.muted}>{reference.briefDescription || "No description yet."}</span>
      <div className={styles.actions}>
        <Button onClick={() => props.onEdit(reference.id)} variant="ghost">Edit</Button>
        <Button
          disabled={props.deletePending}
          onClick={() => props.onDelete(reference.id)}
          variant="ghost"
        >
          {props.deletePending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
