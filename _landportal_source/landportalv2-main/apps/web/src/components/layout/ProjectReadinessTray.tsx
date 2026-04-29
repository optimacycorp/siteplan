import type { ReactNode } from "react";

import styles from "./ProjectReadinessTray.module.css";

type ReadinessTone = "ready" | "attention" | "blocked";

type ProjectReadinessTrayProps = {
  title: string;
  summary: string;
  tone: ReadinessTone;
  blockers?: string[];
  warnings?: string[];
  checks?: string[];
  actions?: ReactNode;
};

const toneLabel: Record<ReadinessTone, string> = {
  ready: "Ready for next step",
  attention: "Needs review",
  blocked: "Blocked",
};

const toneClass: Record<ReadinessTone, string> = {
  ready: styles.toneReady,
  attention: styles.toneAttention,
  blocked: styles.toneBlocked,
};

export function ProjectReadinessTray(props: ProjectReadinessTrayProps) {
  const blockers = props.blockers ?? [];
  const warnings = props.warnings ?? [];
  const checks = props.checks ?? [];

  return (
    <div className={styles.tray}>
      <div className={styles.summary}>
        <div className={styles.summaryHeader}>
          <strong>{props.title}</strong>
          <span className={`${styles.tone} ${toneClass[props.tone]}`}>{toneLabel[props.tone]}</span>
        </div>
        <p>{props.summary}</p>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <strong>Blockers</strong>
          {blockers.length ? (
            blockers.map((item) => <span className={styles.blocker} key={item}>{item}</span>)
          ) : (
            <span className={styles.ok}>No blocking issues in this step.</span>
          )}
        </div>

        <div className={styles.column}>
          <strong>Warnings</strong>
          {warnings.length ? (
            warnings.map((item) => <span className={styles.warning} key={item}>{item}</span>)
          ) : (
            <span className={styles.ok}>No active warnings.</span>
          )}
        </div>

        <div className={styles.column}>
          <strong>Readiness checks</strong>
          {checks.length ? (
            checks.map((item) => <span className={styles.check} key={item}>{item}</span>)
          ) : (
            <span className={styles.ok}>No checks recorded yet.</span>
          )}
        </div>
      </div>

      {props.actions ? <div className={styles.actions}>{props.actions}</div> : null}
    </div>
  );
}
