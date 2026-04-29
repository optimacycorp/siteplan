import { useEffect, useState, type PropsWithChildren } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/modules/auth/authStore";
import { WorkspaceModeDialog } from "@/modules/workspace/WorkspaceModeDialog";
import { useWorkspaceModeStore, workspaceModeMeta } from "@/modules/workspace/workspaceModeStore";

import styles from "./AppShell.module.css";

const primaryRoutes = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Projects", to: "/app/projects" },
  { label: "Property", to: "/app/parcel" },
  { label: "Yield", to: "/app/yield" },
  { label: "Subdivision Designer", to: "/app/subdivision" },
  { label: "Site Planner", to: "/app/site-planner" },
  { label: "Reports", to: "/app/documents" },
];

const advancedRoutes = [
  { label: "Survey Tools", to: "/app/advanced/survey" },
  { label: "Coordinate Systems", to: "/app/advanced/coordinate-systems" },
  { label: "NTRIP Profiles", to: "/app/advanced/ntrip-profiles" },
  { label: "Code Libraries", to: "/app/advanced/code-libraries" },
];

const workspaceRoutes = [
  { label: "Settings", to: "/app/settings" },
  { label: "Team", to: "/app/team" },
  { label: "Sysadmin Users", to: "/app/sysadmin/users" },
  { label: "Billing", to: "/app/billing" },
];

function Section({ collapsed = false, label, items }: PropsWithChildren<{ collapsed?: boolean; label: string; items: Array<{ label: string; to: string }> }>) {
  const compactLabel = (value: string) =>
    value
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 3)
      .toUpperCase();

  return (
    <div className={styles.navSection}>
      <div className={`${styles.navLabel} ${collapsed ? styles.hiddenContent : ""}`}>{label}</div>
      {items.map((item) => (
        <NavLink key={item.to} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`} to={item.to}>
          <span>{collapsed ? compactLabel(item.label) : item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const mode = useWorkspaceModeStore((state) => state.mode);
  const openChooser = useWorkspaceModeStore((state) => state.openChooser);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSidebarCollapsed(window.localStorage.getItem("landportal:sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("landportal:sidebar-collapsed", sidebarCollapsed ? "true" : "false");
  }, [sidebarCollapsed]);

  const titleMap: Record<string, { title: string; description: string }> = {
    "/app": { title: "Workspace", description: "A persona-aware landing route redirects you into the workflow that matches your role." },
    "/app/dashboard": { title: "Dashboard", description: "Lead with property, yield, lot layout, and site planning while keeping survey in Advanced." },
    "/app/projects": { title: "Projects", description: "Projects remain the working container for property review, yield scenarios, layout concepts, and reports." },
    "/app/parcel": { title: "Property", description: "Property boundaries, zoning context, and constraints now anchor the main workflow." },
    "/app/yield": { title: "Yield Analyzer", description: "Business-facing scenarios for homes, buildable area, and acquisition decisions." },
    "/app/subdivision": { title: "Subdivision Designer", description: "Turn a property into lot concepts, layout rules, and decision-ready metrics." },
    "/app/site-planner": { title: "Site Planner", description: "Create clear, printable plan views with footprints, trees, utilities, and overlays." },
    "/app/documents": { title: "Reports", description: "Collect summaries, exports, and presentation-ready deliverables in one place." },
    "/app/design": { title: "Design Console", description: "Unified parcel-first workspace for overlays, subdivision setup, site planning, and output generation." },
    "/app/advanced/survey": { title: "Advanced Survey Tools", description: "Precision map and boundary workflows stay available as a power-user workspace." },
    "/app/advanced/ntrip-profiles": { title: "NTRIP Profiles", description: "Manage correction profiles and field connectivity defaults for survey operations." },
    "/app/advanced/code-libraries": { title: "Code Libraries", description: "Maintain shared survey coding standards without surfacing them in the main workflow." },
    "/app/advanced/coordinate-systems": { title: "Coordinate Systems", description: "Configure CRS presets and datum standards for advanced survey work." },
    "/app/team": { title: "Team", description: "Manage workspace members, roles, and collaboration settings." },
    "/app/sysadmin/users": { title: "Sysadmin Users", description: "Add, modify, and remove Supabase-backed portal users." },
    "/app/billing": { title: "Billing", description: "Track subscription status, seats, and report/export usage." },
    "/app/settings": { title: "Settings", description: "Set workspace defaults, language, data retention, and operating preferences." },
    "/app/settings/map-layers": { title: "Map Layers", description: "Tune basemaps and overlays that feed property, planning, and reporting views." },
  };

  const fallbackTitle = location.pathname.startsWith("/app/projects/")
    ? { title: "Project workspace", description: "Project routes now lead with property review, yield, layout concepts, and reports." }
    : { title: "Workspace", description: "Land development platform" };

  const header = titleMap[location.pathname] ?? fallbackTitle;
  const modeMeta = mode ? workspaceModeMeta[mode] : null;

  return (
    <>
      <div className={`${styles.shell} ${sidebarCollapsed ? styles.shellCollapsed : ""}`}>
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
          <button
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            className={styles.sidebarHandle}
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            type="button"
          >
            <span className={`${styles.sidebarHandleChevron} ${sidebarCollapsed ? styles.sidebarHandleChevronCollapsed : ""}`} />
            <span className={styles.sidebarHandleBars}>
              <span />
              <span />
              <span />
            </span>
          </button>
          <div className={styles.brand}>
            <div className={styles.brandIcon} />
            <div className={`${styles.brandText} ${sidebarCollapsed ? styles.hiddenContent : ""}`}>
              <strong>Land Portal V2</strong>
              <span>Land development intelligence</span>
            </div>
          </div>

          <div className={`${styles.workspaceCard} ${sidebarCollapsed ? styles.hiddenContent : ""}`}>
            <span>Active workspace</span>
            <strong>{user?.workspaceName}</strong>
            <div className={styles.workspaceMeta}>{modeMeta?.label ?? "Choose mode"}</div>
          </div>

          <Section collapsed={sidebarCollapsed} items={primaryRoutes} label="Workspace" />
          <Section collapsed={sidebarCollapsed} items={advancedRoutes} label="Advanced" />
          <Section collapsed={sidebarCollapsed} items={workspaceRoutes} label="Operations" />

          <div className={styles.sidebarFooter}>
            <div className={styles.userCard}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className={styles.avatar} />
                <div className={sidebarCollapsed ? styles.hiddenContent : ""}>
                  <strong>{user?.name}</strong>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{user?.email}</div>
                  <div style={{ color: "var(--color-text-soft)", fontSize: 12, textTransform: "capitalize" }}>{user?.role}</div>
                </div>
              </div>
              <Button onClick={() => void logout()} variant="ghost">{sidebarCollapsed ? "Out" : "Sign out"}</Button>
            </div>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarTitle}>
              <h1>{header.title}</h1>
              <p>{header.description}</p>
            </div>
            <div className={styles.topbarActions}>
              <div className={styles.workspaceCard}>
                <span>Workspace mode</span>
                <strong>{modeMeta?.label ?? "Not set"}</strong>
                <div className={styles.workspaceMeta}>{modeMeta?.badge ?? "Choose a persona"}</div>
              </div>
              <Button onClick={openChooser} type="button" variant="secondary">Switch mode</Button>
            </div>
          </header>

          <main className={styles.content}>
            <div className={styles.contentInner}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <WorkspaceModeDialog />
    </>
  );
}
