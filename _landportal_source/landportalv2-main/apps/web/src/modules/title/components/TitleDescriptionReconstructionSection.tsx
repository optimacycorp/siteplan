import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";

type ReconstructionPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type ReconstructionModel = {
  closure: {
    closureError: number;
    precisionRatio: number | null;
    withinTolerance: boolean;
  };
  points: ReconstructionPoint[];
};

type TitleDescriptionReconstructionSectionProps = {
  descriptionText: string;
  parsedCallsCount: number;
  ignoredLineCount: number;
  reconstruction: ReconstructionModel;
  draftLegalDescription: string;
  onDescriptionTextChange: (value: string) => void;
  onSaveReview: () => void;
  onPromoteParcel: () => void;
  onDownloadLegalDescription: () => void;
  onCopyLegalDescription: () => void;
  mutedClassName: string;
  kvClassName: string;
  actionsClassName: string;
};

export function TitleDescriptionReconstructionSection(props: TitleDescriptionReconstructionSectionProps) {
  return (
    <>
      <strong>Description reconstruction</strong>
      <TextAreaField
        label="Paste legal calls or title schedule bearings"
        onChange={(event) => props.onDescriptionTextChange(event.target.value)}
        rows={8}
        value={props.descriptionText}
      />
      <div className={props.kvClassName}><span>Parsed calls</span><span>{props.parsedCallsCount}</span></div>
      <div className={props.kvClassName}><span>Ignored lines</span><span>{props.ignoredLineCount}</span></div>
      <div className={props.kvClassName}><span>Closure error</span><span>{props.reconstruction.closure.closureError.toFixed(3)} ft</span></div>
      <div className={props.kvClassName}>
        <span>Precision</span>
        <span>{props.reconstruction.closure.precisionRatio ? `1:${Math.round(props.reconstruction.closure.precisionRatio).toLocaleString()}` : "Perfect closure"}</span>
      </div>
      <div className={props.kvClassName}>
        <span>Status</span>
        <span>{props.reconstruction.closure.withinTolerance ? "Within tolerance" : "Needs review"}</span>
      </div>
      <div className={props.actionsClassName}>
        <Button onClick={props.onSaveReview}>
          Save review to survey log
        </Button>
        <Button onClick={props.onPromoteParcel} variant="secondary">
          Promote to survey parcel
        </Button>
        <Button onClick={props.onDownloadLegalDescription} variant="secondary">
          Download legal description
        </Button>
        <Button onClick={props.onCopyLegalDescription} variant="ghost">
          Copy legal description
        </Button>
      </div>
      <p className={props.mutedClassName}>
        This is the first title-to-geometry step: parse legal calls, reconstruct the traverse, and surface closure quality before promoting it into parcel or survey objects.
      </p>
    </>
  );
}
