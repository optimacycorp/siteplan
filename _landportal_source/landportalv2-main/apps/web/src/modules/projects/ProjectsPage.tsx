import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";

import { CreateProjectModal } from "./CreateProjectModal";
import { useProjects } from "./useProjects";
import styles from "./ProjectGrid.module.css";

export function ProjectsPage() {
  const { data: projects = [], error, isLoading } = useProjects();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);

  const filtered = useMemo(
    () =>
      projects.filter((project) =>
        [project.name, project.description, project.location].some((value) =>
          value.toLowerCase().includes(query.toLowerCase()),
        ),
      ),
    [projects, query],
  );

  if (isLoading) {
    return <LoadingState message="Loading projects..." />;
  }

  if (error) {
    return <div className={styles.empty}>Unable to load projects right now. {(error as Error).message}</div>;
  }

  return (
    <>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
          value={query}
        />
        <div className={styles.actions}>
          <Button onClick={() => setIsCreating(true)} ref={createButtonRef}>+ New project</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>No projects match your search yet.</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((project) => (
            <article className={styles.card} key={project.id}>
              <Link aria-label={`Open ${project.name}`} className={styles.cardLink} to={`/app/projects/${project.id}`}>
                <div className={styles.cardPreview} style={{ background: project.color }}>
                  <div className={styles.previewPattern} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.statusRow}>
                    <h3>{project.name}</h3>
                    <span className={`${styles.status} ${styles[project.status]}`}>{project.status}</span>
                  </div>
                  <p>{project.description}</p>
                  <div className={styles.meta}>
                    {project.pointCount} points • {project.updatedAt} • {project.owner}
                  </div>
                  <div className={styles.meta}>{project.location}</div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {isCreating ? (
        <CreateProjectModal
          initialFocusRef={createButtonRef}
          onClose={() => setIsCreating(false)}
        />
      ) : null}
    </>
  );
}
