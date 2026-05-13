export type PlotPageSize = "letter" | "tabloid" | "arch-c" | "arch-d" | "arch-e";
export type PlotScaleFeetPerInch = 10 | 20 | 30 | 40 | 50 | 60 | 100;
export type PlotMode = "visual-fit" | "fixed-scale";

export const PLOT_FRAME_INCHES: Record<PlotPageSize, { width: number; height: number }> = {
  letter: { width: 10.3, height: 7.4 },
  tabloid: { width: 16.3, height: 9.9 },
  "arch-c": { width: 23.3, height: 16.5 },
  "arch-d": { width: 35.3, height: 22.5 },
  "arch-e": { width: 47.3, height: 30.5 },
};

export const PRINT_PAGE_SIZES: Record<PlotPageSize, string> = {
  letter: "11in 8.5in",
  tabloid: "17in 11in",
  "arch-c": "24in 18in",
  "arch-d": "36in 24in",
  "arch-e": "48in 36in",
};

export const PAPER_PAGE_INCHES: Record<PlotPageSize, { width: number; height: number }> = {
  letter: { width: 11, height: 8.5 },
  tabloid: { width: 17, height: 11 },
  "arch-c": { width: 24, height: 18 },
  "arch-d": { width: 36, height: 24 },
  "arch-e": { width: 48, height: 36 },
};

export function formatPageSizeLabel(pageSize: PlotPageSize) {
  switch (pageSize) {
    case "arch-c":
      return "ARCH C 18x24";
    case "arch-d":
      return "ARCH D 24x36";
    case "arch-e":
      return "ARCH E 36x48";
    case "tabloid":
      return "Tabloid";
    default:
      return "Letter";
  }
}

export function mergeBounds(bounds: Array<[[number, number], [number, number]]>) {
  if (!bounds.length) return null;
  return bounds.reduce<[[number, number], [number, number]]>((acc, next) => [
    [Math.min(acc[0][0], next[0][0]), Math.min(acc[0][1], next[0][1])],
    [Math.max(acc[1][0], next[1][0]), Math.max(acc[1][1], next[1][1])],
  ], bounds[0]);
}

export function feetToLatitudeDegrees(feet: number) {
  return (feet * 0.3048) / 111_320;
}

export function feetToLongitudeDegrees(feet: number, latitude: number) {
  const cosine = Math.cos((latitude * Math.PI) / 180);
  const safeCosine = Math.max(0.2, Math.abs(cosine));
  return (feet * 0.3048) / (111_320 * safeCosine);
}

export function fixedScaleBoundsForCenter(
  center: [number, number],
  pageSize: PlotPageSize,
  feetPerInch: PlotScaleFeetPerInch,
): [[number, number], [number, number]] {
  const frame = PLOT_FRAME_INCHES[pageSize];
  const halfWidthFeet = (frame.width * feetPerInch) / 2;
  const halfHeightFeet = (frame.height * feetPerInch) / 2;
  const latDelta = feetToLatitudeDegrees(halfHeightFeet);
  const lngDelta = feetToLongitudeDegrees(halfWidthFeet, center[1]);
  return [
    [center[0] - lngDelta, center[1] - latDelta],
    [center[0] + lngDelta, center[1] + latDelta],
  ];
}

export function calculatePlotDiagnostics(options: {
  pageSize: PlotPageSize;
  feetPerInch: PlotScaleFeetPerInch;
  contentBounds: [[number, number], [number, number]] | null;
  distanceMeters: (
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number,
  ) => number;
}) {
  const frame = PLOT_FRAME_INCHES[options.pageSize];
  const sheetWidthFeet = frame.width * options.feetPerInch;
  const sheetHeightFeet = frame.height * options.feetPerInch;

  if (!options.contentBounds) {
    return {
      sheetWidthFeet,
      sheetHeightFeet,
      contentWidthFeet: 0,
      contentHeightFeet: 0,
      fits: true,
      estimatedSheetColumns: 1,
      estimatedSheetRows: 1,
      estimatedSheetCount: 1,
    };
  }

  const contentWidthFeet =
    options.distanceMeters(
      options.contentBounds[0][0],
      options.contentBounds[0][1],
      options.contentBounds[1][0],
      options.contentBounds[0][1],
    ) * 3.28084;
  const contentHeightFeet =
    options.distanceMeters(
      options.contentBounds[0][0],
      options.contentBounds[0][1],
      options.contentBounds[0][0],
      options.contentBounds[1][1],
    ) * 3.28084;

  const estimatedSheetColumns = Math.max(1, Math.ceil(contentWidthFeet / sheetWidthFeet));
  const estimatedSheetRows = Math.max(1, Math.ceil(contentHeightFeet / sheetHeightFeet));

  return {
    sheetWidthFeet,
    sheetHeightFeet,
    contentWidthFeet,
    contentHeightFeet,
    fits: contentWidthFeet <= sheetWidthFeet && contentHeightFeet <= sheetHeightFeet,
    estimatedSheetColumns,
    estimatedSheetRows,
    estimatedSheetCount: estimatedSheetColumns * estimatedSheetRows,
  };
}

