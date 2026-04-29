import { OverlayGroupSection } from "./OverlayGroupSection";
import styles from "./OverlayPanel.module.css";
import type { GroupedOverlays, OverlaySettings } from "./useOverlaySettings";

type OverlayPanelProps = {
  grouped: GroupedOverlays;
  settings: OverlaySettings;
  onOpacityChange: (key: string, opacity: number) => void;
  onToggle: (key: string) => void;
};

export function OverlayPanel({ grouped, settings, onOpacityChange, onToggle }: OverlayPanelProps) {
  return (
    <div className={styles.panel}>
      <OverlayGroupSection onOpacityChange={onOpacityChange} onToggle={onToggle} overlays={grouped.parcel ?? []} settings={settings} title="Parcel overlays" />
      <OverlayGroupSection onOpacityChange={onOpacityChange} onToggle={onToggle} overlays={grouped.constraint ?? []} settings={settings} title="Constraint overlays" />
      <OverlayGroupSection onOpacityChange={onOpacityChange} onToggle={onToggle} overlays={grouped.site ?? []} settings={settings} title="Site overlays" />
      <OverlayGroupSection onOpacityChange={onOpacityChange} onToggle={onToggle} overlays={grouped.survey ?? []} settings={settings} title="Survey overlays" />
    </div>
  );
}
