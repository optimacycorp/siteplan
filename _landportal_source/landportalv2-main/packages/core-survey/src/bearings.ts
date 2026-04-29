import { lineLength, normalizeAzimuth, type Point2D } from "@landportal/core-geometry";

export type SurveyBearingLabel = {
  azimuth: number;
  label: string;
  length: number;
};

export function bearingLabelFromAzimuth(azimuth: number) {
  const normalized = normalizeAzimuth(azimuth);

  if (normalized === 0 || normalized === 180) {
    return normalized === 0 ? "N 00°00'00\" E" : "S 00°00'00\" W";
  }

  if (normalized === 90 || normalized === 270) {
    return normalized === 90 ? "N 90°00'00\" E" : "S 90°00'00\" W";
  }

  if (normalized < 90) {
    return `N ${formatAngle(normalized)} E`;
  }

  if (normalized < 180) {
    return `S ${formatAngle(180 - normalized)} E`;
  }

  if (normalized < 270) {
    return `S ${formatAngle(normalized - 180)} W`;
  }

  return `N ${formatAngle(360 - normalized)} W`;
}

export function bearingFromPoints(start: Point2D, end: Point2D): SurveyBearingLabel {
  const azimuth = normalizeAzimuth((Math.atan2(end.x - start.x, end.y - start.y) * 180) / Math.PI);
  return {
    azimuth,
    label: bearingLabelFromAzimuth(azimuth),
    length: lineLength(start, end),
  };
}

function formatAngle(value: number) {
  const degrees = Math.floor(value);
  const minutesFloat = (value - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);

  return `${String(degrees).padStart(2, "0")}°${String(minutes).padStart(2, "0")}'${String(seconds).padStart(2, "0")}"`;
}
