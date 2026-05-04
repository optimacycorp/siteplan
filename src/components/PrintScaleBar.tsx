import { useMemo } from "react";
import { useQuickSiteStore } from "../state/quickSiteStore";

const NICE_FEET = [20, 50, 100, 200, 250, 500, 1000];

function feetPerPixel(latitude: number, zoom: number) {
  const metersPerPixel =
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  return metersPerPixel * 3.28084;
}

export function PrintScaleBar() {
  const mapView = useQuickSiteStore((state) => state.mapView);

  const scale = useMemo(() => {
    const lat = mapView.center[1] ?? 38.87837;
    const zoom = mapView.zoom ?? 17;
    const ftPerPx = feetPerPixel(lat, zoom);
    const targetWidthPx = 140;
    const targetFeet = ftPerPx * targetWidthPx;
    let feet = NICE_FEET[0];
    for (const value of NICE_FEET) {
      if (value <= targetFeet) {
        feet = value;
      }
    }
    const widthPx = feet / ftPerPx;
    return { feet, widthPx };
  }, [mapView]);

  return (
    <div className="print-scale-bar" aria-label="Scale bar">
      <div className="print-scale-bar-line" style={{ width: `${Math.max(48, scale.widthPx)}px` }}>
        <span className="print-scale-bar-tick print-scale-bar-tick-start" />
        <span className="print-scale-bar-tick print-scale-bar-tick-end" />
      </div>
      <div className="print-scale-bar-labels">
        <span>0</span>
        <span>{scale.feet} ft</span>
      </div>
    </div>
  );
}
