import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";

type TitleCommitmentUploadCardProps = {
  commitmentTitle: string;
  orderNumber: string;
  commitmentNumber: string;
  effectiveDate: string;
  issueDateLabel: string;
  propertyAddress: string;
  issuingCompany: string;
  fullPropertyDescription: string;
  commitmentNotes: string;
  commitmentFile: File | null;
  activeCommitmentExists: boolean;
  saving: boolean;
  onCommitmentTitleChange: (value: string) => void;
  onOrderNumberChange: (value: string) => void;
  onCommitmentNumberChange: (value: string) => void;
  onEffectiveDateChange: (value: string) => void;
  onIssueDateLabelChange: (value: string) => void;
  onPropertyAddressChange: (value: string) => void;
  onIssuingCompanyChange: (value: string) => void;
  onFullPropertyDescriptionChange: (value: string) => void;
  onCommitmentNotesChange: (value: string) => void;
  onCommitmentFileChange: (file: File | null) => void;
  onSave: () => void;
  formGridClassName: string;
  uploadFieldClassName: string;
  actionsClassName: string;
  mutedClassName: string;
};

export function TitleCommitmentUploadCard(props: TitleCommitmentUploadCardProps) {
  return (
    <>
      <strong>Primary title commitment upload</strong>
      <p className={props.mutedClassName}>
        Use this to anchor the project record stack. The attached Rampart example is the model here: one primary commitment, then linked deeds, plats, easements, surveys, and other chain documents beneath it.
      </p>
      <Field label="Commitment title" onChange={(event) => props.onCommitmentTitleChange(event.target.value)} value={props.commitmentTitle} />
      <div className={props.formGridClassName}>
        <Field label="Order number" onChange={(event) => props.onOrderNumberChange(event.target.value)} value={props.orderNumber} />
        <Field label="Schedule / account number" onChange={(event) => props.onCommitmentNumberChange(event.target.value)} value={props.commitmentNumber} />
        <Field label="Effective date" onChange={(event) => props.onEffectiveDateChange(event.target.value)} type="date" value={props.effectiveDate} />
      </div>
      <Field label="Date of issue text" onChange={(event) => props.onIssueDateLabelChange(event.target.value)} value={props.issueDateLabel} />
      <Field label="Property address" onChange={(event) => props.onPropertyAddressChange(event.target.value)} value={props.propertyAddress} />
      <Field label="Issuing company" onChange={(event) => props.onIssuingCompanyChange(event.target.value)} value={props.issuingCompany} />
      <TextAreaField
        label="Full property description"
        onChange={(event) => props.onFullPropertyDescriptionChange(event.target.value)}
        rows={5}
        value={props.fullPropertyDescription}
      />
      <TextAreaField label="Notes" onChange={(event) => props.onCommitmentNotesChange(event.target.value)} rows={4} value={props.commitmentNotes} />
      <label className={props.uploadFieldClassName}>
        <span>Primary commitment PDF</span>
        <input
          accept=".pdf,image/*"
          onChange={(event) => props.onCommitmentFileChange(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>
      <div className={props.actionsClassName}>
        <Button
          disabled={props.saving || !props.commitmentFile}
          onClick={props.onSave}
        >
          {props.saving
            ? "Saving commitment..."
            : props.activeCommitmentExists
              ? "Replace title commitment"
              : "Save title commitment"}
        </Button>
      </div>
    </>
  );
}
