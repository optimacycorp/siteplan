import { useWorkspaceModeStore, workspaceModeMeta, type WorkspaceMode } from "./workspaceModeStore";
import styles from "./WorkspaceModeSwitcher.module.css";

const options: WorkspaceMode[] = ["developer", "acquisition", "builder", "surveyor"];

export function WorkspaceModeSwitcher() {
  const mode = useWorkspaceModeStore((state) => state.mode ?? "developer");
  const setMode = useWorkspaceModeStore((state) => state.setMode);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <strong>Workspace mode</strong>
        <span>Change the product emphasis without changing project data.</span>
      </div>
      <div className={styles.grid}>
        {options.map((option) => {
          const meta = workspaceModeMeta[option];
          const active = option === mode;
          return (
            <button
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
              key={option}
              onClick={() => setMode(option)}
              type="button"
            >
              <span className={styles.badge}>{meta.badge}</span>
              <strong>{meta.label}</strong>
              <span>{meta.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
