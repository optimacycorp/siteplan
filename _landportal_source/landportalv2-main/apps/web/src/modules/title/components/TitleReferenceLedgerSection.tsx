import type { TitleCommitmentReferenceRecord } from "@landportal/api-client";

import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { TitleReferenceLedgerCard } from "@/modules/title/components/TitleReferenceLedgerCard";

type TitleReferenceLedgerSectionProps = {
  activeCommitment: boolean;
  activeReferences: TitleCommitmentReferenceRecord[];
  createPending: boolean;
  updatePending: boolean;
  deletePending: boolean;
  editingReferenceId: string | null;
  referenceText: string;
  referenceDocumentType: string;
  referenceBriefDescription: string;
  referenceScheduleSection: string;
  onReferenceDocumentTypeChange: (value: string) => void;
  onReferenceTextChange: (value: string) => void;
  onReferenceBriefDescriptionChange: (value: string) => void;
  onReferenceScheduleSectionChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onEdit: (referenceId: string) => void;
  onDelete: (referenceId: string) => void;
  onOpenStored: (documentId: string) => void;
  formGridClassName: string;
  uploadFieldClassName: string;
  actionsClassName: string;
  listClassName: string;
  mutedClassName: string;
};

export function TitleReferenceLedgerSection(props: TitleReferenceLedgerSectionProps) {
  return (
    <>
      <strong>Commitment reference ledger</strong>
      <p className={props.mutedClassName}>
        Add each linked record mentioned in the title commitment. The app will compare this expected list against uploaded linked documents and show which references have actually been visited and stored.
      </p>
      <div className={props.formGridClassName}>
        <label className={props.uploadFieldClassName}>
          <span>Expected type</span>
          <select onChange={(event) => props.onReferenceDocumentTypeChange(event.target.value)} value={props.referenceDocumentType}>
            <option value="deed">Deed</option>
            <option value="plat">Plat</option>
            <option value="survey">Survey</option>
            <option value="easement">Easement</option>
            <option value="record_of_survey">Record of survey</option>
            <option value="title_exception">Title exception</option>
            <option value="other">Other</option>
          </select>
        </label>
        <Field label="Schedule / section" onChange={(event) => props.onReferenceScheduleSectionChange(event.target.value)} value={props.referenceScheduleSection} />
      </div>
      <Field
        label="Reference text"
        onChange={(event) => props.onReferenceTextChange(event.target.value)}
        placeholder="Example: Reception No. 123456789 or Schedule B Item 7"
        value={props.referenceText}
      />
      <TextAreaField
        label="Brief description"
        onChange={(event) => props.onReferenceBriefDescriptionChange(event.target.value)}
        rows={3}
        value={props.referenceBriefDescription}
      />
      <div className={props.actionsClassName}>
        <Button
          disabled={props.createPending || !props.activeCommitment || !props.referenceText.trim()}
          onClick={props.onSave}
          variant="secondary"
        >
          {props.createPending || props.updatePending
            ? "Saving reference..."
            : props.editingReferenceId
              ? "Save reference changes"
              : "Add expected reference"}
        </Button>
        {props.editingReferenceId ? (
          <Button onClick={props.onCancelEdit} variant="ghost">
            Cancel edit
          </Button>
        ) : null}
      </div>
      <div className={props.listClassName}>
        {props.activeReferences.length ? props.activeReferences.map((reference) => (
          <TitleReferenceLedgerCard
            deletePending={props.deletePending}
            key={reference.id}
            onDelete={props.onDelete}
            onEdit={props.onEdit}
            onOpenStored={props.onOpenStored}
            reference={reference}
          />
        )) : <span className={props.mutedClassName}>No expected title references have been recorded yet.</span>}
      </div>
    </>
  );
}
