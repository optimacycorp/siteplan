import { normalizeAzimuth } from "@landportal/core-geometry";

export type ParsedDescriptionCall = {
  id: string;
  sourceText: string;
  label: string;
  azimuth: number;
  distance: number;
};

const BEARING_PATTERN = /^\s*([NS])\s*(\d{1,3})(?:\s*(?:deg|degrees)\s*(\d{1,2})?)?(?:'\s*(\d{1,2})(?:")?)?\s*([EW])\s+([0-9]+(?:\.[0-9]+)?)\s*(?:feet|foot|ft)?\s*$/i;
const AZIMUTH_PATTERN = /^\s*(?:azimuth\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:deg|degrees)?\s+([0-9]+(?:\.[0-9]+)?)\s*(?:feet|foot|ft)?\s*$/i;

export function parseDescriptionCalls(text: string): ParsedDescriptionCall[] {
  return text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseDescriptionCall(line, index))
    .filter((call): call is ParsedDescriptionCall => Boolean(call));
}

export function parseDescriptionCall(line: string, index = 0): ParsedDescriptionCall | null {
  const cleaned = line
    .replace(/^thence\s+/i, "")
    .replace(/^from\s+said\s+point\s+of\s+beginning\s*,?\s*/i, "")
    .replace(/[,.;]+$/g, "")
    .trim();

  const bearingMatch = cleaned.match(BEARING_PATTERN);
  if (bearingMatch) {
    const [, ns, degreesRaw, minutesRaw = "0", secondsRaw = "0", ew, distanceRaw] = bearingMatch;
    const degrees = Number(degreesRaw);
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);
    const angle = degrees + minutes / 60 + seconds / 3600;
    const azimuth = quadrantToAzimuth(ns.toUpperCase(), ew.toUpperCase(), angle);
    return {
      id: `call-${index + 1}`,
      sourceText: line,
      label: cleaned,
      azimuth,
      distance: Number(distanceRaw),
    };
  }

  const azimuthMatch = cleaned.match(AZIMUTH_PATTERN);
  if (azimuthMatch) {
    const [, azimuthRaw, distanceRaw] = azimuthMatch;
    return {
      id: `call-${index + 1}`,
      sourceText: line,
      label: cleaned,
      azimuth: normalizeAzimuth(Number(azimuthRaw)),
      distance: Number(distanceRaw),
    };
  }

  return null;
}

function quadrantToAzimuth(ns: string, ew: string, angle: number) {
  if (ns === "N" && ew === "E") return normalizeAzimuth(angle);
  if (ns === "S" && ew === "E") return normalizeAzimuth(180 - angle);
  if (ns === "S" && ew === "W") return normalizeAzimuth(180 + angle);
  return normalizeAzimuth(360 - angle);
}
