import { Link, Navigate } from "react-router-dom";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { useProjects } from "@/modules/projects/useProjects";

import { useWorkspaceModeStore, workspaceModeMeta } from "./workspaceModeStore";
import styles from "./WorkspacePage.module.css";

function useFeaturedProject() {
  const { data: projects = [], error, isLoading } = useProjects();
  return {
    error,
    featuredProject: projects[0] ?? null,
    isLoading,
    projects,
  };
}

function ProjectSpotlight({
  ctaLabel,
  ctaTo,
  eyebrow,
  summary,
}: {
  ctaLabel: string;
  ctaTo: string;
  eyebrow: string;
  summary: string;
}) {
  const { featuredProject, isLoading } = useFeaturedProject();

  if (isLoading) {
    return <LoadingState message="Loading project spotlight..." />;
  }

  if (!featuredProject) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelLabel}>{eyebrow}</div>
        <strong>No projects yet</strong>
        <div className={styles.muted}>Create a project to start property review, yield analysis, lot layouts, and site-planning workflows.</div>
        <Link to="/app/projects">
          <Button>Open projects</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelLabel}>{eyebrow}</div>
      <div className={styles.heroGrid}>
        <div>
          <strong>{featuredProject.name}</strong>
          <p className={styles.muted}>{summary}</p>
          <div className={styles.inlineMeta}>
            <span>{featuredProject.location}</span>
            <span>{featuredProject.status}</span>
            <span>{featuredProject.pointCount} stored points</span>
          </div>
        </div>
        <Link to={ctaTo.replace(":projectId", featuredProject.id)}>
          <Button>{ctaLabel}</Button>
        </Link>
      </div>
    </section>
  );
}

function ModeSummaryCard() {
  const mode = useWorkspaceModeStore((state) => state.mode);
  const openChooser = useWorkspaceModeStore((state) => state.openChooser);

  if (!mode) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelLabel}>Workspace mode</div>
        <strong>Choose a mode to personalize the workspace</strong>
        <div className={styles.muted}>Modes change the landing page, language, and which tools lead the experience.</div>
        <Button onClick={openChooser} type="button">Choose mode</Button>
      </section>
    );
  }

  const meta = workspaceModeMeta[mode];

  return (
    <section className={styles.panel}>
      <div className={styles.panelLabel}>Workspace mode</div>
      <strong>{meta.label}</strong>
      <div className={styles.muted}>{meta.description}</div>
      <div className={styles.inlineMeta}>
        <span>{meta.badge}</span>
        <span>Default route: {meta.defaultPath.replace("/app/", "")}</span>
      </div>
      <Button onClick={openChooser} type="button" variant="secondary">Switch mode</Button>
    </section>
  );
}

export function WorkspaceLandingPage() {
  const mode = useWorkspaceModeStore((state) => state.mode);

  if (!mode) {
    return <HomePage />;
  }

  return <Navigate replace to={workspaceModeMeta[mode].defaultPath} />;
}

