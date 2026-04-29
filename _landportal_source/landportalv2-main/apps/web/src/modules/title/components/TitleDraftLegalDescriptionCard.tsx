type TitleDraftLegalDescriptionCardProps = {
  draftLegalDescription: string;
  preClassName: string;
};

export function TitleDraftLegalDescriptionCard(props: TitleDraftLegalDescriptionCardProps) {
  return (
    <>
      <strong>Draft legal description</strong>
      <pre className={props.preClassName}>{props.draftLegalDescription}</pre>
    </>
  );
}
