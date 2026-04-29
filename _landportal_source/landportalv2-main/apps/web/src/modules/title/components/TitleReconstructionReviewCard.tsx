import { Button } from "@/components/ui/Button";

type ReviewIssue = {
  id: string;
  code: string;
  message: string;
};

type TitleReconstructionReviewCardProps = {
  reviewIssues: ReviewIssue[];
  onDownloadSummary: () => void;
  onExportPoints: () => void;
  listClassName: string;
  docCardClassName: string;
  mutedClassName: string;
  actionsClassName: string;
};

export function TitleReconstructionReviewCard(props: TitleReconstructionReviewCardProps) {
  return (
    <>
      <strong>Reconstruction review</strong>
      <div className={props.listClassName}>
        {props.reviewIssues.map((issue) => (
          <div className={props.docCardClassName} key={issue.id}>
            <strong>{issue.code.replaceAll("_", " ")}</strong>
            <span className={props.mutedClassName}>{issue.message}</span>
          </div>
        ))}
      </div>
      <div className={props.actionsClassName}>
        <Button onClick={props.onDownloadSummary} variant="secondary">
          Download review summary
        </Button>
        <Button onClick={props.onExportPoints} variant="ghost">
          Export points CSV
        </Button>
      </div>
    </>
  );
}
