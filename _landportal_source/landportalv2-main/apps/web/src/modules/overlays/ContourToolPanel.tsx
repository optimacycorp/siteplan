import styles from "./OverlayPanel.module.css";

type ContourToolPanelProps = {
  majorEvery: number;
  minorInterval: number;
  showLabels: boolean;
  onGenerate: () => void;
  onMajorEveryChange: (value: number) => void;
  onMinorIntervalChange: (value: number) => void;
  onShowLabelsChange: (value: boolean) => void;
};

export function ContourToolPanel(props: ContourToolPanelProps) {
  return (
    <section className={styles.group}>
      <strong>Contour tool</strong>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Minor interval</span>
          <input min="1" onChange={(event) => props.onMinorIntervalChange(Number(event.target.value) || 1)} type="number" value={props.minorInterval} />
        </label>
        <label className={styles.field}>
          <span>Major every</span>
          <input min="1" onChange={(event) => props.onMajorEveryChange(Number(event.target.value) || 1)} type="number" value={props.majorEvery} />
        </label>
        <label className={styles.checkboxField}>
          <input checked={props.showLabels} onChange={(event) => props.onShowLabelsChange(event.target.checked)} type="checkbox" />
          <span>Show major labels</span>
        </label>
      </div>
      <button className={styles.generateButton} onClick={props.onGenerate} type="button">Generate contours</button>
    </section>
  );
}
