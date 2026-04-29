import styles from "./RecommendationPanel.module.css";

type RecommendationPanelProps = {
  bestStrategy: string;
  expectedUnitRange: string;
  riskLevel: "Low" | "Medium" | "High";
  nextAction: string;
  notes?: string[];
};

export function RecommendationPanel({
  bestStrategy,
  expectedUnitRange,
  riskLevel,
  nextAction,
  notes = [],
}: RecommendationPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.eyebrow}>Recommendation</div>
      <h3>{bestStrategy}</h3>
      <div className={styles.riskRow}>
        <span>Risk</span>
        <span className={`${styles.riskBadge} ${riskLevel === "Low" ? styles.riskLow : riskLevel === "Medium" ? styles.riskMedium : styles.riskHigh}`}>
          {riskLevel}
        </span>
      </div>
      <div className={styles.metricCard}>
        <span>Expected units</span>
        <strong>{expectedUnitRange}</strong>
      </div>
      <div className={styles.actionBlock}>
        <strong>Next best action</strong>
        <p>{nextAction}</p>
      </div>
      {notes.length ? (
        <div className={styles.notes}>
          {notes.map((note) => (
            <div className={styles.note} key={note}>{note}</div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
