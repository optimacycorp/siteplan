import type { ParcelRecord, SitePlanLayout, SubdivisionLayout, YieldScenario } from "@landportal/api-client";

import { ContourToolPanel } from "@/modules/overlays/ContourToolPanel";
import { OverlayPanel } from "@/modules/overlays/OverlayPanel";
import type { GroupedOverlays, OverlaySettings } from "@/modules/overlays/useOverlaySettings";

import type { DesignConsoleTab } from "./useDesignConsoleState";
import styles from "./DesignConsolePage.module.css";

type DesignRightPanelProps = {
  activeTab: DesignConsoleTab;
  majorEvery: number;
  minorInterval: number;
  openReviewItems: Array<{
    id: string;
    label: string;
    source: string;
    severity: "error" | "warning" | "info";
  }>;
  onGenerateContours: () => void;
  onMajorEveryChange: (value: number) => void;
  onMinorIntervalChange: (value: number) => void;
  onOpacityChange: (key: string, opacity: number) => void;
  onShowContourLabelsChange: (value: boolean) => void;
  onTabChange: (tab: DesignConsoleTab) => void;
  onToggleOverlay: (key: string) => void;
  overlayGroups: GroupedOverlays;
  overlaySettings: OverlaySettings;
  parcel: ParcelRecord | null;
  reviewSummary: {
    surveyIssueCount: number;
    titleMissingCount: number;
    titleReviewCount: number;
    surveyCompareStatus: string;
  };
  scenarios: YieldScenario[];
  selectedLayout: SubdivisionLayout | null;
  showContourLabels: boolean;
  sitePlan: SitePlanLayout | null;
};

const tabs: DesignConsoleTab[] = ["parcel", "subdivision", "site", "overlays", "block", "sheet"];

export function DesignRightPanel(props: DesignRightPanelProps) {
  return (
    <aside className={styles.rightPanel}>
      <div className={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            className={`${styles.tabButton} ${props.activeTab === tab ? styles.tabButtonActive : ""}`}
            key={tab}
            onClick={() => props.onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {props.activeTab === "parcel" ? (
        <div className={styles.tabPanel}>
          <section className={styles.section}>
            <strong>Parcel summary</strong>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Gross</span><span className={styles.summaryValue}>{props.parcel?.areaAcres.toFixed(2) ?? "0.00"} ac</span></div>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Buildable</span><span className={styles.summaryValue}>{(props.parcel?.intelligence?.buildableAreaAcres ?? props.parcel?.buildableAcres ?? 0).toFixed(2)} ac</span></div>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Frontage</span><span className={styles.summaryValue}>{props.parcel?.frontageFeet ?? 0} ft</span></div>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Best strategy</span><span className={styles.summaryValue}>{props.parcel?.intelligence?.bestSubdivisionStrategy?.replaceAll("_", " ") ?? "Run analysis"}</span></div>
            </div>
          </section>
          <section className={styles.section}>
            <strong>Review readiness</strong>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Survey issues</span><span className={styles.summaryValue}>{props.reviewSummary.surveyIssueCount}</span></div>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Title missing</span><span className={styles.summaryValue}>{props.reviewSummary.titleMissingCount}</span></div>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Title review</span><span className={styles.summaryValue}>{props.reviewSummary.titleReviewCount}</span></div>
              <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Survey compare</span><span className={styles.summaryValue}>{props.reviewSummary.surveyCompareStatus}</span></div>
            </div>
            {props.openReviewItems.length ? (
              <div className={styles.summaryGrid}>
                {props.openReviewItems.slice(0, 4).map((item) => (
                  <div className={styles.summaryCard} key={item.id}>
                    <span className={styles.summaryValueLabel}>{item.source}</span>
                    <span className={styles.summaryValue}>{item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.subtle}>No open parcel, survey, or title review items are blocking this workspace right now.</p>
            )}
          </section>
          <ContourToolPanel
            majorEvery={props.majorEvery}
            minorInterval={props.minorInterval}
            onGenerate={props.onGenerateContours}
            onMajorEveryChange={props.onMajorEveryChange}
            onMinorIntervalChange={props.onMinorIntervalChange}
            onShowLabelsChange={props.onShowContourLabelsChange}
            showLabels={props.showContourLabels}
          />
        </div>
      ) : null}

      {props.activeTab === "subdivision" ? (
        <section className={styles.section}>
          <strong>Subdivision controls</strong>
          <p className={styles.subtle}>Use the live designer for presets, lot standards, setbacks, and ROW settings. This tab anchors that flow inside the console.</p>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Selected layout</span><span className={styles.summaryValue}>{props.selectedLayout?.name ?? "None"}</span></div>
            <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Estimated yield</span><span className={styles.summaryValue}>{props.selectedLayout?.yieldUnits ?? props.parcel?.maxUnits ?? 0}</span></div>
          </div>
        </section>
      ) : null}

      {props.activeTab === "site" ? (
        <section className={styles.section}>
          <strong>Site plan generator</strong>
          <p className={styles.subtle}>Buildings, roads, trees, and utilities are now map overlays inside the same workspace.</p>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Buildings</span><span className={styles.summaryValue}>{props.sitePlan?.elements.filter((element) => element.elementType === "building").length ?? 0}</span></div>
            <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Trees</span><span className={styles.summaryValue}>{props.sitePlan?.elements.filter((element) => element.elementType === "tree").length ?? 0}</span></div>
          </div>
        </section>
      ) : null}

      {props.activeTab === "overlays" ? (
        <OverlayPanel grouped={props.overlayGroups} onOpacityChange={props.onOpacityChange} onToggle={props.onToggleOverlay} settings={props.overlaySettings} />
      ) : null}

      {props.activeTab === "block" ? (
        <section className={styles.section}>
          <strong>Block tool</strong>
          <p className={styles.subtle}>Sprint B will add auto-block generation and manual block editing from subdivision lots and roads.</p>
        </section>
      ) : null}

      {props.activeTab === "sheet" ? (
        <section className={styles.section}>
          <strong>Sheet composer</strong>
          <p className={styles.subtle}>Sprint C will compose title-block sheets from the current console overlays, parcel stats, notes, and selected layout.</p>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Scenario</span><span className={styles.summaryValue}>{props.scenarios[0]?.title ?? "Not selected"}</span></div>
            <div className={styles.summaryCard}><span className={styles.summaryValueLabel}>Template</span><span className={styles.summaryValue}>Concept sheet</span></div>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
