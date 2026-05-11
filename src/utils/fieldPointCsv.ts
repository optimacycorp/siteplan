import type { ParsedFieldPointRow } from "../types/fieldPoint";

type ParseResult = {
  rows: ParsedFieldPointRow[];
  errors: string[];
};

const headerAliases: Record<string, string[]> = {
  pointNumber: ["point", "pt", "point_number", "id"],
  name: ["name", "description", "desc"],
  northing: ["northing", "north", "y", "n"],
  easting: ["easting", "east", "x", "e"],
  elevation: ["elevation", "elev", "z"],
  code: ["code", "feature_code", "fc"],
  note: ["note", "notes", "comment"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function resolveHeaderIndexes(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const indexes: Record<string, number> = {};

  Object.entries(headerAliases).forEach(([key, aliases]) => {
    const index = normalized.findIndex((header) => aliases.includes(header));
    if (index >= 0) {
      indexes[key] = index;
    }
  });

  return indexes;
}

function readCell(values: string[], index: number | undefined) {
  if (index === undefined || index < 0 || index >= values.length) return "";
  return values[index]?.trim() ?? "";
}

function parseOptionalNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseFieldPointCsv(text: string): ParseResult {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      rows: [],
      errors: ["CSV is empty."],
    };
  }

  const headers = parseCsvLine(lines[0]);
  const indexes = resolveHeaderIndexes(headers);
  const errors: string[] = [];
  const rows: ParsedFieldPointRow[] = [];

  if (indexes.pointNumber === undefined) errors.push("CSV is missing a point column.");
  if (indexes.name === undefined) errors.push("CSV is missing a name/description column.");
  if (indexes.northing === undefined) errors.push("CSV is missing a northing column.");
  if (indexes.easting === undefined) errors.push("CSV is missing an easting column.");
  if (errors.length) {
    return { rows: [], errors };
  }

  lines.slice(1).forEach((line, rowIndex) => {
    const values = parseCsvLine(line);
    const pointNumber = readCell(values, indexes.pointNumber);
    const name = readCell(values, indexes.name);
    const northingText = readCell(values, indexes.northing);
    const eastingText = readCell(values, indexes.easting);
    const northing = Number(northingText);
    const easting = Number(eastingText);

    if (!pointNumber || !name) {
      errors.push(`Row ${rowIndex + 2}: point and name are required.`);
      return;
    }

    if (!Number.isFinite(northing) || !Number.isFinite(easting)) {
      errors.push(`Row ${rowIndex + 2}: northing and easting must be numeric.`);
      return;
    }

    rows.push({
      pointNumber,
      name,
      northing,
      easting,
      elevation: parseOptionalNumber(readCell(values, indexes.elevation)),
      code: readCell(values, indexes.code) || undefined,
      note: readCell(values, indexes.note) || undefined,
    });
  });

  return { rows, errors };
}
