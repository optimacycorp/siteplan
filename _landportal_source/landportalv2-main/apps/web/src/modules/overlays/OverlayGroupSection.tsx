import type { OverlayDefinition } from "@landportal/map-core";

import styles from "./OverlayPanel.module.css";

type OverlayGroupSectionProps = {
  overlays: OverlayDefinition[];
  settings: Record<string, { visible: boolean; opacity: number }>;
  title: string;
  onToggle: (key: string) => void;
  onOpacityChange: (key: string, opacity: number) => void;
};

export function OverlayGroupSection({
  overlays,
  settings,
  title,
  onToggle,
  onOpacityChange,
}: OverlayGroupSectionProps) {
  return (
    <section className={styles.group}>
      <strong>{title}</strong>
      <div className={styles.groupList}>
        {overlays.map((overlay) => (
          <div className={styles.overlayRow} key={overlay.key}>
            <label className={styles.overlayToggle}>
              <input checked={settings[overlay.key]?.visible ?? false} onChange={() => onToggle(overlay.key)} type="checkbox" />
              <span>{overlay.label}</span>
            </label>
            <input
              className={styles.slider}
              max="100"
              min="10"
              onChange={(event) => onOpacityChange(overlay.key, Number(event.target.value) / 100)}
              type="range"
              value={Math.round((settings[overlay.key]?.opacity ?? 1) * 100)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
