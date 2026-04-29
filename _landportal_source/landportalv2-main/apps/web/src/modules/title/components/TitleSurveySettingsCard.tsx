import { Button } from "@/components/ui/Button";

type TitleSurveySettingsCardProps = {
  referenceSystem: string;
  measurementUnit: string;
  onSetReferenceSystem: (value: "local-grid" | "state-plane") => void;
  onSetMeasurementUnit: (value: "us_survey_ft" | "meters") => void;
  kvClassName: string;
  actionsClassName: string;
};

export function TitleSurveySettingsCard(props: TitleSurveySettingsCardProps) {
  return (
    <>
      <strong>Survey settings</strong>
      <div className={props.kvClassName}><span>Reference system</span><span>{props.referenceSystem}</span></div>
      <div className={props.kvClassName}><span>Measurement unit</span><span>{props.measurementUnit}</span></div>
      <div className={props.actionsClassName}>
        <Button onClick={() => props.onSetReferenceSystem("local-grid")} variant={props.referenceSystem === "local-grid" ? "primary" : "ghost"}>Local grid</Button>
        <Button onClick={() => props.onSetReferenceSystem("state-plane")} variant={props.referenceSystem === "state-plane" ? "primary" : "ghost"}>State plane</Button>
        <Button onClick={() => props.onSetMeasurementUnit("us_survey_ft")} variant={props.measurementUnit === "us_survey_ft" ? "secondary" : "ghost"}>US survey ft</Button>
        <Button onClick={() => props.onSetMeasurementUnit("meters")} variant={props.measurementUnit === "meters" ? "secondary" : "ghost"}>Meters</Button>
      </div>
    </>
  );
}
