import styles from "./TitleVisitedDocumentRegister.module.css";

type VisitedDocumentEntry = {
  reference: {
    id: string;
    referenceText: string;
    sourcePage: number | null;
    fetchStatus: string;
    briefDescription: string;
    expectedDocumentType: string;
  };
  document: {
    id: string;
    title: string;
    documentType: string;
    metadata?: Record<string, unknown>;
  } | null;
};

type TitleVisitedDocumentRegisterProps = {
  visitedDocuments: VisitedDocumentEntry[];
  missingReferencesCount: number;
  onOpenStored: (documentId: string) => void;
};

export function TitleVisitedDocumentRegister(props: TitleVisitedDocumentRegisterProps) {
  return (
    <>
      <strong>Visited document register</strong>
      <div className={styles.kv}><span>Visited documents</span><span>{props.visitedDocuments.length}</span></div>
      <div className={styles.kv}><span>Missing references</span><span>{props.missingReferencesCount}</span></div>
      <div className={styles.list}>
        {props.visitedDocuments.length ? props.visitedDocuments.map((entry) => (
          <div className={styles.docCard} key={entry.reference.id}>
            <strong>{entry.document?.title ?? entry.reference.referenceText}</strong>
            <div className={styles.kv}><span>Reference</span><span>{entry.reference.referenceText}</span></div>
            <div className={styles.kv}><span>Type</span><span>{entry.document?.documentType ?? entry.reference.expectedDocumentType}</span></div>
            <div className={styles.kv}><span>Page</span><span>{entry.reference.sourcePage ?? "Unknown"}</span></div>
            <div className={styles.kv}><span>Fetch status</span><span>{entry.reference.fetchStatus}</span></div>
            {entry.document?.id ? (
              <button
                className={styles.previewLink}
                onClick={() => props.onOpenStored(entry.document!.id)}
                type="button"
              >
                View in popup
              </button>
            ) : null}
            <span className={styles.muted}>
              {entry.reference.briefDescription
                || String(entry.document?.metadata?.briefDescription ?? "")
                || "No description captured yet."}
            </span>
          </div>
        )) : <span className={styles.muted}>No referenced documents have been marked visited yet.</span>}
      </div>
    </>
  );
}
