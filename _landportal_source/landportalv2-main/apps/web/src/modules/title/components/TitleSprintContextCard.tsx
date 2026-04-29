type TitleSprintContextCardProps = {
  mutedClassName: string;
};

export function TitleSprintContextCard(props: TitleSprintContextCardProps) {
  return (
    <>
      <strong>Why this sprint matters</strong>
      <p className={props.mutedClassName}>
        The new survey-engine phase should start from a document package, preferably a title commitment, then flow into parsed descriptions, reconstruction, and review.
      </p>
    </>
  );
}
