type AuditEntry = {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
};

type TitleSurveyAuditTrailCardProps = {
  auditTrail: AuditEntry[];
  listClassName: string;
  docCardClassName: string;
  kvClassName: string;
  mutedClassName: string;
};

export function TitleSurveyAuditTrailCard(props: TitleSurveyAuditTrailCardProps) {
  return (
    <>
      <strong>Survey audit trail</strong>
      <div className={props.listClassName}>
        {props.auditTrail.length ? props.auditTrail.map((entry) => (
          <div className={props.docCardClassName} key={entry.id}>
            <strong>{entry.action.replaceAll("_", " ")}</strong>
            <span className={props.mutedClassName}>{entry.detail}</span>
            <div className={props.kvClassName}><span>Timestamp</span><span>{new Date(entry.timestamp).toLocaleString()}</span></div>
          </div>
        )) : <span className={props.mutedClassName}>No survey review actions have been logged yet.</span>}
      </div>
    </>
  );
}
