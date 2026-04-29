import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { useProjects } from "@/modules/projects/useProjects";
import { useProjectWorkspace } from "@/modules/projects/useProjectWorkspace";
import {
  computeTraverse,
  exportTraverseCsv,
  formatPrecisionRatio,
  type TraverseOrigin,
  type TraverseSegmentInput,
} from "@landportal/core-survey";
import styles from "./ProjectTraversePage.module.css";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildSketchPoints(points: Array<{ easting: number; northing: number }>) {
  if (points.length === 0) {
    return [] as Array<{ x: number; y: number }>;
  }

  const eastings = points.map((point) => point.easting);
  const northings = points.map((point) => point.northing);
  const minE = Math.min(...eastings);
  const maxE = Math.max(...eastings);
  const minN = Math.min(...northings);
  const maxN = Math.max(...northings);
  const width = Math.max(maxE - minE, 1);
  const height = Math.max(maxN - minN, 1);

  return points.map((point) => ({
    x: 40 + ((point.easting - minE) / width) * 420,
    y: 340 - ((point.northing - minN) / height) * 260,
  }));
}

export function ProjectTraversePage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const { data: workspace, error, isLoading } = useProjectWorkspace(projectId);
  const project = projects.find((entry) => entry.id === projectId);

  const originOptions = useMemo(
    () =>
      (workspace?.points ?? []).map((point) => ({
        id: point.id,
        label: point.name,
        easting: point.easting,
        northing: point.northing,
      })),
    [workspace?.points],
  );

  const [originMode, setOriginMode] = useState<"point" | "custom">("point");
  const [originPointId, setOriginPointId] = useState("");
  const [customLabel, setCustomLabel] = useState("Traverse Origin");
  const [customEasting, setCustomEasting] = useState("5000");
  const [customNorthing, setCustomNorthing] = useState("5000");
  const [segmentLabel, setSegmentLabel] = useState("Line 1");
  const [segmentAzimuth, setSegmentAzimuth] = useState("146.8");
  const [segmentDistance, setSegmentDistance] = useState("124.55");
  const [segments, setSegments] = useState<TraverseSegmentInput[]>([
    { id: crypto.randomUUID(), label: "Line 1", azimuth: 146.8, distance: 124.55 },
    { id: crypto.randomUUID(), label: "Line 2", azimuth: 181.2, distance: 96.2 },
    { id: crypto.randomUUID(), label: "Line 3", azimuth: 302.4, distance: 158.8 },
    { id: crypto.randomUUID(), label: "Line 4", azimuth: 21.5, distance: 91.7 },
  ]);

  useEffect(() => {
    if (!originPointId && originOptions[0]) {
      setOriginPointId(originOptions[0].id);
    }
  }, [originOptions, originPointId]);

  const origin: TraverseOrigin = useMemo(() => {
    if (originMode === "point") {
      const selected = originOptions.find((point) => point.id === originPointId) ?? originOptions[0];
      return {
        label: selected?.label ?? "Origin",
        easting: selected?.easting ?? 0,
        northing: selected?.northing ?? 0,
      };
    }

    return {
      label: customLabel || "Traverse Origin",
      easting: Number(customEasting) || 0,
      northing: Number(customNorthing) || 0,
    };
  }, [customEasting, customLabel, customNorthing, originMode, originOptions, originPointId]);

  const result = useMemo(() => computeTraverse(origin, segments), [origin, segments]);
  const sketchPoints = useMemo(() => buildSketchPoints(result.points), [result.points]);

  const handleAddSegment = () => {
    const nextAzimuth = Number(segmentAzimuth);
    const nextDistance = Number(segmentDistance);

    if (!Number.isFinite(nextAzimuth) || !Number.isFinite(nextDistance) || nextDistance <= 0) {
      return;
    }

    setSegments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: segmentLabel || `Line ${current.length + 1}`,
        azimuth: nextAzimuth,
        distance: nextDistance,
      },
    ]);
    setSegmentLabel(`Line ${segments.length + 2}`);
    setSegmentDistance("");
  };

  const handleRemoveSegment = (segmentId: string) => {
    setSegments((current) => current.filter((segment) => segment.id !== segmentId));
  };

  const handleExport = () => {
    const csv = exportTraverseCsv(origin, segments, result);
    const name = (project?.name ?? "traverse").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsv(`${name}-traverse.csv`, csv);
  };

  const pathData = sketchPoints.map((point) => `${point.x},${point.y}`).join(" ");

  if (error) {
    return <div className={styles.empty}>Unable to load project control data. {error.message}</div>;
  }

  if (isLoading || !workspace) {
    return <LoadingState message="Loading traverse workspace..." />;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <strong>{project?.name ?? "Traverse workspace"}</strong>
          <p>Origin selection now reads from Supabase-backed project control points while traverse math and CSV export stay in the shared survey package.</p>
        </div>
        <div className={styles.heroActions}>
          <Button onClick={handleExport} variant="secondary">Export CSV</Button>
          <Link to={`/app/projects/${projectId}/map`}>
            <Button variant="ghost">Back to map</Button>
          </Link>
        </div>
      </section>

      <section className={styles.shell}>
        <div className={styles.leftRail}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <strong>Origin selection</strong>
              <span className={styles.helper}>Use a stored project point or enter a custom starting coordinate.</span>
            </div>
            <div className={styles.actions}>
              <Button onClick={() => setOriginMode("point")} variant={originMode === "point" ? "primary" : "secondary"}>Project point</Button>
              <Button onClick={() => setOriginMode("custom")} variant={originMode === "custom" ? "primary" : "secondary"}>Custom origin</Button>
            </div>
            {originMode === "point" ? (
              <label className={styles.field}>
                <span>Origin point</span>
                <select className={styles.select} onChange={(event) => setOriginPointId(event.target.value)} value={originPointId}>
                  {originOptions.map((point) => (
                    <option key={point.id} value={point.id}>{point.label}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span>Label</span>
                  <input className={styles.input} onChange={(event) => setCustomLabel(event.target.value)} value={customLabel} />
                </label>
                <div />
                <label className={styles.field}>
                  <span>Easting</span>
                  <input className={styles.input} onChange={(event) => setCustomEasting(event.target.value)} value={customEasting} />
                </label>
                <label className={styles.field}>
                  <span>Northing</span>
                  <input className={styles.input} onChange={(event) => setCustomNorthing(event.target.value)} value={customNorthing} />
                </label>
              </div>
            )}
            <div className={styles.meta}>Origin: {origin.label} • E {origin.easting.toFixed(3)} • N {origin.northing.toFixed(3)}</div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <strong>Add line segment</strong>
              <span className={styles.helper}>Enter azimuth in decimal degrees clockwise from north.</span>
            </div>
            <label className={styles.field}>
              <span>Segment label</span>
              <input className={styles.input} onChange={(event) => setSegmentLabel(event.target.value)} value={segmentLabel} />
            </label>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Azimuth</span>
                <input className={styles.input} onChange={(event) => setSegmentAzimuth(event.target.value)} value={segmentAzimuth} />
              </label>
              <label className={styles.field}>
                <span>Distance (ft)</span>
                <input className={styles.input} onChange={(event) => setSegmentDistance(event.target.value)} value={segmentDistance} />
              </label>
            </div>
            <div className={styles.actions}>
              <Button onClick={handleAddSegment} type="button">Add segment</Button>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <strong>Segment list</strong>
              <span className={styles.helper}>{segments.length} entered segments</span>
            </div>
            <div className={styles.segmentList}>
              {segments.map((segment, index) => (
                <div className={styles.segmentItem} key={segment.id}>
                  <div className={styles.segmentTitle}>
                    <strong>{index + 1}. {segment.label}</strong>
                    <span className={styles.meta}>Azimuth {segment.azimuth.toFixed(4)}° • Distance {segment.distance.toFixed(3)} ft</span>
                  </div>
                  <button className={styles.iconButton} onClick={() => handleRemoveSegment(segment.id)} type="button">Remove</button>
                </div>
              ))}
              {segments.length === 0 ? <div className={styles.empty}>No segments entered yet.</div> : null}
            </div>
          </section>
        </div>

        <div className={styles.rightRail}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <strong>Closure analysis</strong>
              <span className={styles.helper}>Computed from the current origin and segment list.</span>
            </div>
            <div className={styles.metrics}>
              <div className={styles.metricCard}>
                <strong>{result.totalDistance.toFixed(2)} ft</strong>
                <span className={styles.meta}>Total distance</span>
              </div>
              <div className={styles.metricCard}>
                <strong>{result.closureDistance.toFixed(3)} ft</strong>
                <span className={styles.meta}>Closure error</span>
              </div>
              <div className={styles.metricCard}>
                <strong>{formatPrecisionRatio(result.precisionRatio)}</strong>
                <span className={styles.meta}>Relative precision</span>
              </div>
              <div className={styles.metricCard}>
                <strong>{result.points.length - 1}</strong>
                <span className={styles.meta}>Computed points</span>
              </div>
            </div>
            <div className={styles.grid2}>
              <div className={styles.metricCard}>
                <strong>{result.deltaEasting.toFixed(3)} ft</strong>
                <span className={styles.meta}>Delta Easting</span>
              </div>
              <div className={styles.metricCard}>
                <strong>{result.deltaNorthing.toFixed(3)} ft</strong>
                <span className={styles.meta}>Delta Northing</span>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <strong>Traverse sketch</strong>
              <span className={styles.helper}>Quick visual preview of the computed linework.</span>
            </div>
            <div className={styles.sketch}>
              <svg className={styles.sketchSvg} viewBox="0 0 500 380">
                {pathData ? <polyline className={styles.polyline} points={pathData} /> : null}
                {sketchPoints.map((point, index) => (
                  <g key={result.points[index]?.id ?? index}>
                    <circle className={index === 0 ? styles.originDot : styles.pointDot} cx={point.x} cy={point.y} r="5.5" />
                    <text className={styles.pointLabel} x={point.x + 8} y={point.y - 8}>{result.points[index]?.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <strong>Computed coordinates</strong>
              <span className={styles.helper}>Point list generated from the traverse segments.</span>
            </div>
            <div className={styles.coordsTable}>
              {result.points.map((point) => (
                <div className={styles.coordRow} key={point.id}>
                  <strong>{point.label}</strong>
                  <span>{point.easting.toFixed(3)}</span>
                  <span>{point.northing.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
