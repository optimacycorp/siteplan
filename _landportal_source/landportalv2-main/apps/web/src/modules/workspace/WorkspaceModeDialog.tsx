import { Button } from "@/components/ui/Button";

import { useWorkspaceModeStore, workspaceModeMeta, type WorkspaceMode } from "./workspaceModeStore";
import styles from "./WorkspaceModeDialog.module.css";

const modeOrder: WorkspaceMode[] = ["developer", "acquisition", "builder", "surveyor"];

export function WorkspaceModeDialog() {
  const mode = useWorkspaceModeStore((state) => state.mode);
  const chooserOpen = useWorkspaceModeStore((state) => state.chooserOpen);
  const setMode = useWorkspaceModeStore((state) => state.setMode);
  const closeChooser = useWorkspaceModeStore((state) => state.closeChooser);

  const isOpen = chooserOpen || !mode;
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div aria-modal="true" className={styles.dialog} role="dialog">
        <div className={styles.header}>
          <div>
            <strong>Choose your workspace mode</strong>
            <p>
              This sets the default landing page, priority tools, and language across the product.
            </p>
          </div>
          {mode ? (
            <Button onClick={closeChooser} type="button" variant="ghost">
              Close
            </Button>
          ) : null}
        </div>

        <div className={styles.grid}>
          {modeOrder.map((entry) => {
            const meta = workspaceModeMeta[entry];
            const active = mode === entry;
            return (
              <button
                className={`${styles.card} ${active ? styles.cardActive : ""}`}
                key={entry}
                onClick={() => setMode(entry)}
                type="button"
              >
                <span className={styles.badge}>{meta.badge}</span>
                <strong>{meta.label}</strong>
                <p>{meta.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
