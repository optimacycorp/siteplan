import { mapProviderRegistry, type BasemapKey } from "./mapProviderRegistry";
import styles from "./MapControls.module.css";

type Toggle = {
  key: string;
  label: string;
  active: boolean;
  onToggle: () => void;
};

type ModeOption = {
  key: string;
  label: string;
};

type MapControlsProps = {
  title: string;
  basemap: BasemapKey;
  onBasemapChange: (key: BasemapKey) => void;
  onFit: () => void;
  terrainActive?: boolean;
  hillshadeActive?: boolean;
  onToggleTerrain?: () => void;
  onToggleHillshade?: () => void;
  toggles: Toggle[];
  modeLabel?: string;
  modeOptions?: ModeOption[];
  activeModeKey?: string;
  onModeChange?: (key: string) => void;
};

export function MapControls({
  basemap,
  hillshadeActive = false,
  onBasemapChange,
  onFit,
  onToggleHillshade,
  onToggleTerrain,
  terrainActive = false,
  title,
  toggles,
  modeLabel,
  modeOptions = [],
  activeModeKey,
  onModeChange,
}: MapControlsProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <span className={styles.chip}>{title}</span>
        {modeOptions.length && onModeChange ? (
          <div className={styles.modeWrap}>
            <span className={styles.selectLabel}>{modeLabel ?? "Mode"}</span>
            <div className={styles.modeGroup}>
              {modeOptions.map((option) => (
                <button
                  className={`${styles.modeButton} ${activeModeKey === option.key ? styles.modeButtonActive : ""}`}
                  key={option.key}
                  onClick={() => onModeChange(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {toggles.map((toggle) => (
          <button className={styles.button} key={toggle.key} onClick={toggle.onToggle} type="button">
            {toggle.active ? "Hide" : "Show"} {toggle.label}
          </button>
        ))}
        {onToggleTerrain ? (
          <button className={styles.button} onClick={onToggleTerrain} type="button">
            {terrainActive ? "Terrain on" : "Terrain off"}
          </button>
        ) : null}
        {onToggleHillshade ? (
          <button className={styles.button} onClick={onToggleHillshade} type="button">
            {hillshadeActive ? "Hillshade on" : "Hillshade off"}
          </button>
        ) : null}
      </div>
      <div className={styles.group}>
        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Basemap</span>
          <select
            className={styles.select}
            onChange={(event) => onBasemapChange(event.target.value as BasemapKey)}
            value={basemap}
          >
            {mapProviderRegistry.map((provider) => (
              <option key={provider.key} value={provider.key}>{provider.label}</option>
            ))}
          </select>
        </label>
        <button className={styles.button} onClick={onFit} type="button">Fit to view</button>
      </div>
    </div>
  );
}