export function buildPlotSheetBounds(options: {
  pageSize: PlotPageSize;
  feetPerInch: PlotScaleFeetPerInch;
  anchor: [number, number];
  contentBounds: [[number, number], [number, number]] | null;
  distanceMeters: (
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number,
  ) => number;
}) {
  const primaryBounds = fixedScaleBoundsForCenter(
    options.anchor,
    options.pageSize,
    options.feetPerInch,
  );

  if (!options.contentBounds) {
    return [
      {
        sheetIndex: 0,
        sheetNumber: "Sheet 1",
        bounds: primaryBounds,
      },
    ];
  }

  const diagnostics = calculatePlotDiagnostics({
    pageSize: options.pageSize,
    feetPerInch: options.feetPerInch,
    contentBounds: options.contentBounds,
    distanceMeters: options.distanceMeters,
  });

  if (diagnostics.fits) {
    return [
      {
        sheetIndex: 0,
        sheetNumber: "Sheet 1",
        bounds: primaryBounds,
      },
    ];
  }

  const westFeet =
    options.contentBounds[0][0] < options.anchor[0]
      ? options.distanceMeters(
          options.anchor[0],
          options.anchor[1],
          options.contentBounds[0][0],
          options.anchor[1],
        ) * 3.28084
      : 0;
  const eastFeet =
    options.contentBounds[1][0] > options.anchor[0]
      ? options.distanceMeters(
          options.anchor[0],
          options.anchor[1],
          options.contentBounds[1][0],
          options.anchor[1],
        ) * 3.28084
      : 0;
  const southFeet =
    options.contentBounds[0][1] < options.anchor[1]
      ? options.distanceMeters(
          options.anchor[0],
          options.anchor[1],
          options.anchor[0],
          options.contentBounds[0][1],
        ) * 3.28084
      : 0;
  const northFeet =
    options.contentBounds[1][1] > options.anchor[1]
      ? options.distanceMeters(
          options.anchor[0],
          options.anchor[1],
          options.anchor[0],
          options.contentBounds[1][1],
        ) * 3.28084
      : 0;

  const halfWidthFeet = diagnostics.sheetWidthFeet / 2;
  const halfHeightFeet = diagnostics.sheetHeightFeet / 2;
  const sheetsLeft = Math.max(0, Math.ceil((westFeet - halfWidthFeet) / diagnostics.sheetWidthFeet));
  const sheetsRight = Math.max(0, Math.ceil((eastFeet - halfWidthFeet) / diagnostics.sheetWidthFeet));
  const sheetsDown = Math.max(0, Math.ceil((southFeet - halfHeightFeet) / diagnostics.sheetHeightFeet));
  const sheetsUp = Math.max(0, Math.ceil((northFeet - halfHeightFeet) / diagnostics.sheetHeightFeet));

  const pages: Array<{
    sheetIndex: number;
    sheetNumber: string;
    bounds: [[number, number], [number, number]];
  }> = [];

  let sheetIndex = 0;
  for (let rowOffset = sheetsUp; rowOffset >= -sheetsDown; rowOffset -= 1) {
    for (let columnOffset = -sheetsLeft; columnOffset <= sheetsRight; columnOffset += 1) {
      const center: [number, number] = [
        options.anchor[0] + feetToLongitudeDegrees(columnOffset * diagnostics.sheetWidthFeet, options.anchor[1]),
        options.anchor[1] + feetToLatitudeDegrees(rowOffset * diagnostics.sheetHeightFeet),
      ];
      pages.push({
        sheetIndex,
        sheetNumber: `Sheet ${sheetIndex + 1}`,
        bounds: fixedScaleBoundsForCenter(center, options.pageSize, options.feetPerInch),
      });
      sheetIndex += 1;
    }
  }

  return pages;
}
