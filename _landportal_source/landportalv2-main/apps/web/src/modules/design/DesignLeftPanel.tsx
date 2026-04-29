import type { ParcelRecord, ProjectDevelopmentData } from "@landportal/api-client";

import styles from "./DesignConsolePage.module.css";

type DesignLeftPanelProps = {
  activeParcelId: string;
  development: ProjectDevelopmentData;
  onParcelSelect: (parcelId: string) => void;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: "parcel" | "subdivision" | "site" | "overlays" | "block" | "sheet") => void;
  searchQuery: string;
};

export function DesignLeftPanel(props: DesignLeftPanelProps) {
  const filteredParcels = props.development.parcels.filter((parcel) => {
    const query = props.searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [parcel.name, parcel.address, parcel.apn, parcel.zoning].join(" ").toLowerCase().includes(query);
  });

  return (
    <aside className={styles.leftPanel}>
      <div className={styles.header}>
        <strong>Design Console</strong>
        <p className={styles.subtle}>Parcel-first operator workspace for analysis, subdivision, overlays, and output.</p>
      </div>

      <input
        className={styles.searchInput}
        onChange={(event) => props.onSearchChange(event.target.value)}
        placeholder="Search parcel, APN, or address"
        value={props.searchQuery}
      />

      <section className={styles.section}>
        <strong>Tools</strong>
        <div className={styles.toolList}>
          <button className={styles.toolButton} onClick={() => props.onTabChange("parcel")} type="button">Parcel Analysis</button>
          <button className={styles.toolButton} onClick={() => props.onTabChange("subdivision")} type="button">Subdivision Setup</button>
          <button className={styles.toolButton} onClick={() => props.onTabChange("site")} type="button">Site Planner</button>
          <button className={styles.toolButton} onClick={() => props.onTabChange("overlays")} type="button">Overlay Manager</button>
          <button className={styles.toolButton} onClick={() => props.onTabChange("block")} type="button">Block Tool</button>
          <button className={styles.toolButton} onClick={() => props.onTabChange("sheet")} type="button">Sheet Composer</button>
        </div>
      </section>

      <section className={styles.section}>
        <strong>Parcel selection</strong>
        <div className={styles.savedList}>
          {filteredParcels.map((parcel) => (
            <ParcelItem active={parcel.id === props.activeParcelId} key={parcel.id} onSelect={props.onParcelSelect} parcel={parcel} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <strong>Saved items</strong>
        <div className={styles.savedList}>
          {props.development.layouts.slice(0, 3).map((layout) => (
            <div className={styles.savedItem} key={layout.id}>
              <strong>{layout.name}</strong>
              <span>{layout.lotCount} lots | {layout.yieldUnits} units</span>
            </div>
          ))}
          {props.development.documents.slice(0, 2).map((document) => (
            <div className={styles.savedItem} key={document.id}>
              <strong>{document.title}</strong>
              <span>{document.type} | {document.status}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function ParcelItem({
  active,
  onSelect,
  parcel,
}: {
  active: boolean;
  onSelect: (parcelId: string) => void;
  parcel: ParcelRecord;
}) {
  return (
    <button
      className={styles.savedItem}
      onClick={() => onSelect(parcel.id)}
      style={active ? { borderColor: "rgba(215, 165, 65, 0.46)", background: "rgba(215, 165, 65, 0.12)" } : undefined}
      type="button"
    >
      <strong>{parcel.name}</strong>
      <span>{(parcel.intelligence?.buildableAreaAcres ?? parcel.buildableAcres).toFixed(2)} buildable ac</span>
      <span>{parcel.frontageFeet} ft frontage | {parcel.zoning}</span>
    </button>
  );
}
