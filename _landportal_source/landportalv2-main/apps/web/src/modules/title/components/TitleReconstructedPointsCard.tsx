type ReconstructedPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type TitleReconstructedPointsCardProps = {
  points: ReconstructedPoint[];
  listClassName: string;
  docCardClassName: string;
  kvClassName: string;
};

export function TitleReconstructedPointsCard(props: TitleReconstructedPointsCardProps) {
  return (
    <>
      <strong>Reconstructed points</strong>
      <div className={props.listClassName}>
        {props.points.map((point) => (
          <div className={props.docCardClassName} key={point.id}>
            <strong>{point.label}</strong>
            <div className={props.kvClassName}><span>Easting</span><span>{point.x.toFixed(3)}</span></div>
            <div className={props.kvClassName}><span>Northing</span><span>{point.y.toFixed(3)}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}
