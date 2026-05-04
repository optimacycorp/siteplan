import { useQuickSiteStore } from "../state/quickSiteStore";

export function ExportSheetPanel() {
  const exportMeta = useQuickSiteStore((state) => state.exportMeta);
  const setExportMeta = useQuickSiteStore((state) => state.setExportMeta);

  return (
    <section className="panel-section">
      <h2>Export sheet</h2>
      <p className="muted">
        These title block fields appear in the plat-style print export.
      </p>

      <label className="field-label" htmlFor="export-project-title">
        Project title
      </label>
      <input
        className="search-input"
        id="export-project-title"
        value={exportMeta.projectTitle}
        onChange={(event) => setExportMeta({ projectTitle: event.target.value })}
      />

      <label className="field-label" htmlFor="export-project-number">
        Project number
      </label>
      <input
        className="search-input"
        id="export-project-number"
        value={exportMeta.projectNumber}
        onChange={(event) => setExportMeta({ projectNumber: event.target.value })}
      />

      <label className="field-label" htmlFor="export-prepared-for">
        Prepared for
      </label>
      <input
        className="search-input"
        id="export-prepared-for"
        value={exportMeta.preparedFor}
        onChange={(event) => setExportMeta({ preparedFor: event.target.value })}
      />

      <label className="field-label" htmlFor="export-prepared-by">
        Prepared by
      </label>
      <input
        className="search-input"
        id="export-prepared-by"
        value={exportMeta.preparedBy}
        onChange={(event) => setExportMeta({ preparedBy: event.target.value })}
      />

      <label className="field-label" htmlFor="export-sheet-number">
        Sheet number
      </label>
      <input
        className="search-input"
        id="export-sheet-number"
        value={exportMeta.sheetNumber}
        onChange={(event) => setExportMeta({ sheetNumber: event.target.value })}
      />

      <label className="field-label" htmlFor="export-revision">
        Revision
      </label>
      <input
        className="search-input"
        id="export-revision"
        value={exportMeta.revision}
        onChange={(event) => setExportMeta({ revision: event.target.value })}
      />

      <label className="field-label" htmlFor="export-notes">
        Plat notes
      </label>
      <textarea
        className="search-input textarea-input"
        id="export-notes"
        rows={4}
        value={exportMeta.notes}
        onChange={(event) => setExportMeta({ notes: event.target.value })}
      />
    </section>
  );
}
