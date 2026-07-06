import { useRef, useState } from "react";
import { useDrawingStore } from "../../state/drawingStore";
import { useGisLayerStore } from "../../state/gisLayerStore";
import { useQuickSiteStore } from "../../state/quickSiteStore";
import {
  buildProjectGeoJson,
  downloadGeoJson,
  featureCollectionBounds,
  importGisFile,
} from "../../services/gisImportService";
import { EmptyState } from "../../components/EmptyState";
import { InlineNotice } from "../../components/InlineNotice";

export function GisDataPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importTone, setImportTone] = useState<"info" | "success" | "warning">("info");
  const layers = useGisLayerStore((state) => state.layers);
  const selectedLayerId = useGisLayerStore((state) => state.selectedLayerId);
  const addLayer = useGisLayerStore((state) => state.addLayer);
  const removeLayer = useGisLayerStore((state) => state.removeLayer);
  const clearLayers = useGisLayerStore((state) => state.clearLayers);
  const toggleLayerVisibility = useGisLayerStore((state) => state.toggleLayerVisibility);
  const selectLayer = useGisLayerStore((state) => state.selectLayer);
  const focusMapBounds = useQuickSiteStore((state) => state.focusMapBounds);
  const drawings = useDrawingStore((state) => state.drawings);

  async function handleFile(file: File | null) {
    if (!file) return;
    const result = await importGisFile(file);
    if (!result.ok) {
      setImportTone("warning");
      setImportMessage(result.error);
      return;
    }

    addLayer(result.layer);
    setImportTone(result.layer.warnings.length ? "warning" : "success");
    setImportMessage(
      result.layer.warnings.length
        ? `${result.layer.name} imported with ${result.layer.warnings.length} warning${result.layer.warnings.length === 1 ? "" : "s"}.`
        : `${result.layer.name} imported successfully.`,
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function exportProjectLayers() {
    const featureCollection = buildProjectGeoJson({
      drawings,
      gisLayers: layers,
    });
    downloadGeoJson(featureCollection, "siteplan-gis-export.geojson");
  }

  return (
    <section className="panel-section">
      <h2>5. GIS data manager</h2>
      <p className="muted">
        Import GeoJSON or WGS84 CSV point files, review warnings, and export current GIS layers plus drawn features as GeoJSON.
      </p>
      <label className="field-label" htmlFor="gis-file-upload">
        GIS file
        <input
          id="gis-file-upload"
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,.csv,.kml,.shp,.zip,.dxf"
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <InlineNotice tone="info">
        GeoJSON and CSV are active in this sprint. KML, Shapefile, and DXF are recognized but intentionally deferred to server processing.
      </InlineNotice>
      {importMessage ? <InlineNotice tone={importTone}>{importMessage}</InlineNotice> : null}
      {!layers.length ? (
        <EmptyState
          title="No GIS layers imported yet"
          body="Upload a GeoJSON file or a CSV with longitude and latitude columns to add context layers to the map."
        />
      ) : null}
      {layers.map((layer) => {
        const bounds = featureCollectionBounds(layer.data);
        const isSelected = layer.id === selectedLayerId;
        return (
          <div className={`result-card ${isSelected ? "result-card-active" : ""}`} key={layer.id}>
            <button className="result-card-button" onClick={() => selectLayer(layer.id)} type="button">
              <strong>{layer.name}</strong>
              <p className="muted">
                {layer.sourceType.toUpperCase()} | {layer.featureCount} feature{layer.featureCount === 1 ? "" : "s"} | {layer.geometryTypes.join(", ")}
              </p>
              <span className="result-meta">
                {layer.crsName ? `CRS: ${layer.crsName}` : "CRS not declared"}
              </span>
            </button>
            {layer.warnings.length ? (
              <InlineNotice tone="warning">{layer.warnings[0]}</InlineNotice>
            ) : null}
            <div className="card-actions">
              <button className="secondary-button" onClick={() => toggleLayerVisibility(layer.id)} type="button">
                {layer.visible ? "Hide" : "Show"}
              </button>
              <button
                className="secondary-button"
                disabled={!bounds}
                onClick={() => bounds && focusMapBounds(bounds, 18)}
                type="button"
              >
                Zoom
              </button>
              <button
                className="secondary-button"
                onClick={() => downloadGeoJson(layer.data, `${layer.name}.geojson`)}
                type="button"
              >
                Export
              </button>
              <button className="secondary-button" onClick={() => removeLayer(layer.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        );
      })}
      <div className="card-actions">
        <button className="primary-button" disabled={!layers.length && !drawings.length} onClick={exportProjectLayers} type="button">
          Export project GeoJSON
        </button>
        <button className="secondary-button" disabled={!layers.length} onClick={clearLayers} type="button">
          Clear GIS layers
        </button>
      </div>
    </section>
  );
}
