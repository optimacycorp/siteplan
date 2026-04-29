type TitleSurveyCopilotCardProps = {
  status: string;
  confidenceLabel: string;
  headline: string;
  summary: string;
  nextActions: string[];
  kvClassName: string;
  listClassName: string;
  docCardClassName: string;
  mutedClassName: string;
};

export function TitleSurveyCopilotCard(props: TitleSurveyCopilotCardProps) {
  return (
    <>
      <strong>Survey copilot</strong>
      <div className={props.kvClassName}><span>Status</span><span>{props.status}</span></div>
      <div className={props.kvClassName}><span>Confidence</span><span>{props.confidenceLabel}</span></div>
      <strong>{props.headline}</strong>
      <p className={props.mutedClassName}>{props.summary}</p>
      <div className={props.listClassName}>
        {props.nextActions.map((action) => (
          <div className={props.docCardClassName} key={action}>
            <span>{action}</span>
          </div>
        ))}
      </div>
    </>
  );
}
