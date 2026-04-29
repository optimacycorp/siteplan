import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";

import styles from "./WorkflowProgress.module.css";

type WorkflowStepKey = "parcel" | "subdivision" | "yield" | "site-planner";

type WorkflowProgressProps = {
  projectId: string;
  current: WorkflowStepKey;
  parcelReady: boolean;
  layoutReady: boolean;
  scenarioReady: boolean;
};

const stepConfig: Array<{ key: WorkflowStepKey; label: string; path: string }> = [
  { key: "parcel", label: "Select + Analyze", path: "parcel" },
  { key: "subdivision", label: "Generate Layout", path: "subdivision" },
  { key: "yield", label: "Evaluate Yield", path: "yield" },
  { key: "site-planner", label: "Present Plan", path: "site-planner" },
];

function isComplete(step: WorkflowStepKey, flags: Pick<WorkflowProgressProps, "parcelReady" | "layoutReady" | "scenarioReady">) {
  if (step === "parcel") return flags.parcelReady;
  if (step === "subdivision") return flags.layoutReady;
  if (step === "yield") return flags.scenarioReady;
  return flags.layoutReady && flags.scenarioReady;
}

function nextStep(projectId: string, flags: Pick<WorkflowProgressProps, "parcelReady" | "layoutReady" | "scenarioReady">) {
  if (!flags.parcelReady) {
    return {
      href: `/app/projects/${projectId}/parcel`,
      label: "Run parcel analysis",
      detail: "Start with parcel intelligence so every downstream result has a trustworthy base.",
    };
  }
  if (!flags.layoutReady) {
    return {
      href: `/app/projects/${projectId}/subdivision`,
      label: "Generate a layout",
      detail: "Pick a strategy and save a concept so Yield and Site Planner can follow it.",
    };
  }
  if (!flags.scenarioReady) {
    return {
      href: `/app/projects/${projectId}/yield`,
      label: "Evaluate yield",
      detail: "Save a scenario to turn the layout into a recommendation instead of just geometry.",
    };
  }
  return {
    href: `/app/projects/${projectId}/site-planner`,
    label: "Open site planner",
    detail: "Carry the selected layout and scenario into the presentation layer.",
  };
}

export function WorkflowProgress(props: WorkflowProgressProps) {
  const stepStates = stepConfig.map((step) => ({
    ...step,
    complete: isComplete(step.key, props),
    current: props.current === step.key,
  }));
  const next = nextStep(props.projectId, props);

  return (
    <section className={styles.panel}>
      <div className={styles.steps}>
        {stepStates.map((step, index) => (
          <Link
            className={`${styles.step} ${step.complete ? styles.stepComplete : ""} ${step.current ? styles.stepCurrent : ""}`}
            key={step.key}
            to={`/app/projects/${props.projectId}/${step.path}`}
          >
            <span className={styles.stepNumber}>{index + 1}</span>
            <span className={styles.stepLabel}>{step.label}</span>
            <span className={styles.stepMeta}>
              {step.current ? "Current" : step.complete ? "Complete" : "Next"}
            </span>
          </Link>
        ))}
      </div>
      <div className={styles.next}>
        <div className={styles.nextBody}>
          <strong>Next step</strong>
          <span>{next.detail}</span>
        </div>
        <Link to={next.href}><Button variant="secondary">{next.label}</Button></Link>
      </div>
    </section>
  );
}