export function HomePage() {
  const mode = useWorkspaceModeStore((state) => state.mode);
  const openChooser = useWorkspaceModeStore((state) => state.openChooser);
  const { projects } = useFeaturedProject();
  const activeMode = mode ? workspaceModeMeta[mode] : null;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <div className={styles.panelLabel}>Land development intelligence</div>
            <h2>Property-first planning, subdivision concepts, and clean site visuals now lead the product.</h2>
            <p>
              Survey remains available as an advanced module, while the main workspace speaks to development,
              acquisition, builder, and operations teams first.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Button onClick={openChooser} type="button">Choose workspace mode</Button>
            <Link to="/app/projects">
              <Button variant="secondary">Open projects</Button>
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span>Active projects</span>
          <strong>{projects.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Primary workflow</span>
          <strong>{activeMode?.label ?? "Choose mode"}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Flagship features</span>
          <strong>Subdivision + Site Planner</strong>
        </div>
      </div>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <div className={styles.panelLabel}>What changed</div>
          <div className={styles.list}>
            <div className={styles.listItem}>
              <div>
                <strong>Property, yield, subdivision, and site planning lead the UX</strong>
                <div className={styles.muted}>The app now tells a development story before exposing advanced survey tooling.</div>
              </div>
              <strong>Live</strong>
            </div>
            <div className={styles.listItem}>
              <div>
                <strong>Survey is now an advanced workspace</strong>
                <div className={styles.muted}>Traverse, coordinate systems, and NTRIP move under Advanced instead of top-level navigation.</div>
              </div>
              <strong>Live</strong>
            </div>
            <div className={styles.listItem}>
              <div>
                <strong>Persona-based landing routes</strong>
                <div className={styles.muted}>Acquisition lands in Yield, developers in Subdivision Designer, builders in Site Planner, and surveyors in Advanced Survey.</div>
              </div>
              <strong>Live</strong>
            </div>
          </div>
        </section>

        <ModeSummaryCard />
      </div>

      <section className={styles.panel}>
        <div className={styles.panelLabel}>Product roadmap toward Version 5</div>
        <div className={styles.featureGrid}>
          <Link className={styles.featureCard} to="/app/parcel">
            <strong>Property</strong>
            <p>Make property boundaries, zoning context, and constraints the source of truth.</p>
          </Link>
          <Link className={styles.featureCard} to="/app/yield">
            <strong>Yield Analyzer</strong>
            <p>Turn parcel assumptions into fast scenario comparisons for acquisition and planning teams.</p>
          </Link>
          <Link className={styles.featureCard} to="/app/subdivision">
            <strong>Subdivision Designer</strong>
            <p>The flagship feature: generate lot concepts, rules, and counts from parcel geometry.</p>
          </Link>
          <Link className={styles.featureCard} to="/app/site-planner">
            <strong>Site Planner</strong>
            <p>Produce presentation-ready site visuals with roads, footprints, utilities, and printable sheets.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

export function PropertyPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>Property is now the center of the workflow.</h2>
        <p>
          This workspace is where property boundaries, frontage, zoning, and constraints become the
          foundation for yield, lot layout, and site planning decisions.
        </p>
      </section>
      <ProjectSpotlight
        ctaLabel="Open property summary"
        ctaTo="/app/projects/:projectId/parcel"
        eyebrow="Property workflow"
        summary="Open the live property summary to review property metrics, overlays, and the current concept baseline."
      />
      <section className={styles.panel}>
        <div className={styles.panelLabel}>Next property milestones</div>
        <div className={styles.list}>
          <div className={styles.listItem}><div><strong>Property snapshots</strong><div className={styles.muted}>Persist property boundaries, source metadata, and constraints in Supabase.</div></div><strong>Next</strong></div>
          <div className={styles.listItem}><div><strong>Property inspector</strong><div className={styles.muted}>Show zoning, frontage, area, and risk factors in one place.</div></div><strong>In progress</strong></div>
          <div className={styles.listItem}><div><strong>Selection-driven workflows</strong><div className={styles.muted}>Make property selection the handoff into yield and lot-layout generation.</div></div><strong>Planned</strong></div>
        </div>
      </section>
    </div>
  );
}

export function YieldPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>Yield Analyzer is the first business-facing decision tool.</h2>
        <p>
          Use saved assumptions, homes-per-acre ranges, and buildable-area logic to compare scenarios that non-technical
          stakeholders can understand quickly.
        </p>
      </section>
      <ProjectSpotlight
        ctaLabel="Open yield analysis"
        ctaTo="/app/projects/:projectId/yield"
        eyebrow="Yield workflow"
        summary="Jump into the current project's scenario cards and unit summaries while the full yield engine comes online."
      />
      <section className={styles.panel}>
        <div className={styles.panelLabel}>Scenario design</div>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}><strong>Assumptions</strong><p>Homes per acre, lot size, setbacks, and open space.</p></div>
          <div className={styles.featureCard}><strong>Live recalculation</strong><p>Units, efficiency, and buildable area feedback.</p></div>
          <div className={styles.featureCard}><strong>Comparisons</strong><p>Highlight the strongest scenario for acquisition or developer review.</p></div>
        </div>
      </section>
    </div>
  );
}

