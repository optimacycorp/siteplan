import type { TitleCommitmentReferenceRecord } from "@landportal/api-client";

type TitleMissingReferencesCardProps = {
  missingReferences: TitleCommitmentReferenceRecord[];
  listClassName: string;
  docCardClassName: string;
  kvClassName: string;
  mutedClassName: string;
};

export function TitleMissingReferencesCard(props: TitleMissingReferencesCardProps) {
  return (
    <>
      <strong>Missing references</strong>
      <div className={props.listClassName}>
        {props.missingReferences.length ? props.missingReferences.map((reference) => (
          <div className={props.docCardClassName} key={reference.id}>
            <strong>{reference.referenceText}</strong>
            <div className={props.kvClassName}><span>Expected type</span><span>{reference.expectedDocumentType}</span></div>
            <div className={props.kvClassName}><span>Page</span><span>{reference.sourcePage ?? "Unknown"}</span></div>
            <div className={props.kvClassName}><span>Fetch status</span><span>{reference.fetchStatus}</span></div>
            <span className={props.mutedClassName}>{reference.briefDescription || "No description captured yet."}</span>
          </div>
        )) : <span className={props.mutedClassName}>All stored references are currently matched to uploaded documents.</span>}
      </div>
    </>
  );
}
