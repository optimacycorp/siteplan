type SupportingDocument = {
  id: string;
  title: string;
  documentType: string;
  status: string;
};

type TitleSupportingRecordStackCardProps = {
  supportingDocuments: SupportingDocument[];
  listClassName: string;
  docCardClassName: string;
  kvClassName: string;
  mutedClassName: string;
};

export function TitleSupportingRecordStackCard(props: TitleSupportingRecordStackCardProps) {
  return (
    <>
      <strong>Supporting record stack</strong>
      <div className={props.listClassName}>
        {props.supportingDocuments.length ? props.supportingDocuments.map((document) => (
          <div className={props.docCardClassName} key={document.id}>
            <strong>{document.title}</strong>
            <div className={props.kvClassName}><span>Type</span><span>{document.documentType}</span></div>
            <div className={props.kvClassName}><span>Status</span><span>{document.status}</span></div>
          </div>
        )) : <span className={props.mutedClassName}>Add deeds, surveys, plats, easement exhibits, and opinion letters here.</span>}
      </div>
    </>
  );
}