export function SubdivisionPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>Subdivision Designer is the core product differentiator.</h2>
        <p>
          The next major engine will turn property boundaries and rules into candidate lot layouts, road concepts,
          frontage checks, and pitch-ready metrics.
        </p>
      </section>
      <ProjectSpotlight
        ctaLabel="Open subdivision designer"
        ctaTo="/app/projects/:projectId/subdivision"
        eyebrow="Core feature setup"
        summary="Today the subdivision workspace generates a first-pass lot layout from real property records and saved rulesets."
      />
      <section className={styles.panel}>
        <div className={styles.panelLabel}>Phase 1 designer plan</div>
        <div className={styles.list}>
          <div className={styles.listItem}><div><strong>Rulesets</strong><div className={styles.muted}>Minimum lot area, frontage, depth, setbacks, and road offset settings.</div></div><strong>Queued</strong></div>
          <div className={styles.listItem}><div><strong>Layout strategies</strong><div className={styles.muted}>Start with grid subdivision, then add frontage-aware and block-road strategies.</div></div><strong>Queued</strong></div>
          <div className={styles.listItem}><div><strong>Metrics</strong><div className={styles.muted}>Lot count, average area, open space, warnings, and failing lots.</div></div><strong>Queued</strong></div>
        </div>
      </section>
    </div>
  );
}

export function SitePlannerPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>Site Planner is the visual feature that makes the platform shareable.</h2>
        <p>
          This workspace will assemble roads, utilities, footprints, and clean print layers into visuals that look
          presentation-ready instead of GIS-heavy.
        </p>
      </section>
      <ProjectSpotlight
        ctaLabel="Open document preview"
        ctaTo="/app/projects/:projectId/plat"
        eyebrow="Visual workflow"
        summary="The current plan and report previews become the foundation for a cleaner site-planning composition layer."
      />
      <section className={styles.panel}>
        <div className={styles.panelLabel}>What the planner will show</div>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}><strong>Styled layers</strong><p>Roads, easements, utilities, trees, and footprints.</p></div>
          <div className={styles.featureCard}><strong>Print composition</strong><p>Title block, legend, north arrow, and scale bar.</p></div>
          <div className={styles.featureCard}><strong>Clean exports</strong><p>PDF-ready layouts built for demos, meetings, and LinkedIn posts.</p></div>
        </div>
      </section>
    </div>
  );
}

export function DocumentsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>Reports tie property, yield, lot layout, and site plans into a pitch-ready narrative.</h2>
        <p>
          Reports and exports should feel like business deliverables, not raw technical outputs. This workspace becomes
          the home for summaries, exports, and presentation packages.
        </p>
      </section>
      <ProjectSpotlight
        ctaLabel="Open document history"
        ctaTo="/app/projects/:projectId/documents"
        eyebrow="Report workflow"
        summary="Open the current project's report stack, then layer in yield summaries, lot layout briefs, and site plan exports."
      />
      <section className={styles.panel}>
        <div className={styles.panelLabel}>Document roadmap</div>
        <div className={styles.list}>
          <div className={styles.listItem}><div><strong>Yield report PDF</strong><div className={styles.muted}>Scenario results packaged for acquisition and entitlement review.</div></div><strong>Queued</strong></div>
          <div className={styles.listItem}><div><strong>Subdivision summary</strong><div className={styles.muted}>Lot counts, frontage exceptions, and open-space metrics in a clean report.</div></div><strong>Queued</strong></div>
          <div className={styles.listItem}><div><strong>Site plan export</strong><div className={styles.muted}>Presentation-ready PDF sheets with title block and legend.</div></div><strong>Queued</strong></div>
        </div>
      </section>
    </div>
  );
}

export function AdvancedSurveyPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>Advanced Survey keeps precision tooling available without leading the product story.</h2>
        <p>
          Traverse, coordinate systems, NTRIP, and code libraries remain available here for survey teams and power users.
        </p>
      </section>
      <ProjectSpotlight
        ctaLabel="Open advanced survey"
        ctaTo="/app/projects/:projectId/map"
        eyebrow="Advanced tools"
        summary="Use the project map and traverse workspaces when you need field-grade control, coordinate context, and precision editing."
      />
      <section className={styles.panel}>
        <div className={styles.panelLabel}>Advanced modules</div>
        <div className={styles.featureGrid}>
          <Link className={styles.featureCard} to="/app/advanced/coordinate-systems"><strong>Coordinate Systems</strong><p>Shared CRS presets and workspace standards.</p></Link>
          <Link className={styles.featureCard} to="/app/advanced/ntrip-profiles"><strong>NTRIP Profiles</strong><p>Correction profiles and field defaults.</p></Link>
          <Link className={styles.featureCard} to="/app/advanced/code-libraries"><strong>Code Libraries</strong><p>Shared survey dictionaries and collection standards.</p></Link>
        </div>
      </section>
    </div>
  );
}
