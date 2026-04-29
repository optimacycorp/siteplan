import { Button } from "@/components/ui/Button";

import styles from "./TitleChainDocumentTile.module.css";

export type TitleChainDocumentTileProps = {
  title: string;
  displayReference: string;
  fullReference: string;
  relationType: string;
  sourcePageNumber?: number | null;
  fetchStatus: "pending" | "stored" | "failed" | "manual_review";
  matchConfidence?: number | null;
  storedDocumentId?: string | null;
  originalExternalReference?: string | null;
  originalSourceHost?: string | null;
  onOpenStored?: (documentId: string) => void;
  onOpenOriginal?: (url: string) => void;
  onCopyOriginal?: (url: string) => void;
  onRetryFetch?: () => void;
  onUnlink?: () => void;
};

export function TitleChainDocumentTile(props: TitleChainDocumentTileProps) {
  const statusLabel =
    props.fetchStatus === "stored"
      ? "Stored successfully"
      : props.fetchStatus === "failed"
        ? "Fetch failed"
        : props.fetchStatus === "manual_review"
          ? "Needs review"
          : "Pending import";
  const statusClassName =
    props.fetchStatus === "stored"
      ? styles.badgeStored
      : props.fetchStatus === "failed"
        ? styles.badgeFailed
        : props.fetchStatus === "manual_review"
          ? styles.badgeReview
          : styles.badgePending;

  return (
    <div className={styles.tile}>
      <div className={styles.header}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles.reference} title={props.fullReference}>{props.displayReference}</div>
      </div>

      <div className={styles.badgeRow}>
        <span className={`${styles.badge} ${statusClassName}`}>{statusLabel}</span>
        {props.matchConfidence != null ? (
          <span className={styles.badge}>Confidence {Math.round(props.matchConfidence * 100)}%</span>
        ) : null}
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Relation</span>
          <span className={styles.metaValue}>{props.relationType.replaceAll("_", " ")}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Source page</span>
          <span className={styles.metaValue}>{props.sourcePageNumber ?? "Unknown"}</span>
        </div>
      </div>

      <div className={styles.linkSection}>
        <div className={styles.linkRow}>
          <span className={styles.linkLabel}>Stored copy</span>
          {props.storedDocumentId && props.onOpenStored ? (
            <Button onClick={() => props.onOpenStored?.(props.storedDocumentId!)} variant="ghost">View stored copy</Button>
          ) : (
            <span className={styles.linkHost}>Not stored locally</span>
          )}
        </div>

        <div className={styles.linkRow}>
          <span className={styles.linkLabel}>Original source</span>
          {props.originalExternalReference ? (
            <>
              <span className={styles.linkHost} title={props.originalExternalReference}>{props.originalSourceHost ?? "Remote link"}</span>
              {props.onOpenOriginal ? (
                <Button onClick={() => props.onOpenOriginal?.(props.originalExternalReference!)} variant="ghost">Open original source</Button>
              ) : null}
              {props.onCopyOriginal ? (
                <Button onClick={() => props.onCopyOriginal?.(props.originalExternalReference!)} variant="ghost">Copy URL</Button>
              ) : null}
            </>
          ) : (
            <span className={styles.linkHost}>No original source URL</span>
          )}
        </div>
      </div>

      <div className={styles.actionRow}>
        {props.originalExternalReference && props.onRetryFetch && (props.fetchStatus === "failed" || props.fetchStatus === "manual_review") ? (
          <Button onClick={() => props.onRetryFetch?.()} variant="secondary">Retry fetch</Button>
        ) : null}
        {props.onUnlink ? (
          <Button onClick={() => props.onUnlink?.()} variant="ghost">Unlink</Button>
        ) : null}
      </div>
    </div>
  );
}
