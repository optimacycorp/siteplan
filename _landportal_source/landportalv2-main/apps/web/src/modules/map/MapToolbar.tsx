import styles from "./ProjectMapPage.module.css";

type MapToolbarProps = {
  mapLabel: string;
  showPoints: boolean;
  showLinework: boolean;
  onTogglePoints: () => void;
  onToggleLinework: () => void;
  onFitToProject: () => void;
};

export function MapToolbar({
  mapLabel,
  onFitToProject,
  onToggleLinework,
  onTogglePoints,
  showLinework,
  showPoints,
}: MapToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolGroup}>
        <span className={styles.mapChip}>{mapLabel}</span>
        <button className={styles.toolButton} onClick={onTogglePoints} type="button">
          {showPoints ? "Hide points" : "Show points"}
        </button>
        <button className={styles.toolButton} onClick={onToggleLinework} type="button">
          {showLinework ? "Hide linework" : "Show linework"}
        </button>
      </div>
      <div className={styles.toolGroup}>
        <button className={styles.toolButton} onClick={onFitToProject} type="button">
          Fit to project
        </button>
      </div>
    </div>
  );
}
