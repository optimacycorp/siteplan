import { useEffect, useState } from "react";
import { useQuickSiteStore } from "../state/quickSiteStore";
import { useDrawingStore } from "../state/drawingStore";

type ProxyStatus = {
  ok: boolean;
  providerMode?: string;
};

const proxyBaseUrl =
  import.meta.env.VITE_PARCEL_PROXY_BASE_URL ??
  import.meta.env.VITE_REGRID_PROXY_BASE_URL ??
  "/regrid/";
const fixtureMode = String(import.meta.env.VITE_USE_PARCEL_FIXTURES || "").toLowerCase() === "true";

function resolveHealthUrl() {
  const base = proxyBaseUrl.endsWith("/") ? proxyBaseUrl : `${proxyBaseUrl}/`;
  const resolvedBase = /^https?:\/\//i.test(base)
    ? base
    : new URL(base.replace(/^\.\//, "").replace(/^\/?/, "/"), window.location.origin).toString();
  return new URL("health", resolvedBase).toString();
}

export function DevStatusPanel() {
  const selectedParcel = useQuickSiteStore((state) => state.selectedParcel);
  const searchError = useQuickSiteStore((state) => state.searchError);
  const drawingCount = useDrawingStore((state) => state.drawings.length);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);

  useEffect(() => {
    if (fixtureMode) {
      setProxyStatus({ ok: true, providerMode: "fixtures" });
      return;
    }

    let active = true;
    void fetch(resolveHealthUrl())
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Health check failed (${response.status})`))))
      .then((payload) => {
        if (!active) return;
        setProxyStatus(payload as ProxyStatus);
      })
      .catch(() => {
        if (!active) return;
        setProxyStatus({ ok: false });
      });

    return () => {
      active = false;
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <section className="panel-section dev-status-panel">
      <h2>Dev status</h2>
      <dl className="summary-grid">
        <dt>Fixture mode</dt>
        <dd>{fixtureMode ? "on" : "off"}</dd>
        <dt>Parcel proxy base</dt>
        <dd>{proxyBaseUrl}</dd>
        <dt>Proxy health</dt>
        <dd>{proxyStatus ? (proxyStatus.ok ? proxyStatus.providerMode || "ok" : "unreachable") : "checking..."}</dd>
        <dt>Selected APN</dt>
        <dd>{selectedParcel?.apn || selectedParcel?.llUuid || "-"}</dd>
        <dt>Drawings</dt>
        <dd>{drawingCount}</dd>
        <dt>Last error</dt>
        <dd>{searchError || "-"}</dd>
      </dl>
    </section>
  );
}
