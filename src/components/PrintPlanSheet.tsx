import { useMemo } from "react";
import { distanceMeters, formatBearing, formatFeetLabel, summarizeDrawingFeature } from "../map/mapUtils";
import { useDrawingStore } from "../state/drawingStore";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { PrintScaleBar } from "./PrintScaleBar";

function formatFeatureLabel(type: string, count: number) {
  const labels: Record<string, string> = {
    "structure-polygon": "Structure",
    "driveway-line": "Driveway",
    "easement-line": "Easement",
    "dimension-line": "Dimension",
    "label-point": "Label",
  };
  return `${labels[type] ?? type} (${count})`;
}

type PrintPlanSheetProps = {
  variant: "map" | "details";
};

export function PrintPlanSheet({ variant }: PrintPlanSheetProps) {
  const parcel = useQuickSiteStore((state) => state.selectedParcel);
  const basemap = useQuickSiteStore((state) => state.basemap);
  const contoursVisible = useQuickSiteStore((state) => Boolean(state.layerVisibility.contours));
  const contourUnits = useQuickSiteStore((state) => state.terrainSettings.contourUnits);
  const exportMeta = useQuickSiteStore((state) => state.exportMeta);
  const drawings = useDrawingStore((state) => state.drawings);

  const drawingSummary = useMemo(() => {
    const counts = drawings.reduce<Record<string, number>>((acc, drawing) => {
      acc[drawing.type] = (acc[drawing.type] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([type, count]) => formatFeatureLabel(type, count));
  }, [drawings]);

  const printedAt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  const boundaryTables = useMemo(
    () =>
      drawings
        .filter((drawing) => drawing.type !== "label-point" && drawing.points.length >= 2)
        .map((drawing) => {
          const segments = drawing.points.flatMap((point, index, points) => {
            const nextIndex =
              drawing.type === "structure-polygon" ? (index + 1) % points.length : index + 1;
            const nextPoint = points[nextIndex];
            if (!nextPoint || (drawing.type !== "structure-polygon" && index === points.length - 1)) {
              return [];
            }

            return [
              {
                label: `${index + 1}`,
                bearing: formatBearing(point.lng, point.lat, nextPoint.lng, nextPoint.lat),
                distance: formatFeetLabel(
                  distanceMeters(point.lng, point.lat, nextPoint.lng, nextPoint.lat),
                ),
              },
            ];
          });

          return {
            id: drawing.id,
            label: drawing.label,
            segments,
          };
        })
        .filter((table) => table.segments.length > 0),
    [drawings],
  );

  const featureTable = useMemo(
    () =>
      drawings.map((drawing) => ({
        id: drawing.id,
        label: drawing.label,
        type: drawing.type,
        summary: summarizeDrawingFeature(drawing),
      })),
    [drawings],
  );

  if (variant === "map") {
    return (
      <div className="print-sheet print-sheet-map">
        <div className="print-card print-card-header">
          <div>
            <div className="print-kicker">Optimacy QuickSite</div>
            <h1>{exportMeta.projectTitle || "Conceptual Site Plan Exhibit"}</h1>
            <p>{parcel?.address || parcel?.headline || "Selected parcel"}</p>
          </div>
          <div className="print-card-header-tools">
            <PrintScaleBar />
            <div className="print-north-arrow" aria-label="North arrow">
              <span>N</span>
            </div>
          </div>
        </div>
        <div className="print-card print-card-map-footer">
          <div>
            <div className="print-section-title">Map type</div>
            <p>{basemap === "streets" ? "Streets" : basemap === "satellite" ? "Satellite" : basemap}</p>
          </div>
          <div>
            <div className="print-section-title">Source</div>
            <p>
              {parcel?.sourceKey || "local parcel cache"}
              {parcel?.sourceUrl ? " | county record available" : ""}
              {contoursVisible ? ` | USGS The National Map 3DEP contours (${contourUnits})` : ""}
            </p>
          </div>
          <div>
            <div className="print-section-title">Disclaimer</div>
            <p>
              {contoursVisible
                ? `Contours/elevation context shown from public USGS 3DEP/The National Map sources in ${contourUnits}. For planning only; verify with survey-grade field data where required.`
                : "Conceptual planning exhibit only. This drawing is not a boundary survey, improvement survey plat, legal description, or construction document. Parcel data, imagery, and public records should be independently verified."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-sheet print-sheet-details">
      <div className="print-details-page">
        <div className="print-details-title">
          <div>
            <div className="print-kicker">Optimacy QuickSite</div>
            <h1>{exportMeta.projectTitle || "Conceptual Site Plan Exhibit"}</h1>
            <p>{parcel?.address || parcel?.headline || "Selected parcel"}</p>
          </div>
          <div className="print-details-sheet-meta">
            <span>Sheet</span>
            <strong>{exportMeta.sheetNumber || "-"}</strong>
          </div>
        </div>

        <div className="print-card print-card-details-metadata">
          <div className="print-meta-grid">
            <div>
              <span>APN</span>
              <strong>{parcel?.apn || "-"}</strong>
            </div>
            <div>
              <span>Project no.</span>
              <strong>{exportMeta.projectNumber || "-"}</strong>
            </div>
            <div>
              <span>Owner</span>
              <strong>{parcel?.ownerName || "-"}</strong>
            </div>
            <div>
              <span>Area</span>
              <strong>{parcel?.areaAcres ? `${parcel.areaAcres.toFixed(2)} acres` : "-"}</strong>
            </div>
            <div>
              <span>Map type</span>
              <strong>
                {basemap === "streets" ? "Streets" : basemap === "satellite" ? "Satellite" : basemap}
              </strong>
            </div>
            <div>
              <span>County / State</span>
              <strong>{[parcel?.county, parcel?.state].filter(Boolean).join(", ") || "-"}</strong>
            </div>
            <div>
              <span>Zoning</span>
              <strong>{parcel?.zoning || "-"}</strong>
            </div>
            <div>
              <span>Printed</span>
              <strong>{printedAt}</strong>
            </div>
            <div>
              <span>Prepared for</span>
              <strong>{exportMeta.preparedFor || "-"}</strong>
            </div>
            <div>
              <span>Prepared by</span>
              <strong>{exportMeta.preparedBy || "-"}</strong>
            </div>
            <div>
              <span>Revision</span>
              <strong>{exportMeta.revision || "-"}</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>{parcel?.sourceKey || "local parcel cache"}</strong>
            </div>
          </div>
        </div>

        {boundaryTables.length ? (
          <div className="print-card print-card-details-boundary">
            <div className="print-section-title">Boundary / Line Table</div>
            {boundaryTables.map((table) => (
              <div className="print-boundary-table" key={table.id}>
                <strong>{table.label}</strong>
                <table>
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Bearing</th>
                      <th>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.segments.map((segment) => (
                      <tr key={segment.label}>
                        <td>{segment.label}</td>
                        <td>{segment.bearing}</td>
                        <td>{segment.distance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : null}

        {featureTable.length ? (
          <div className="print-card print-card-details-boundary">
            <div className="print-section-title">Feature Summary</div>
            <div className="print-boundary-table">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Type</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {featureTable.map((feature) => (
                    <tr key={feature.id}>
                      <td>{feature.label}</td>
                      <td>{feature.type}</td>
                      <td>
                        {feature.summary.areaSqft
                          ? `${feature.summary.areaSqft.toFixed(0)} sq ft`
                          : feature.summary.lengthFeet
                            ? `${feature.summary.lengthFeet.toFixed(1)} ft`
                            : `${feature.summary.vertexCount} point(s)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="print-card print-card-details-footer">
          <div>
            <div className="print-section-title">Plan Features</div>
            <p>{drawingSummary.length ? drawingSummary.join(" | ") : "No plan features added."}</p>
          </div>
          <div>
            <div className="print-section-title">Exhibit Notes</div>
            <p>{exportMeta.notes || "Conceptual planning exhibit only."}</p>
          </div>
          <div>
            <div className="print-section-title">Source</div>
            <p>
              {parcel?.sourceKey || "local parcel cache"}
              {parcel?.sourceUrl ? " | county record available" : ""}
              {contoursVisible ? ` | USGS The National Map 3DEP contours (${contourUnits})` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
