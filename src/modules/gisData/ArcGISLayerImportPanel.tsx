import { useState } from "react";
import {
  describeArcGisLayerExtent,
  fetchArcGisLayerMetadata,
  importArcGisLayer,
} from "../../services/arcgisService";
import { useGisLayerStore } from "../../state/gisLayerStore";
import { InlineNotice } from "../../components/InlineNotice";

export function ArcGISLayerImportPanel() {
  const addLayer = useGisLayerStore((state) => state.addLayer);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "warning">("info");
  const [metadata, setMetadata] = useState<{
    name: string;
    geometryType: string;
    objectIdField: string;
    spatialReference: string;
    sourceUrl: string;
  } | null>(null);

  async function previewLayer() {
    setLoading(true);
    setMessage("");
    try {
      const nextMetadata = await fetchArcGisLayerMetadata(sourceUrl);
      setMetadata(nextMetadata);
      setTone("info");
      setMessage("ArcGIS metadata loaded. Review the layer details, then import it into the map.");
    } catch (error) {
      setMetadata(null);
      setTone("warning");
      setMessage(error instanceof Error ? error.message : "ArcGIS metadata request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function importLayer() {
    setLoading(true);
    setMessage("");
    try {
      const result = await importArcGisLayer(sourceUrl);
      setMetadata(result.metadata);
      if (!result.importResult.ok) {
        setTone("warning");
        setMessage(result.importResult.error);
        return;
      }

      addLayer(result.importResult.layer);
      setTone(result.importResult.layer.warnings.length ? "warning" : "success");
      setMessage(
        result.importResult.layer.warnings.length
          ? `${result.importResult.layer.name} imported with warnings. Extent: ${describeArcGisLayerExtent(result.importResult.layer)}.`
          : `${result.importResult.layer.name} imported successfully. Extent: ${describeArcGisLayerExtent(result.importResult.layer)}.`,
      );
    } catch (error) {
      setTone("warning");
      setMessage(error instanceof Error ? error.message : "ArcGIS import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="result-details">
      <summary>Import from ArcGIS REST</summary>
      <div className="advanced-layer-list">
        <p className="muted">
          Paste a public ArcGIS FeatureServer or MapServer layer URL to preview metadata and import it as a GIS layer.
        </p>
        <label className="field-label" htmlFor="arcgis-layer-url">
          ArcGIS layer URL
          <input
            className="search-input"
            id="arcgis-layer-url"
            placeholder="https://.../FeatureServer/0"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </label>
        <div className="card-actions">
          <button className="secondary-button" disabled={loading || !sourceUrl.trim()} onClick={() => void previewLayer()} type="button">
            {loading ? "Loading..." : "Preview metadata"}
          </button>
          <button className="primary-button" disabled={loading || !sourceUrl.trim()} onClick={() => void importLayer()} type="button">
            {loading ? "Importing..." : "Import ArcGIS layer"}
          </button>
        </div>
        {message ? <InlineNotice tone={tone}>{message}</InlineNotice> : null}
        {metadata ? (
          <div className="result-card">
            <strong>{metadata.name}</strong>
            <p className="muted">{metadata.sourceUrl}</p>
            <dl className="summary-grid">
              <dt>Geometry</dt>
              <dd>{metadata.geometryType}</dd>
              <dt>Object ID</dt>
              <dd>{metadata.objectIdField || "Unknown"}</dd>
              <dt>Spatial ref</dt>
              <dd>{metadata.spatialReference}</dd>
            </dl>
          </div>
        ) : null}
      </div>
    </details>
  );
}
