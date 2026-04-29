import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { buildTitleIntakeSummary } from "@landportal/core-documents";
import {
  buildSurveyCopilotSummary,
  buildSurveyReviewSummary,
  exportReconstructedPointsCsv,
  generateDraftLegalDescription,
  parseDescriptionCalls,
  reconstructDescriptionBoundary,
  renderSurveyReviewSummary,
  reviewDescriptionReconstruction,
} from "@landportal/core-survey";

import { ProjectReadinessTray } from "@/components/layout/ProjectReadinessTray";
import { ProjectWorkspaceShell } from "@/components/layout/ProjectWorkspaceShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { useProjects } from "@/modules/projects/useProjects";
import { useProjectDevelopment } from "@/modules/projects/useProjectDevelopment";
import { useProjectSurvey } from "@/modules/projects/useProjectSurvey";
import { useProjectParcelSelection } from "@/modules/parcel/useProjectParcelSelection";
import {
  useCreateProjectDocument,
  useCreateTitleCommitmentReference,
  useDeleteTitleCommitmentCascade,
  useDeleteTitleCommitmentReference,
  useImportTitleCommitment,
  useLinkTitleDocument,
  useMarkTitleCommitmentReferenceVisited,
  useRetryTitleReferenceFetch,
  useSetPrimaryTitleCommitment,
  useTitleCommitmentImportStatus,
  useTitleWorkspace,
  useUnlinkTitleDocument,
  useUpdateTitleCommitmentReference,
} from "@/modules/title/useTitleCommitments";
import { TitleCommitmentFocusCard } from "@/modules/title/components/TitleCommitmentFocusCard";
import { TitleCommitmentUploadCard } from "@/modules/title/components/TitleCommitmentUploadCard";
import { TitleDescriptionReconstructionSection } from "@/modules/title/components/TitleDescriptionReconstructionSection";
import { TitleDocumentsCard } from "@/modules/title/components/TitleDocumentsCard";
import { TitleDraftLegalDescriptionCard } from "@/modules/title/components/TitleDraftLegalDescriptionCard";
import { TitleMissingReferencesCard } from "@/modules/title/components/TitleMissingReferencesCard";
import { TitleReconstructedPointsCard } from "@/modules/title/components/TitleReconstructedPointsCard";
import { TitleReconstructionReviewCard } from "@/modules/title/components/TitleReconstructionReviewCard";
import { TitleReferenceLedgerSection } from "@/modules/title/components/TitleReferenceLedgerSection";
import { TitleCommitmentStackCard } from "@/modules/title/components/TitleCommitmentStackCard";
import { TitleDocumentPreviewCard } from "@/modules/title/components/TitleDocumentPreviewCard";
import { TitleLinkedDocumentsCard } from "@/modules/title/components/TitleLinkedDocumentsCard";
import { TitleSprintContextCard } from "@/modules/title/components/TitleSprintContextCard";
import { TitleSupportingRecordStackCard } from "@/modules/title/components/TitleSupportingRecordStackCard";
import { TitleSurveyCopilotCard } from "@/modules/title/components/TitleSurveyCopilotCard";
import { TitleSurveyAuditTrailCard } from "@/modules/title/components/TitleSurveyAuditTrailCard";
import { TitleSurveySettingsCard } from "@/modules/title/components/TitleSurveySettingsCard";
import { TitleVisitedDocumentRegister } from "@/modules/title/components/TitleVisitedDocumentRegister";
import { buildActiveChainTiles } from "@/modules/title/titleChainTileModel";
import {
  buildCommitmentDisplayTitle,
  buildCommitmentStackItems,
  getCommitmentEffectiveDate,
  getCommitmentImportStatusLabel,
  getCommitmentIssueDate,
  getCommitmentIssuingCompany,
  getCommitmentOrderNumber,
  getCommitmentPropertyAddress,
  getCommitmentPropertyDescription,
  getCommitmentScheduleNumber,
} from "@/modules/title/titleCommitmentViewModel";
import { buildTitleWorkspaceDocumentCollections } from "@/modules/title/titleWorkspaceModel";
import { useTitleDocumentPreview } from "@/modules/title/useTitleDocumentPreview";
import { useTitleWorkspaceActions } from "./useTitleWorkspaceActions";
import styles from "./ProjectTitlePage.module.css";

