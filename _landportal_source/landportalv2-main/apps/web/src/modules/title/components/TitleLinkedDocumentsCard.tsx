import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { TitleChainDocumentTile } from "@/modules/title/components/TitleChainDocumentTile";
import type { TitleChainTileViewModel } from "@/modules/title/titleChainTileModel";

type TitleLinkedDocumentsCardProps = {
  activeCommitment: boolean;
  linkedFiles: File[];
  linkedDocumentType: string;
  linkedRelationType: string;
  linkedSourceReference: string;
  linkedBriefDescription: string;
  activeChainTiles: TitleChainTileViewModel[];
  uploading: boolean;
  onLinkedDocumentTypeChange: (value: string) => void;
  onLinkedRelationTypeChange: (value: string) => void;
  onLinkedSourceReferenceChange: (value: string) => void;
  onLinkedBriefDescriptionChange: (value: string) => void;
  onLinkedFilesChange: (files: File[]) => void;
  onUpload: () => void;
  onOpenStored: (documentId: string) => void;
  onOpenOriginal: (url: string) => void;
  onCopyOriginal: (url: string) => void;
  onRetryFetch: (referenceId: string) => void;
  onUnlink: (linkId: string) => void;
  formGridClassName: string;
  uploadFieldClassName: string;
  actionsClassName: string;
  listClassName: string;
  mutedClassName: string;
};

export function TitleLinkedDocumentsCard(props: TitleLinkedDocumentsCardProps) {
  return (
    <>
      <strong>Linked title documents</strong>
      <p className={props.mutedClassName}>
        The uploaded title commitment can auto-create linked records from the chain-of-title links inside the PDF. You can still add or supplement records manually here.
      </p>
      <div className={props.formGridClassName}>
        <label className={props.uploadFieldClassName}>
          <span>Document type</span>
          <select onChange={(event) => props.onLinkedDocumentTypeChange(event.target.value)} value={props.linkedDocumentType}>
            <option value="deed">Deed</option>
            <option value="plat">Plat</option>
            <option value="survey">Survey</option>
            <option value="easement">Easement</option>
            <option value="record_of_survey">Record of survey</option>
            <option value="title_exception">Title exception</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className={props.uploadFieldClassName}>
          <span>Relationship</span>
          <select onChange={(event) => props.onLinkedRelationTypeChange(event.target.value)} value={props.linkedRelationType}>
            <option value="chain_of_title">Chain of title</option>
            <option value="supporting_record">Supporting record</option>
            <option value="exception_document">Exception document</option>
            <option value="exhibit">Exhibit</option>
          </select>
        </label>
      </div>
      <Field
        label="Source reference"
        onChange={(event) => props.onLinkedSourceReferenceChange(event.target.value)}
        placeholder="Example: Schedule B Item 7 or Book/Page reference"
        value={props.linkedSourceReference}
      />
      <TextAreaField
        label="Brief description"
        onChange={(event) => props.onLinkedBriefDescriptionChange(event.target.value)}
        placeholder="Brief note about what this uploaded record covers"
        rows={3}
        value={props.linkedBriefDescription}
      />
      <label className={props.uploadFieldClassName}>
        <span>Linked documents</span>
        <input
          accept=".pdf,image/*"
          multiple
          onChange={(event) => props.onLinkedFilesChange(Array.from(event.target.files ?? []))}
          type="file"
        />
      </label>
      <div className={props.actionsClassName}>
        <Button
          disabled={props.uploading || !props.activeCommitment || !props.linkedFiles.length}
          onClick={props.onUpload}
          variant="secondary"
        >
          {props.uploading ? "Uploading linked docs..." : "Upload linked documents"}
        </Button>
      </div>
      <div className={props.listClassName}>
        {props.activeChainTiles.length ? props.activeChainTiles.map((tile) => (
          <TitleChainDocumentTile
            displayReference={tile.displayReference}
            fetchStatus={tile.fetchStatus}
            fullReference={tile.fullReference}
            key={tile.id}
            matchConfidence={tile.matchConfidence}
            onCopyOriginal={tile.originalExternalReference ? props.onCopyOriginal : undefined}
            onOpenOriginal={tile.originalExternalReference ? props.onOpenOriginal : undefined}
            onOpenStored={tile.storedDocumentId ? props.onOpenStored : undefined}
            onRetryFetch={tile.referenceId ? () => props.onRetryFetch(tile.referenceId!) : undefined}
            onUnlink={tile.linkId ? () => props.onUnlink(tile.linkId!) : undefined}
            originalExternalReference={tile.originalExternalReference}
            originalSourceHost={tile.originalSourceHost}
            relationType={tile.relationType}
            sourcePageNumber={tile.sourcePageNumber}
            storedDocumentId={tile.storedDocumentId}
            title={tile.title}
          />
        )) : <span className={props.mutedClassName}>No linked chain documents are attached yet.</span>}
      </div>
    </>
  );
}
