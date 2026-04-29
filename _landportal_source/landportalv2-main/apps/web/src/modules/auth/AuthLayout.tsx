import type { PropsWithChildren, ReactNode } from "react";

import styles from "./AuthLayout.module.css";

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  description: string;
  aside?: ReactNode;
}>;

export function AuthLayout({ children, title, description, aside }: AuthLayoutProps) {
  return (
    <div className={styles.shell}>
      <section className={`${styles.panel} ${styles.hero}`}>
        <div className={styles.mark}>
          <div className={styles.badge} />
          <span>Land Portal V2</span>
        </div>
        <div className={styles.heroContent}>
          <h1>Survey-first project delivery for parcels, plats, and field crews.</h1>
          <p>
            Launch faster with a workspace built for survey operations, land planning, and
            document-ready project data.
          </p>
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span>Projects tracked</span>
              <strong>128</strong>
            </div>
            <div className={styles.statCard}>
              <span>Workspaces</span>
              <strong>6</strong>
            </div>
            <div className={styles.statCard}>
              <span>Exports this month</span>
              <strong>214</strong>
            </div>
          </div>
        </div>
        {aside}
      </section>
      <section className={`${styles.panel} ${styles.formPanel}`}>
        <div className={styles.formWrap}>
          <header className={styles.header}>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </div>
  );
}
