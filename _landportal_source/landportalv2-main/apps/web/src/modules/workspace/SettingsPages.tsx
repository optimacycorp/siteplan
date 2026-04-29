import styles from "@/modules/admin/AdminPage.module.css";

type AdminItem = {
  title: string;
  meta: string;
  value: string;
  tone?: "default" | "success" | "warn";
};

type AdminPageProps = {
  title: string;
  intro: string;
  items: AdminItem[];
  metrics: Array<{ label: string; value: string }>;
  secondaryTitle: string;
  secondaryItems: Array<{ title: string; meta: string }>;
};

function toneClass(tone: AdminItem["tone"]) {
  if (tone === "success") {
    return `${styles.badge} ${styles.success}`;
  }

  if (tone === "warn") {
    return `${styles.badge} ${styles.warn}`;
  }

  return styles.badge;
}

function AdminPage({ title, intro, items, metrics, secondaryItems, secondaryTitle }: AdminPageProps) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <strong>{title}</strong>
        <p>{intro}</p>
      </section>

      <section className={styles.layout}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Active records</strong>
            <span className={styles.muted}>Operational data and default presets for the workspace.</span>
          </div>
          <div className={styles.list}>
            {items.map((item) => (
              <div className={styles.item} key={item.title}>
                <div className={styles.row}>
                  <strong>{item.title}</strong>
                  <span className={toneClass(item.tone)}>{item.value}</span>
                </div>
                <span className={styles.muted}>{item.meta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Workspace signals</strong>
            <span className={styles.muted}>Helpful metrics and controls for Sprint 6 operations.</span>
          </div>
          <div className={styles.metrics}>
            {metrics.map((metric) => (
              <div className={styles.metricCard} key={metric.label}>
                <strong>{metric.value}</strong>
                <span className={styles.muted}>{metric.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.panelHeader}>
            <strong>{secondaryTitle}</strong>
          </div>
          <div className={styles.list}>
            {secondaryItems.map((item) => (
              <div className={styles.item} key={item.title}>
                <strong>{item.title}</strong>
                <span className={styles.muted}>{item.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function NtripPage() {
  return (
    <AdminPage
      intro="Workspace-managed correction profiles with send-position defaults and mount point coverage for field crews."
      items={[
        { title: "PointOneNav", meta: "truertk.pointonenav.com : 2101 • Mount POLARIS", value: "Active", tone: "success" },
        { title: "Front Range Base", meta: "Private caster for Colorado Central projects", value: "Draft" },
        { title: "Backup caster", meta: "Failover profile with auto-send disabled", value: "Review", tone: "warn" },
      ]}
      metrics={[
        { label: "Profiles", value: "3" },
        { label: "Field crews covered", value: "6" },
        { label: "Default mount", value: "POLARIS" },
        { label: "Last sync", value: "2h ago" },
      ]}
      secondaryItems={[
        { title: "Workspace default", meta: "PointOneNav is assigned to all new survey projects" },
        { title: "Role guard", meta: "Only admins and survey leads can edit credentials" },
      ]}
      secondaryTitle="Controls"
      title="NTRIP profiles"
    />
  );
}

export function CodeLibrariesPage() {
  return (
    <AdminPage
      intro="Shared code dictionaries for survey crews, as-builts, utilities, and parcel workflows."
      items={[
        { title: "Utility as-built", meta: "54 active point and line codes with validation notes", value: "v2.4", tone: "success" },
        { title: "Boundary monuments", meta: "18 monument and control point codes", value: "v1.8" },
        { title: "Planning overlays", meta: "Yield and parcel review annotations", value: "v0.9", tone: "warn" },
      ]}
      metrics={[
        { label: "Libraries", value: "3" },
        { label: "Codes available", value: "92" },
        { label: "Projects using default", value: "11" },
        { label: "Validation warnings", value: "2" },
      ]}
      secondaryItems={[
        { title: "Import policy", meta: "CSV dictionary imports require admin approval" },
        { title: "Project overrides", meta: "Allowed for parcel and plat modules only" },
      ]}
      secondaryTitle="Governance"
      title="Code libraries"
    />
  );
}

export function MapLayersPage() {
  return (
    <AdminPage
      intro="Basemap defaults, parcel overlays, and workspace visualization settings used across map, parcel, and plat pages."
      items={[
        { title: "Parcel fabric", meta: "Cached county parcel overlay with highlight styling", value: "Enabled", tone: "success" },
        { title: "Aerial imagery", meta: "Workspace default background for project map pages", value: "Default" },
        { title: "FEMA flood overlay", meta: "Prepared for advanced analysis module", value: "Standby", tone: "warn" },
      ]}
      metrics={[
        { label: "Layer presets", value: "7" },
        { label: "Default stack", value: "3 layers" },
        { label: "Projects inheriting", value: "12" },
        { label: "Tile cache", value: "Warm" },
      ]}
      secondaryItems={[
        { title: "Parcel route", meta: "Yield tint and flood overlays are available in Sprint 4 workspace" },
        { title: "Plat route", meta: "Annotation-friendly layer stack used for exhibits" },
      ]}
      secondaryTitle="Route integration"
      title="Map layers"
    />
  );
}

export function CoordinateSystemsPage() {
  return (
    <AdminPage
      intro="Coordinate presets, datum controls, and shared project system definitions."
      items={[
        { title: "NAD83(2011) Colorado Central", meta: "US survey feet • workspace default", value: "Default", tone: "success" },
        { title: "WGS84", meta: "Fallback for imports and mobile positioning", value: "Available" },
        { title: "Project-local origin mode", meta: "Enabled for traverse workflows", value: "Ready", tone: "success" },
      ]}
      metrics={[
        { label: "Presets", value: "4" },
        { label: "Default projects", value: "12" },
        { label: "Traverse-ready", value: "Yes" },
        { label: "Latest review", value: "Mar 16" },
      ]}
      secondaryItems={[
        { title: "Traverse support", meta: "Origin selection and computed coordinates respect the selected system" },
        { title: "Export policy", meta: "Plat and document exports inherit workspace CRS unless overridden" },
      ]}
      secondaryTitle="Integration"
      title="Coordinate systems"
    />
  );
}

export function TeamPage() {
  return (
    <AdminPage
      intro="People, roles, and permissions across workspaces and project modules."
      items={[
        { title: "Thomas C", meta: "Owner • Full workspace and billing access", value: "Admin", tone: "success" },
        { title: "Field Crew A", meta: "Survey technician • Map and traverse editing", value: "Editor" },
        { title: "Planning Lead", meta: "Parcel, yield, and document review access", value: "Reviewer", tone: "warn" },
      ]}
      metrics={[
        { label: "Members", value: "6" },
        { label: "Admins", value: "2" },
        { label: "Project editors", value: "3" },
        { label: "Pending invites", value: "1" },
      ]}
      secondaryItems={[
        { title: "Workspace permissions", meta: "Admin, editor, reviewer, billing-only" },
        { title: "Project guards", meta: "Parcel, plat, and document routes can be restricted per member" },
      ]}
      secondaryTitle="Permissions"
      title="Team members"
    />
  );
}

export function BillingPage() {
  return (
    <AdminPage
      intro="Workspace subscription, storage, and export usage for the land planning portal."
      items={[
        { title: "Professional workspace", meta: "12 active projects • 6 users • parcel + document modules", value: "$249/mo", tone: "success" },
        { title: "Document storage", meta: "Exports, previews, and generated reports", value: "42 GB" },
        { title: "Overage watch", meta: "No overages triggered this cycle", value: "Healthy", tone: "success" },
      ]}
      metrics={[
        { label: "Plan seats", value: "8" },
        { label: "Used seats", value: "6" },
        { label: "Monthly exports", value: "214" },
        { label: "Renewal", value: "Apr 01" },
      ]}
      secondaryItems={[
        { title: "Upgrade path", meta: "Enterprise tier unlocks approval workflows and larger storage tiers" },
        { title: "Current state", meta: "Enough capacity for Sprint 5/6 document and admin usage" },
      ]}
      secondaryTitle="Billing notes"
      title="Plan & billing"
    />
  );
}

export function SettingsPage() {
  return (
    <AdminPage
      intro="Workspace defaults, notifications, retention, and operational controls for project modules."
      items={[
        { title: "Default workspace region", meta: "Used for new projects and preset inheritance", value: "Colorado", tone: "success" },
        { title: "Export retention", meta: "Generated documents and preview artifacts", value: "90 days" },
        { title: "Permission mode", meta: "Workspace and project role guards enabled", value: "Strict", tone: "success" },
      ]}
      metrics={[
        { label: "Notification rules", value: "5" },
        { label: "Project templates", value: "3" },
        { label: "Role guards", value: "On" },
        { label: "Audit trail", value: "Enabled" },
      ]}
      secondaryItems={[
        { title: "Project defaults", meta: "Map, traverse, parcel, plat, and document routes inherit workspace settings" },
        { title: "Admin controls", meta: "Only admins may edit presets, billing, or permission templates" },
      ]}
      secondaryTitle="Operational notes"
      title="Settings"
    />
  );
}
