import { Button } from "@/components/ui/Button";

import styles from "./TitleDocumentPreviewCard.module.css";

type PreviewDocument = {
  id: string;
  title: string;
  documentType: string;
  fileName: string;
  mimeType: string;
};

type TitleDocumentPreviewCardProps = {
  previewLoading: boolean;
  previewError: string;
  previewUrl: string;
  previewModalOpen: boolean;
  previewDocument: PreviewDocument | null;
  onOpenPreviewModal: () => void;
  onClosePreviewModal: () => void;
};

export function TitleDocumentPreviewCard(props: TitleDocumentPreviewCardProps) {
  const hasPreview = Boolean(props.previewUrl);

  return (
    <>
      <strong>Document preview</strong>
      {props.previewLoading ? <span className={styles.muted}>Preparing preview...</span> : null}
      {props.previewError ? <span className={styles.muted}>{props.previewError}</span> : null}
      {!props.previewLoading && !props.previewError && props.previewDocument ? (
        <>
          <div className={styles.kv}><span>Title</span><span>{props.previewDocument.title}</span></div>
          <div className={styles.kv}><span>Type</span><span>{props.previewDocument.documentType}</span></div>
          <div className={styles.kv}><span>File</span><span>{props.previewDocument.fileName || "Stored file"}</span></div>
          {hasPreview ? (
            <>
              <a className={styles.previewLink} href={props.previewUrl} rel="noreferrer" target="_blank">
                Open in new tab
              </a>
              <button
                className={styles.previewLink}
                onClick={props.onOpenPreviewModal}
                type="button"
              >
                Open popup preview
              </button>
              {props.previewDocument.mimeType.startsWith("image/") ? (
                <img alt={props.previewDocument.title} className={styles.previewImage} src={props.previewUrl} />
              ) : (
                <iframe className={styles.previewFrame} src={props.previewUrl} title={props.previewDocument.title} />
              )}
            </>
          ) : <span className={styles.muted}>Select a stored linked document to preview it here.</span>}
        </>
      ) : null}
      {!props.previewLoading && !props.previewError && !props.previewDocument ? (
        <span className={styles.muted}>Click any visited or linked document to open the stored PDF or image preview here.</span>
      ) : null}

      {props.previewModalOpen && props.previewDocument ? (
        <div
          className={styles.previewModal}
          onClick={props.onClosePreviewModal}
          role="presentation"
        >
          <div
            className={styles.previewModalCard}
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className={styles.actions}>
              <strong>{props.previewDocument.title}</strong>
              <Button onClick={props.onClosePreviewModal} variant="ghost">Close</Button>
            </div>
            {props.previewLoading ? (
              <div className={styles.docCard}>Preparing preview...</div>
            ) : props.previewError ? (
              <div className={styles.docCard}>{props.previewError}</div>
            ) : props.previewDocument.mimeType.startsWith("image/") ? (
              <img alt={props.previewDocument.title} className={styles.previewImage} src={props.previewUrl} />
            ) : (
              <iframe className={styles.previewFrame} src={props.previewUrl} title={props.previewDocument.title} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
