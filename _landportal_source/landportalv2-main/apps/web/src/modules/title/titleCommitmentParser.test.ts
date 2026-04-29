import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { extractCommitmentDataFromBytes } from "./titleCommitmentParser";

describe("titleCommitmentParser", () => {
  it("extracts the 10 chain-of-title child documents from the Rampart sample PDF", () => {
    const fixturePath = path.resolve(
      process.cwd(),
      "src/modules/title/__fixtures__/55083413_documents.pdf",
    );
    const pdfBytes = new Uint8Array(readFileSync(fixturePath));

    const parsed = extractCommitmentDataFromBytes(pdfBytes);

    expect(parsed.parsedFields.commitmentNumber).toBe("73332-00-002");
    expect(parsed.linkedReferences).toHaveLength(10);
    expect(parsed.linkedReferences.every((entry) => entry.originalUrl)).toBe(true);
    expect(parsed.linkedReferences.every((entry) => entry.fetchStatus === "matched")).toBe(true);
  });
});
