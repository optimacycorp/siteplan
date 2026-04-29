type TitleDocumentItem = {
  id: string;
  title: string;
  documentType: string;
  status: string;
};

type TitleDocumentsCardProps = {
  titleDocuments: TitleDocumentItem[];
  listClassName: string;
  docCardClassName: string;
  kvClassName: string;
  mutedClassName: string;
};

export function TitleDocumentsCard(props: TitleDocumentsCardProps) {
  return (
    <>
      <strong>Title documents</strong>
      <div className={props.listClassName}>
        {props.titleDocuments.length ? props.titleDocuments.map((document) => (
          <div className={props.docCardClassName} key={document.id}>
            <strong>{document.title}</strong>
            <div className={props.kvClassName}><span>Type</span><span>{document.documentType}</span></div>
            <div className={props.kvClassName}><span>Status</span><span>{document.status}</span></div>
          </div>
        )) : <span className={props.mutedClassName}>No title commitment or title-labeled documents are linked yet.</span>}
      </div>
    </>
  );
}
