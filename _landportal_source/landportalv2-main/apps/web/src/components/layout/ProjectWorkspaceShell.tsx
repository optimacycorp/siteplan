import type { ReactNode } from "react";

import { WorkflowProgress } from "@/modules/projects/WorkflowProgress";

import styles from "./ProjectWorkspaceShell.module.css";

type WorkflowStepKey = "parcel" | "subdivision" | "yield" | "site-planner";

type ProjectWorkspaceShellProps = {
  projectId: string;
  currentStep: WorkflowStepKey;
  parcelReady: boolean;
  layoutReady: boolean;
  scenarioReady: boolean;
  eyebrow?: string;
  title: string;
  description: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  bottomTray?: ReactNode;
};

export function ProjectWorkspaceShell(props: ProjectWorkspaceShellProps) {
  return (
    <div className={styles.page}>
      <WorkflowProgress
        current={props.currentStep}
        layoutReady={props.layoutReady}
        parcelReady={props.parcelReady}
        projectId={props.projectId}
        scenarioReady={props.scenarioReady}
      />
      <section className={styles.header}>
        <div className={styles.headerCopy}>
          {props.eyebrow ? <span className={styles.eyebrow}>{props.eyebrow}</span> : null}
          <strong>{props.title}</strong>
          <div className={styles.description}>{props.description}</div>
        </div>
        {props.headerActions ? <div className={styles.headerActions}>{props.headerActions}</div> : null}
      </section>
      {props.children}
      {props.bottomTray ? <section className={styles.bottomTray}>{props.bottomTray}</section> : null}
    </div>
  );
}