export function ProjectTitlePage() {
  const { projectId = "" } = useParams();
  const { data: projects = [] } = useProjects();
  const { data: development, error, isLoading } = useProjectDevelopment(projectId);
  const { data: titleWorkspace, error: titleWorkspaceError, isLoading: titleWorkspaceLoading } = useTitleWorkspace(projectId);
  const { data: parcelSelection } = useProjectParcelSelection(projectId);
  const surveyState = useProjectSurvey(projectId);
  const project = projects.find((entry) => entry.id === projectId);
  const [descriptionText, setDescriptionText] = useState(DEFAULT_DESCRIPTION_TEXT);
  const [commitmentTitle, setCommitmentTitle] = useState("Title Commitment");
  const [orderNumber, setOrderNumber] = useState("");
  const [commitmentNumber, setCommitmentNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [issuingCompany, setIssuingCompany] = useState("");
  const [commitmentNotes, setCommitmentNotes] = useState("");
  const [fullPropertyDescription, setFullPropertyDescription] = useState("");
  const [issueDateLabel, setIssueDateLabel] = useState("");
  const [commitmentFile, setCommitmentFile] = useState<File | null>(null);
  const [linkedFiles, setLinkedFiles] = useState<File[]>([]);
  const [linkedDocumentType, setLinkedDocumentType] = useState("deed");
  const [linkedRelationType, setLinkedRelationType] = useState("chain_of_title");
  const [linkedSourceReference, setLinkedSourceReference] = useState("");
  const [linkedBriefDescription, setLinkedBriefDescription] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [referenceDocumentType, setReferenceDocumentType] = useState("deed");
  const [referenceBriefDescription, setReferenceBriefDescription] = useState("");
  const [referenceScheduleSection, setReferenceScheduleSection] = useState("");
  const [selectedCommitmentId, setSelectedCommitmentId] = useState("");
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const createDocument = useCreateProjectDocument(projectId);
  const importCommitment = useImportTitleCommitment(projectId);
  const deleteCommitment = useDeleteTitleCommitmentCascade(projectId);
  const createReference = useCreateTitleCommitmentReference(projectId);
  const setPrimaryCommitment = useSetPrimaryTitleCommitment(projectId);
  const updateReference = useUpdateTitleCommitmentReference(projectId);
  const deleteReference = useDeleteTitleCommitmentReference(projectId);
  const linkDocument = useLinkTitleDocument(projectId);
  const markReferenceVisited = useMarkTitleCommitmentReferenceVisited(projectId);
  const unlinkTitleDocument = useUnlinkTitleDocument(projectId);
  const retryTitleReferenceFetch = useRetryTitleReferenceFetch(projectId);
  const projectDevelopment = development ?? {
    parcels: [],
    scenarios: [],
    documents: [],
    layouts: [],
  };

  const commitments = titleWorkspace?.commitments ?? [];
  const orderedCommitments = [...commitments].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
  const linkedDocumentLinks = titleWorkspace?.linkedDocuments ?? [];
  const uploadedDocuments = titleWorkspace?.documents ?? [];
  const commitmentReferences = titleWorkspace?.references ?? [];
  const importJobs = titleWorkspace?.importJobs ?? [];
  const activeCommitment =
    orderedCommitments.find((entry) => entry.id === selectedCommitmentId)
    ?? orderedCommitments.find((entry) => entry.isPrimary)
    ?? orderedCommitments[0]
    ?? null;
  const activeCommitmentDocuments = activeCommitment
    ? linkedDocumentLinks
        .filter((entry) => entry.titleCommitmentId === activeCommitment.id)
        .map((entry) => ({
          ...entry,
          document: uploadedDocuments.find((document) => document.id === entry.projectDocumentId) ?? null,
        }))
    : [];
  const activeReferences = activeCommitment
    ? commitmentReferences.filter((entry) => entry.titleCommitmentId === activeCommitment.id)
    : [];
  const visitedReferences = activeReferences.filter((entry) => entry.visitStatus === "visited" || Boolean(entry.visitedProjectDocumentId));
  const missingReferences = activeReferences.filter((entry) => !entry.visitedProjectDocumentId);
  const failedReferences = activeReferences.filter((entry) => entry.fetchStatus === "failed" || entry.fetchStatus === "manual_review");
  const visitedDocuments = visitedReferences.map((reference) => ({
    reference,
    document: uploadedDocuments.find((document) => document.id === reference.visitedProjectDocumentId) ?? null,
  }));
  const activeImportJob = activeCommitment
    ? importJobs.find((entry) => entry.titleCommitmentId === activeCommitment.id) ?? null
    : null;
  const { data: importStatusData } = useTitleCommitmentImportStatus(projectId, activeCommitment?.id ?? null);
  const activeImportStatus = importStatusData?.importJob ?? activeImportJob;
  const {
    previewDocument,
    previewDocumentId,
    previewUrl,
    previewError,
    previewLoading,
    previewModalOpen,
    setPreviewDocumentId,
    openStoredDocument,
    openPreviewModal,
    closePreviewModal,
  } = useTitleDocumentPreview(uploadedDocuments);
  const completenessPercent = activeReferences.length
    ? Math.round((visitedReferences.length / activeReferences.length) * 100)
    : 0;
  const commitmentDisplayTitle = activeCommitment
    ? buildCommitmentDisplayTitle(activeCommitment)
    : "No title commitment uploaded yet";
  const activeChainTiles = useMemo(
    () => buildActiveChainTiles({
      activeCommitment,
      linkedDocumentLinks,
      uploadedDocuments,
      activeReferences,
    }),
    [activeCommitment, linkedDocumentLinks, uploadedDocuments, activeReferences],
  );
  const commitmentStackItems = useMemo(
    () => buildCommitmentStackItems({
      commitments: orderedCommitments,
      linkedDocumentLinks,
      uploadedDocuments,
      commitmentReferences,
    }),
    [orderedCommitments, linkedDocumentLinks, uploadedDocuments, commitmentReferences],
  );

  useEffect(() => {
    if (!activeCommitment && selectedCommitmentId) {
      setSelectedCommitmentId("");
    }
  }, [activeCommitment, selectedCommitmentId]);

  useEffect(() => {
    if (!activeCommitment) return;
    setCommitmentTitle(buildCommitmentDisplayTitle(activeCommitment));
    setOrderNumber(getCommitmentOrderNumber(activeCommitment));
    setCommitmentNumber(getCommitmentScheduleNumber(activeCommitment));
    setEffectiveDate(getCommitmentEffectiveDate(activeCommitment));
    setIssueDateLabel(getCommitmentIssueDate(activeCommitment));
    setPropertyAddress(getCommitmentPropertyAddress(activeCommitment));
    setIssuingCompany(getCommitmentIssuingCompany(activeCommitment));
    setCommitmentNotes(activeCommitment.notes || "");
    setFullPropertyDescription(getCommitmentPropertyDescription(activeCommitment));
  }, [activeCommitment]);

  const summary = buildTitleIntakeSummary(uploadedDocuments.map((document) => ({
    id: document.id,
    title: document.title,
    type: document.documentType,
    status: document.status,
  })));

  const { titleDocuments, supportingDocuments } = useMemo(
    () => buildTitleWorkspaceDocumentCollections({
      uploadedDocuments,
      linkedDocumentLinks,
    }),
    [uploadedDocuments, linkedDocumentLinks],
  );
  const blockers = [
    !parcelSelection ? "No active parcel anchor is attached yet. Start in Property and import the parcel first." : null,
    !summary.primaryTitleCommitmentId && !activeCommitment ? "No primary title commitment is identified yet." : null,
    !uploadedDocuments.length ? "No document stack exists for this project yet." : null,
  ].filter(Boolean) as string[];
  const parsedCalls = useMemo(() => parseDescriptionCalls(descriptionText), [descriptionText]);
  const enteredLineCount = descriptionText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  const ignoredLineCount = Math.max(0, enteredLineCount - parsedCalls.length);
  const reconstruction = useMemo(() => reconstructDescriptionBoundary(parsedCalls), [parsedCalls]);
  const reviewIssues = useMemo(
    () => reviewDescriptionReconstruction(reconstruction, ignoredLineCount),
    [ignoredLineCount, reconstruction],
  );
  const draftLegalDescription = useMemo(
    () => generateDraftLegalDescription(project?.name ?? "Survey parcel", reconstruction.points),
    [project?.name, reconstruction.points],
  );
  const copilot = useMemo(
    () => buildSurveyCopilotSummary({
      titleSummary: summary,
      reconstruction,
      issues: reviewIssues,
      ignoredLineCount,
    }),
    [ignoredLineCount, reconstruction, reviewIssues, summary],
  );
  const reviewSummary = useMemo(
    () => buildSurveyReviewSummary(project?.name ?? "Survey parcel", reconstruction, reviewIssues),
    [project?.name, reconstruction, reviewIssues],
  );
  const reviewSummaryText = useMemo(() => renderSurveyReviewSummary(reviewSummary), [reviewSummary]);
  const reconstructedCsv = useMemo(() => exportReconstructedPointsCsv(reconstruction), [reconstruction]);
  const warnings = [
    summary.reviewNeededCount ? `${summary.reviewNeededCount} document${summary.reviewNeededCount === 1 ? "" : "s"} still need review.` : null,
    !supportingDocuments.length ? "No supporting survey, plat, or deed records are linked yet." : null,
    !activeChainTiles.length ? "No linked chain documents are attached to the active title commitment yet." : null,
    activeReferences.length && missingReferences.length ? `${missingReferences.length} referenced document${missingReferences.length === 1 ? "" : "s"} are still missing from the uploaded stack.` : null,
    failedReferences.length ? `${failedReferences.length} linked reference${failedReferences.length === 1 ? "" : "s"} need manual review or retry.` : null,
    ignoredLineCount ? `${ignoredLineCount} pasted line${ignoredLineCount === 1 ? "" : "s"} could not be parsed into survey calls.` : null,
    !reconstruction.closure.withinTolerance && parsedCalls.length ? "Reconstructed calls do not close within the default tolerance." : null,
  ].filter(Boolean) as string[];
  const checks = [
    ...summary.nextActions,
    parsedCalls.length ? `${parsedCalls.length} legal call${parsedCalls.length === 1 ? "" : "s"} parsed into a draft traverse.` : "Paste legal calls to begin reconstruction.",
  ];
  const tone = blockers.length ? "blocked" : warnings.length ? "attention" : "ready";

  const {
    handleCommitmentUpload,
    handleCommitmentFileChange,
    handleLinkedDocumentsUpload,
    handleCreateReference,
    handleEditReference,
    handleDeleteReference,
    handleSetPrimaryCommitment,
    handleDeleteCommitment,
    handleRetryReferenceFetch,
    handleUnlinkLinkedDocument,
    handleOpenOriginalSource,
    handleCopyOriginalSource,
  } = useTitleWorkspaceActions({
    projectId,
    activeCommitment,
    activeCommitmentDocuments,
    activeReferences,
    linkedDocumentLinks,
    uploadedDocuments,
    commitmentReferences,
    projectDevelopment,
    parcelSelection,
    previewDocumentId,
    setPreviewDocumentId,
    closePreviewModal,
    setCommitmentFile,
    setCommitmentTitle,
    setOrderNumber,
    setCommitmentNumber,
    setEffectiveDate,
    setIssueDateLabel,
    setPropertyAddress,
    setIssuingCompany,
    setCommitmentNotes,
    setFullPropertyDescription,
    setSelectedCommitmentId,
    setLinkedFiles,
    setLinkedSourceReference,
    setLinkedBriefDescription,
    setEditingReferenceId,
    setReferenceDocumentType,
    setReferenceText,
    setReferenceBriefDescription,
    setReferenceScheduleSection,
    commitmentFile,
    commitmentTitle,
    orderNumber,
    commitmentNumber,
    effectiveDate,
    issueDateLabel,
    propertyAddress,
    issuingCompany,
    fullPropertyDescription,
    commitmentNotes,
    linkedFiles,
    linkedDocumentType,
    linkedRelationType,
    linkedSourceReference,
    linkedBriefDescription,
    referenceText,
    referenceDocumentType,
    referenceBriefDescription,
    referenceScheduleSection,
    editingReferenceId,
    createDocument,
    importCommitment,
    deleteCommitment,
    createReference,
    setPrimaryCommitment,
    updateReference,
    deleteReference,
    linkDocument,
    markReferenceVisited,
    unlinkTitleDocument,
    retryTitleReferenceFetch,
  });

  if (isLoading || titleWorkspaceLoading) return <LoadingState message="Loading title intake..." />;
  if (error || titleWorkspaceError || !development) {
    return <div className={styles.page}><div className={styles.card}>Unable to load title intake. {error?.message ?? titleWorkspaceError?.message}</div></div>;
  }

  function downloadFile(filename: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <ProjectWorkspaceShell
      currentStep="parcel"
      description={<p>Start from the record stack, not just geometry. This workspace organizes the title commitment and supporting documents that should anchor survey reconstruction and legal-description review.</p>}
      eyebrow="Title intake"
      headerActions={
        <>
          <Link to={`/app/projects/${projectId}/documents`}><Button variant="secondary">Open documents</Button></Link>
          <Link to={`/app/projects/${projectId}/design`}><Button variant="ghost">Open design console</Button></Link>
          <Link to={`/app/projects/${projectId}/workflow`}><Button>Back to workflow</Button></Link>
        </>
      }
      layoutReady={Boolean(development.layouts.length)}
      parcelReady={Boolean(projectDevelopment.parcels.some((entry) => Boolean(entry.intelligence)))}
      projectId={projectId}
      scenarioReady={Boolean(projectDevelopment.scenarios.length)}
      title={project?.name ?? "Title intake"}
      bottomTray={
        <ProjectReadinessTray
          actions={
            <>
              <Link to={`/app/projects/${projectId}/documents`}><Button variant="secondary">Review document stack</Button></Link>
              <Link to={`/app/projects/${projectId}/parcel`}><Button variant="ghost">Go to parcel analysis</Button></Link>
            </>
          }
          blockers={blockers}
          checks={checks}
          summary="Title intake should establish the legal record package first, then hand a trustworthy source stack into survey reconstruction and parcel analysis."
          title="Title readiness"
          tone={tone}
          warnings={warnings}
        />
      }
    >
      <section className={styles.layout}>
        <div className={styles.column}>
          <div className={styles.card}>
            <strong>Parcel anchor</strong>
            <div className={styles.kv}><span>Active parcel</span><span>{parcelSelection?.parcelName || "Not attached"}</span></div>
            <div className={styles.kv}><span>Provider</span><span>{parcelSelection?.parcelProvider ?? "Not attached"}</span></div>
            <div className={styles.kv}><span>Provider parcel ID</span><span>{parcelSelection?.providerParcelId ?? "N/A"}</span></div>
            <div className={styles.kv}><span>Address</span><span>{parcelSelection?.address || "N/A"}</span></div>
            <div className={styles.kv}><span>Geometry source</span><span>{parcelSelection?.geometrySource?.replaceAll("_", " ") ?? "N/A"}</span></div>
            <div className={styles.kv}><span>Anchor status</span><span>{parcelSelection?.anchorStatus ?? "Missing"}</span></div>
            <div className={styles.kv}><span>Linked snapshot</span><span>{parcelSelection?.parcelSnapshotId ?? "Not linked"}</span></div>
            <div className={styles.kv}><span>Last refresh</span><span>{parcelSelection?.sourceLastRefreshedAt ? new Date(parcelSelection.sourceLastRefreshedAt).toLocaleString() : "N/A"}</span></div>
            <p className={styles.muted}>
              Title completeness now keys off the active parcel anchor first. If this parcel is missing or wrong, fix it in Property before reviewing commitment coverage.
            </p>
          </div>

          <div className={styles.card}>
            <strong>Commitment stack</strong>
            <p className={styles.muted}>
              This workflow expects one uploaded title commitment for the project. If older or mistaken records exist below, delete them so the parcel is anchored to a single active commitment.
            </p>
            <div className={styles.list}>
              {commitmentStackItems.length ? commitmentStackItems.map((item) => (
                <TitleCommitmentStackCard
                  deleteActionPending={deleteCommitment.isPending}
                  isActive={activeCommitment?.id === item.commitment.id}
                  item={item}
                  key={item.commitment.id}
                  onCopyOriginal={handleCopyOriginalSource}
                  onDelete={(commitmentId) => { void handleDeleteCommitment(commitmentId); }}
                  onOpenCommitment={(documentId) => { void openStoredDocument(documentId); }}
                  onOpenOriginal={handleOpenOriginalSource}
                  onOpenStored={(documentId) => { void openStoredDocument(documentId); }}
                  onRetryFetch={(referenceId) => { void handleRetryReferenceFetch(referenceId); }}
                  onReview={setSelectedCommitmentId}
                  onSetPrimary={(commitmentId) => { void handleSetPrimaryCommitment(commitmentId); }}
                  primaryActionPending={setPrimaryCommitment.isPending}
                  truncateText={truncateText}
                />
              )) : <span className={styles.muted}>No title commitments saved yet.</span>}
            </div>
          </div>

          <div className={styles.card}>
            <TitleCommitmentFocusCard
              activeChainTiles={activeChainTiles}
              childFetchSummary={`${activeCommitment?.childLinkCount ?? 0} found / ${activeCommitment?.childFetchSuccessCount ?? 0} stored / ${activeCommitment?.childFetchFailureCount ?? 0} review`}
              commitmentDisplayTitle={commitmentDisplayTitle ?? summary.primaryTitleCommitmentTitle ?? "Not set"}
              completenessPercent={completenessPercent}
              expectedReferencesCount={activeReferences.length}
              importStatusLabel={activeCommitment ? getCommitmentImportStatusLabel(activeCommitment) : "Not started"}
              issueDate={issueDateLabel || effectiveDate}
              issuingCompany={issuingCompany}
              latestImportJobStatus={activeImportStatus?.status ?? null}
              missingReferencesCount={missingReferences.length}
              onCopyOriginal={handleCopyOriginalSource}
              onOpenCommitment={activeCommitment?.primaryDocumentId ? (documentId) => { void openStoredDocument(documentId); } : undefined}
              onOpenOriginal={handleOpenOriginalSource}
              onOpenStored={(documentId) => { void openStoredDocument(documentId); }}
              onRetryFetch={(referenceId) => { void handleRetryReferenceFetch(referenceId); }}
              orderNumber={orderNumber}
              primaryDocumentId={activeCommitment?.primaryDocumentId ?? null}
              propertyAddress={propertyAddress}
              propertyDescription={fullPropertyDescription}
              reviewNeededCount={summary.reviewNeededCount}
              scheduleNumber={commitmentNumber}
              supportingDocumentCount={summary.supportingDocumentCount}
              titleDocumentCount={summary.titleDocumentCount}
              truncateText={truncateText}
              visitedReferencesCount={visitedReferences.length}
            />
          </div>

          <div className={styles.card}>
            <TitleCommitmentUploadCard
              actionsClassName={styles.actions}
              activeCommitmentExists={Boolean(activeCommitment)}
              commitmentFile={commitmentFile}
              commitmentNotes={commitmentNotes}
              commitmentNumber={commitmentNumber}
              commitmentTitle={commitmentTitle}
              effectiveDate={effectiveDate}
              formGridClassName={styles.formGrid}
              fullPropertyDescription={fullPropertyDescription}
              issueDateLabel={issueDateLabel}
              issuingCompany={issuingCompany}
              mutedClassName={styles.muted}
              onCommitmentFileChange={(file) => { void handleCommitmentFileChange(file); }}
              onCommitmentNotesChange={setCommitmentNotes}
              onCommitmentNumberChange={setCommitmentNumber}
              onCommitmentTitleChange={setCommitmentTitle}
              onEffectiveDateChange={setEffectiveDate}
              onFullPropertyDescriptionChange={setFullPropertyDescription}
              onIssueDateLabelChange={setIssueDateLabel}
              onIssuingCompanyChange={setIssuingCompany}
              onOrderNumberChange={setOrderNumber}
              onPropertyAddressChange={setPropertyAddress}
              onSave={() => { void handleCommitmentUpload(); }}
              orderNumber={orderNumber}
              propertyAddress={propertyAddress}
              saving={createDocument.isPending || importCommitment.isPending}
              uploadFieldClassName={styles.uploadField}
            />
          </div>

          <div className={styles.card}>
            <TitleReferenceLedgerSection
              actionsClassName={styles.actions}
              activeCommitment={Boolean(activeCommitment)}
              activeReferences={activeReferences}
              createPending={createReference.isPending}
              deletePending={deleteReference.isPending}
              editingReferenceId={editingReferenceId}
              formGridClassName={styles.formGrid}
              listClassName={styles.list}
              mutedClassName={styles.muted}
              onCancelEdit={() => {
                setEditingReferenceId(null);
                setReferenceText("");
                setReferenceBriefDescription("");
                setReferenceScheduleSection("");
              }}
              onDelete={(referenceId) => { void handleDeleteReference(referenceId); }}
              onEdit={handleEditReference}
              onOpenStored={(documentId) => { void openStoredDocument(documentId); }}
              onReferenceBriefDescriptionChange={setReferenceBriefDescription}
              onReferenceDocumentTypeChange={setReferenceDocumentType}
              onReferenceScheduleSectionChange={setReferenceScheduleSection}
              onReferenceTextChange={setReferenceText}
              onSave={() => { void handleCreateReference(); }}
              referenceBriefDescription={referenceBriefDescription}
              referenceDocumentType={referenceDocumentType}
              referenceScheduleSection={referenceScheduleSection}
              referenceText={referenceText}
              updatePending={updateReference.isPending}
              uploadFieldClassName={styles.uploadField}
            />
          </div>

          <div className={styles.card}>
            <TitleLinkedDocumentsCard
              actionsClassName={styles.actions}
              activeChainTiles={activeChainTiles}
              activeCommitment={Boolean(activeCommitment)}
              formGridClassName={styles.formGrid}
              linkedBriefDescription={linkedBriefDescription}
              linkedDocumentType={linkedDocumentType}
              linkedFiles={linkedFiles}
              linkedRelationType={linkedRelationType}
              linkedSourceReference={linkedSourceReference}
              listClassName={styles.list}
              mutedClassName={styles.muted}
              onCopyOriginal={handleCopyOriginalSource}
              onLinkedBriefDescriptionChange={setLinkedBriefDescription}
              onLinkedDocumentTypeChange={setLinkedDocumentType}
              onLinkedFilesChange={setLinkedFiles}
              onLinkedRelationTypeChange={setLinkedRelationType}
              onLinkedSourceReferenceChange={setLinkedSourceReference}
              onOpenOriginal={handleOpenOriginalSource}
              onOpenStored={(documentId) => { void openStoredDocument(documentId); }}
              onRetryFetch={(referenceId) => { void handleRetryReferenceFetch(referenceId); }}
              onUnlink={(linkId) => { void handleUnlinkLinkedDocument(linkId); }}
              onUpload={() => { void handleLinkedDocumentsUpload(); }}
              uploadFieldClassName={styles.uploadField}
              uploading={createDocument.isPending || linkDocument.isPending}
            />
          </div>

          <div className={styles.card}>
            <TitleSurveyCopilotCard
              confidenceLabel={copilot.confidenceLabel}
              docCardClassName={styles.docCard}
              headline={copilot.headline}
              kvClassName={styles.kv}
              listClassName={styles.list}
              mutedClassName={styles.muted}
              nextActions={copilot.nextActions}
              status={copilot.status}
              summary={copilot.summary}
            />
          </div>

          <div className={styles.card}>
            <TitleSurveySettingsCard
              actionsClassName={styles.actions}
              kvClassName={styles.kv}
              measurementUnit={surveyState.measurementUnit}
              onSetMeasurementUnit={surveyState.setMeasurementUnit}
              onSetReferenceSystem={surveyState.setReferenceSystem}
              referenceSystem={surveyState.referenceSystem}
            />
          </div>

          <div className={styles.card}>
            <TitleDocumentsCard
              docCardClassName={styles.docCard}
              kvClassName={styles.kv}
              listClassName={styles.list}
              mutedClassName={styles.muted}
              titleDocuments={titleDocuments}
            />
          </div>

          <div className={styles.card}>
            <TitleDescriptionReconstructionSection
              actionsClassName={styles.actions}
              descriptionText={descriptionText}
              draftLegalDescription={draftLegalDescription}
              ignoredLineCount={ignoredLineCount}
              kvClassName={styles.kv}
              mutedClassName={styles.muted}
              onCopyLegalDescription={() => { void navigator.clipboard?.writeText(draftLegalDescription); }}
              onDescriptionTextChange={setDescriptionText}
              onDownloadLegalDescription={() => downloadFile("draft-legal-description.txt", draftLegalDescription, "text/plain")}
              onPromoteParcel={() => surveyState.promoteDescriptionParcel(`title-${projectId || "parcel"}`, reconstruction)}
              onSaveReview={() => surveyState.recordDescriptionReview("title-description", reconstruction, ignoredLineCount)}
              parsedCallsCount={parsedCalls.length}
              reconstruction={reconstruction}
            />
          </div>
        </div>

        <aside className={styles.column}>
          <div className={styles.card}>
            <TitleDocumentPreviewCard
              onClosePreviewModal={closePreviewModal}
              onOpenPreviewModal={openPreviewModal}
              previewDocument={previewDocument}
              previewError={previewError}
              previewLoading={previewLoading}
              previewModalOpen={previewModalOpen}
              previewUrl={previewUrl}
            />
          </div>

          <div className={styles.card}>
            <TitleVisitedDocumentRegister
              missingReferencesCount={missingReferences.length}
              onOpenStored={(documentId) => { void openStoredDocument(documentId); }}
              visitedDocuments={visitedDocuments}
            />
          </div>

          <div className={styles.card}>
            <TitleMissingReferencesCard
              docCardClassName={styles.docCard}
              kvClassName={styles.kv}
              listClassName={styles.list}
              missingReferences={missingReferences}
              mutedClassName={styles.muted}
            />
          </div>

          <div className={styles.card}>
            <TitleSupportingRecordStackCard
              docCardClassName={styles.docCard}
              kvClassName={styles.kv}
              listClassName={styles.list}
              mutedClassName={styles.muted}
              supportingDocuments={supportingDocuments}
            />
          </div>

          <div className={styles.card}>
            <TitleSprintContextCard mutedClassName={styles.muted} />
          </div>

          <div className={styles.card}>
            <TitleReconstructionReviewCard
              actionsClassName={styles.actions}
              docCardClassName={styles.docCard}
              listClassName={styles.list}
              mutedClassName={styles.muted}
              onDownloadSummary={() => downloadFile("survey-review-summary.txt", reviewSummaryText, "text/plain")}
              onExportPoints={() => downloadFile("reconstructed-points.csv", reconstructedCsv, "text/csv")}
              reviewIssues={reviewIssues}
            />
          </div>

          <div className={styles.card}>
            <TitleSurveyAuditTrailCard
              auditTrail={surveyState.auditTrail}
              docCardClassName={styles.docCard}
              kvClassName={styles.kv}
              listClassName={styles.list}
              mutedClassName={styles.muted}
            />
          </div>

          <div className={styles.card}>
            <TitleReconstructedPointsCard
              docCardClassName={styles.docCard}
              kvClassName={styles.kv}
              listClassName={styles.list}
              points={reconstruction.points}
            />
          </div>

          <div className={styles.card}>
            <TitleDraftLegalDescriptionCard
              draftLegalDescription={draftLegalDescription}
              preClassName={styles.pre}
            />
          </div>
        </aside>
      </section>
    </ProjectWorkspaceShell>
  );
}

function truncateText(value: string, limit: number) {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}...`;
}

const DEFAULT_DESCRIPTION_TEXT = [
  "Thence N 90 deg 00'00\" E 100.00 feet",
  "Thence N 00 deg 00'00\" E 80.00 feet",
  "Thence S 90 deg 00'00\" W 100.00 feet",
  "Thence S 00 deg 00'00\" W 80.00 feet",
].join("\n");
