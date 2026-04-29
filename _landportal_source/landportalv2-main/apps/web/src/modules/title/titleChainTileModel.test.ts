import { describe, expect, it } from "vitest";

import { buildActiveChainTiles } from "./titleChainTileModel";

describe("titleChainTileModel", () => {
  it("prefers visible reference text over synthetic linked-document titles", () => {
    const tiles = buildActiveChainTiles({
      activeCommitment: {
        id: "commitment-1",
        projectId: "project-1",
        parcelSnapshotId: null,
        primaryDocumentId: null,
        isPrimary: true,
        title: "Title Commitment",
        orderNumber: "",
        commitmentNumber: "",
        dateOfIssue: null,
        effectiveDate: null,
        effectiveTimestamp: null,
        propertyAddress: "",
        issuingCompany: "",
        fullPropertyDescription: "",
        status: "ready",
        importStatus: "ready",
        importError: "",
        childLinkCount: 1,
        childFetchSuccessCount: 1,
        childFetchFailureCount: 0,
        notes: "",
        metadata: {},
        createdAt: "",
        updatedAt: "",
      },
      linkedDocumentLinks: [
        {
          id: "link-1",
          projectDocumentId: "doc-1",
          titleCommitmentId: "commitment-1",
          relationType: "chain_of_title",
          sourceReference: "El Paso county recorded 02/27/2020 under reception no. 220028404",
          sourcePageNumber: 4,
          sourceReferenceText: "El Paso county recorded 02/27/2020 under reception no. 220028404",
          externalReference: "https://example.com/doc.pdf",
          notes: "",
          metadata: {},
          createdAt: "",
        },
      ],
      uploadedDocuments: [
        {
          id: "doc-1",
          projectId: "project-1",
          title: "El Paso county recorded linked document 1",
          documentType: "deed",
          documentRole: "title_linked_record",
          status: "linked",
          storagePath: null,
          fileName: "",
          mimeType: "",
          fileSizeBytes: 0,
          externalReference: "https://example.com/doc.pdf",
          parentDocumentId: null,
          sourceCommitmentId: "commitment-1",
          sourcePageNumber: 4,
          sourceReferenceText: "El Paso county recorded 02/27/2020 under reception no. 220028404",
          metadata: {},
          updatedAt: "",
        },
      ],
      activeReferences: [
        {
          id: "reference-1",
          titleCommitmentId: "commitment-1",
          expectedDocumentType: "deed",
          referenceText: "El Paso county recorded 02/27/2020 under reception no. 220028404",
          referenceKey: "el paso county recorded 02/27/2020 under reception no. 220028404",
          briefDescription: "",
          scheduleSection: "chain_of_title",
          sourcePage: 4,
          sourceSection: "chain_of_title",
          linkUrl: "https://example.com/doc.pdf",
          visitStatus: "visited",
          fetchStatus: "linked",
          fetchError: "",
          matchConfidence: 0.9,
          visitedProjectDocumentId: "doc-1",
          metadata: {},
          createdAt: "",
          updatedAt: "",
        },
      ],
    });

    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.title).toBe("El Paso county recorded 02/27/2020 under reception no. 220028404");
    expect(tiles[0]?.title).not.toContain("linked document 1");
  });
});
