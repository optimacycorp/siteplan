import { useMemo, useState } from "react";
import type { SurveyPoint } from "@landportal/api-client";
import { Link, useParams } from "react-router-dom";

import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import { useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjects } from "@/modules/projects/useProjects";

import { BaseMapCanvas } from "./BaseMapCanvas";
import { MapControls } from "./MapControls";
import type { MapLayerDescriptor } from "./MapLayerManager";
import styles from "./ProjectMapPage.module.css";
import { useProjectMap } from "./useProjectMap";
import { useSharedMapState } from "./useSharedMapState";
import { useTerrainPointSample, useTerrainSourceMetadata } from "./useTerrain";

function formatPoint(point: SurveyPoint) {
  return `${point.code} | ${point.collectedAt}`;
}

export function ProjectMapPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const project = projects.find((entry) => entry.id === projectId);
  const { data: development } = useProjectDevelopment(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const { collections, error, isLoading, workspace } = useProjectMap(projectId);
  const mapState = useSharedMapState(`${projectId}:project-map`);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [terrainProbe, setTerrainProbe] = useState<{ lng: number; lat: number } | null>(null);
  const terrainMetadata = useTerrainSourceMetadata();
  const terrainSample = useTerrainPointSample(terrainProbe, mapState.terrainEnabled);

  const filteredPoints = useMemo(
    () =>
      (workspace?.points ?? []).filter((point) =>
        `${point.name} ${point.code}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, workspace?.points],
  );

  const selectedPoint =
    (workspace?.points ?? []).find((point) => point.id === selectedId) ??
    workspace?.points[0] ??
    null;
  const activeAnchorName =
    parcelSelection?.parcelName ||
    parcelSelection?.providerParcelId ||
    "No active parcel anchor";
  const parcelReady = Boolean(parcelSelection);
  const scenarioReady = Boolean(development?.scenarios?.length);
  const layoutReady = Boolean(development?.layouts?.length);

  const layers = useMemo<MapLayerDescriptor[]>(() => {
    if (!collections) return [];

    return [
      {
        id: "survey-lines-layer",
        sourceId: "survey-lines",
        source: {
          type: "geojson",
          data: collections.lines,
        },
        visible: mapState.visibility.linework,
        layer: {
          type: "line",
          paint: {
            "line-color": "#233252",
            "line-width": 3,
            "line-opacity": 0.88,
          },
        },
      },
      {
        id: "survey-points-layer",
        sourceId: "survey-points",
        source: {
          type: "geojson",
          data: collections.points,
        },
        visible: mapState.visibility.points,
        interactive: true,
        layer: {
          type: "circle",
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "id"], selectedPoint?.id ?? ""],
              "#f4f7ff",
              "#ffffff",
            ],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "id"], selectedPoint?.id ?? ""],
              "#2c37d4",
              "#17181a",
            ],
            "circle-stroke-width": [
              "case",
              ["==", ["get", "id"], selectedPoint?.id ?? ""],
              3,
              2,
            ],
            "circle-radius": [
              "case",
              ["==", ["get", "id"], selectedPoint?.id ?? ""],
              7,
              5,
            ],
          },
        },
      },
    ];
  }, [collections, mapState.visibility.linework, mapState.visibility.points, selectedPoint?.id]);

  if (isLoading) {
    return <LoadingState message="Loading project map..." />;
  }

  if (error || !workspace || !collections) {
    return (
      <div className={styles.emptyInspector}>
        Unable to load project geometry. {error?.message ?? "Project workspace data is unavailable."}
      </div>
    );
  }

  return (
    <ProjectWorkspaceShell
      currentStep="parcel"
      description={(
        <p>
          The project map now uses the same map-first foundation as the parcel workspace, so survey review starts from
          the active parcel anchor instead of a disconnected geometry viewer.
        </p>
      )}
      eyebrow="Project map"
      headerActions={(
        <>
          <span className={styles.statPill}>{workspace.points.length} stored points</span>
          <span className={styles.statPill}>{workspace.segments.length} stored segments</span>
          <span className={styles.statPill}>{activeAnchorName}</span>
          <Link to={`/app/projects/${projectId}/parcel`}>
            <Button variant="secondary">Open parcel workspace</Button>
          </Link>
        </>
      )}
      layoutReady={layoutReady}
      parcelReady={parcelReady}
      projectId={projectId}
      scenarioReady={scenarioReady}
      title={project?.name ?? "Project map editor"}
      bottomTray={(
        <ProjectReadinessTray
          actions={(
            <>
              <Link to={`/app/projects/${projectId}/parcel`}><Button variant="secondary">Review parcel anchor</Button></Link>
              <Link to={`/app/projects/${projectId}/title`}><Button variant="ghost">Open title workspace</Button></Link>
            </>
          )}
          blockers={parcelSelection ? [] : ["No active parcel anchor is attached yet. Start in Property and attach one parcel first."]}
          checks={[
            "Shared map foundation is active for survey review.",
            parcelSelection ? `Current parcel anchor: ${activeAnchorName}.` : "Parcel anchor still needs to be selected.",
            `${workspace.points.length} survey point${workspace.points.length === 1 ? "" : "s"} are available for review.`,
          ]}
          summary={parcelSelection
            ? "Survey review is now anchored to the active parcel so map, title, and geometry checks stay in the same spatial context."
            : "Attach one parcel anchor first so the survey review workspace has a single spatial truth."}
          tone={parcelSelection ? "ready" : "attention"}
          title="Map-first survey review"
        />
      )}
    >
      <section className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <strong>Objects</strong>
              <span className={styles.helper}>Supabase-backed points</span>
            </div>
            <input
              className={styles.search}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search points"
              value={query}
            />
          </div>
          <div className={styles.objectList}>
            <div className={`${styles.objectItem} ${parcelSelection ? styles.objectItemActive : ""}`}>
              <strong>Active parcel anchor</strong>
              <span className={styles.objectMeta}>{activeAnchorName}</span>
              <span className={styles.objectMeta}>
                {parcelSelection
                  ? `${parcelSelection.parcelProvider} | ${parcelSelection.anchorStatus}`
                  : "Attach a parcel in Property to anchor this survey view."}
              </span>
            </div>
            {filteredPoints.map((point) => (
              <button
                className={`${styles.objectItem} ${point.id === selectedPoint?.id ? styles.objectItemActive : ""}`}
                key={point.id}
                onClick={() => setSelectedId(point.id)}
                type="button"
              >
                <strong>{point.name}</strong>
                <span className={styles.objectMeta}>{formatPoint(point)}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className={styles.canvasWrap}>
          <MapControls
            basemap={mapState.basemap}
            hillshadeActive={mapState.hillshadeEnabled}
            onBasemapChange={mapState.setBasemap}
            onFit={mapState.triggerFit}
            onToggleHillshade={mapState.toggleHillshade}
            onToggleTerrain={mapState.toggleTerrain}
            terrainActive={mapState.terrainEnabled}
            title={workspace.mapLabel}
            toggles={[
              {
                key: "points",
                label: "points",
                active: mapState.visibility.points,
                onToggle: () => mapState.toggleLayer("points"),
              },
              {
                key: "linework",
                label: "linework",
                active: mapState.visibility.linework,
                onToggle: () => mapState.toggleLayer("linework"),
              },
            ]}
          />
          <BaseMapCanvas
            basemap={mapState.basemap}
            bounds={collections.bounds}
            center={collections.center}
            fitNonce={mapState.fitNonce}
            layers={layers}
            onFeatureSelect={(layerId, feature) => {
              if (layerId !== "survey-points-layer") return;
              const pointId = feature.properties?.id;
              if (typeof pointId === "string") {
                setSelectedId(pointId);
              }
            }}
            onMapClick={(coordinate) => {
              if (!mapState.terrainEnabled) return;
              setTerrainProbe(coordinate);
            }}
            zoom={collections.zoom}
          />
          <div className={styles.statusBar}>
            <div className={styles.statusCard}>
              <strong>{workspace.system}</strong>
              <span className={styles.meta}>Coordinate system</span>
            </div>
            <div className={styles.statusCard}>
              <strong>{workspace.spatialReference.horizontalName}</strong>
              <span className={styles.meta}>Display CRS</span>
            </div>
            <div className={styles.statusCard}>
              <strong>{selectedPoint?.name ?? "No point selected"}</strong>
              <span className={styles.meta}>Current selection</span>
            </div>
            <div className={styles.statusCard}>
              <strong>{workspace.points.length}</strong>
              <span className={styles.meta}>Visible points</span>
            </div>
            <div className={styles.statusCard}>
              <strong>{terrainSample.data ? `${terrainSample.data.elevationFt.toFixed(1)} ft` : mapState.terrainEnabled ? "Sampling..." : "Terrain off"}</strong>
              <span className={styles.meta}>Clicked elevation</span>
            </div>
          </div>
        </div>

        <aside className={styles.inspector}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <strong>Selected point</strong>
              {selectedPoint ? <span className={styles.solution}>{selectedPoint.solution}</span> : null}
            </div>
            <span className={styles.helper}>
              The shared map foundation now keeps map selection and the right-side inspector in sync.
            </span>
          </div>

          {selectedPoint ? (
            <>
              <div className={styles.infoCard}>
                <strong>{selectedPoint.name}</strong>
                <div className={styles.kv}><span>Code</span><span>{selectedPoint.code}</span></div>
                <div className={styles.kv}><span>Collector</span><span>{selectedPoint.collector}</span></div>
                <div className={styles.kv}><span>Collected</span><span>{selectedPoint.collectedAt}</span></div>
              </div>
              <div className={styles.infoCard}>
                <strong>Coordinates</strong>
                <div className={styles.kv}><span>Easting</span><span>{selectedPoint.easting.toFixed(3)} sft</span></div>
                <div className={styles.kv}><span>Northing</span><span>{selectedPoint.northing.toFixed(3)} sft</span></div>
                <div className={styles.kv}><span>Elevation</span><span>{selectedPoint.elevation.toFixed(3)} sft</span></div>
              </div>
              <div className={styles.infoCard}>
                <strong>Survey quality</strong>
                <div className={styles.kv}><span>Solution</span><span>{selectedPoint.solution}</span></div>
                <div className={styles.kv}><span>RMS</span><span>{selectedPoint.rms}</span></div>
                <div className={styles.kv}><span>Coordinate system</span><span>{workspace.system}</span></div>
              </div>
              <div className={styles.infoCard}>
                <strong>Terrain</strong>
                <div className={styles.kv}><span>Status</span><span>{mapState.terrainEnabled ? "Terrain probe enabled" : "Terrain probe off"}</span></div>
                <div className={styles.kv}><span>Source</span><span>{terrainMetadata.data?.sourceName ?? "Loading terrain source"}</span></div>
                <div className={styles.kv}><span>Coverage</span><span>{terrainMetadata.data?.coverage ?? "Preparing terrain summary"}</span></div>
                <div className={styles.kv}><span>Elevation</span><span>{terrainSample.data ? `${terrainSample.data.elevationFt.toFixed(1)} ft` : "Click map with terrain on"}</span></div>
                <div className={styles.kv}><span>Slope</span><span>{terrainSample.data ? `${terrainSample.data.slopePercent.toFixed(1)}%` : "Pending sample"}</span></div>
                <div className={styles.kv}><span>Aspect</span><span>{terrainSample.data ? `${terrainSample.data.aspectDegrees.toFixed(0)}°` : "Pending sample"}</span></div>
              </div>
            </>
          ) : (
            <div className={styles.emptyInspector}>Select a point from the object tree or directly on the map.</div>
          )}
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}
