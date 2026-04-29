import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";

import { useProjects } from "./useProjects";
import styles from "@/modules/workspace/WorkspacePage.module.css";

const routeCards = [
  { title: "Workflow", description: "Follow the guided path from parcel review through layout, yield, and presentation.", href: "workflow", cta: "Open workflow" },
  { title: "Design Console", description: "Work in a parcel-first operator console with overlays, contour controls, and site-plan-ready map output.", href: "design", cta: "Open console" },
  { title: "Project summary", description: "Ownership, location, and delivery readiness.", href: "overview", cta: "Open summary" },
  { title: "Property Summary", description: "Review boundary, zoning, buildable area, and constraints.", href: "parcel", cta: "Open property" },
  { title: "Yield Analyzer", description: "Compare homes, efficiency, and open-space assumptions.", href: "yield", cta: "Open yield" },
  { title: "Subdivision Designer", description: "Generate lot layouts from the property shape and current rules.", href: "subdivision", cta: "Open layout" },
  { title: "Site Planner", description: "Review building footprints, trees, utilities, easements, and plan overlays.", href: "site-planner", cta: "Open plan" },
  { title: "Reports", description: "Track summaries, exports, and presentation-ready deliverables.", href: "documents", cta: "Open reports" },
  { title: "Advanced Survey Tools", description: "Use boundary and precision workflows only when needed.", href: "map", cta: "Open survey tools" },
];

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h2>{project?.name ?? "Project summary"}</h2>
        <p>
          {project?.description ??
            "This project is set up for property review, yield studies, lot layout concepts, site planning, and optional advanced survey work."}
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelLabel}>Project details</div>
        <div className={styles.list}>
          <div className={styles.listItem}>
            <div>
              <strong>Location</strong>
              <div className={styles.muted}>{project?.location ?? "Colorado"}</div>
            </div>
            <strong>{project?.status ?? "Draft"}</strong>
          </div>
          <div className={styles.listItem}>
            <div>
              <strong>Project lead</strong>
              <div className={styles.muted}>{project?.owner ?? "Unassigned"}</div>
            </div>
            <strong>{project?.pointCount ?? 0} stored survey points</strong>
          </div>
          <div className={styles.listItem}>
            <div>
              <strong>Ready to review</strong>
              <div className={styles.muted}>This project is available in Supabase and ready for property, yield, lot layout, and reporting workflows.</div>
            </div>
            <Link to={`/app/projects/${projectId}/workflow`}>
              <Button>Open project workflow</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelLabel}>Project workspaces</div>
        <div className={styles.list}>
          {routeCards.map((card) => (
            <div className={styles.listItem} key={card.title}>
              <div>
                <strong>{card.title}</strong>
                <div className={styles.muted}>{card.description}</div>
              </div>
              <Link to={`/app/projects/${projectId}/${card.href}`}>
                <Button variant="secondary">{card.cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
