import assert from "node:assert/strict";
import test from "node:test";

import { compareQueryShadow } from "./query-docs-shadow-lib.mjs";

const legacyDocument = {
  id: "ADR-0001",
  owner: "architecture",
  path: "docs/decisions/0001-example.md",
  status: "accepted",
  summary: "Defines the example architecture decision for the shadow fixture.",
  type: "adr",
};
const foundationDocument = {
  ...legacyDocument,
  repositoryPath: legacyDocument.path,
  source: "markdown-tree",
  title: "ADR-0001: Example",
};
delete foundationDocument.path;

test("accepts an identical common document projection", () => {
  assert.deepEqual(
    compareQueryShadow({
      foundationResult: {
        catalogStatus: "complete",
        diagnostics: [],
        documents: [foundationDocument],
        matches: 1,
      },
      legacyDocuments: [legacyDocument],
    }),
    { diagnostics: [], documentCount: 1, ok: true },
  );
});

test("reports projection drift without hiding partial diagnostics", () => {
  const result = compareQueryShadow({
    foundationResult: {
      catalogStatus: "partial",
      diagnostics: [
        {
          message: "Owner is not registered.",
          ruleId: "document.catalog.owner-invalid",
          severity: "error",
          subject: "docs/decisions/0001-example.md",
        },
      ],
      documents: [{ ...foundationDocument, status: "proposed" }],
      matches: 1,
    },
    legacyDocuments: [legacyDocument],
  });

  assert.equal(result.ok, false);
  assert.equal(result.documentCount, 1);
  assert.match(result.diagnostics[0], /catalog is partial/u);
  assert.match(result.diagnostics[1], /document\.catalog\.owner-invalid/u);
  assert.match(result.diagnostics[2], /Document .* differs/u);
});

test("accepts engine-specific ordering and reports added or removed documents", () => {
  const secondLegacy = {
    ...legacyDocument,
    id: "ADR-0002",
    path: "docs/decisions/0002-second.md",
  };
  const secondFoundation = {
    ...foundationDocument,
    id: secondLegacy.id,
    repositoryPath: secondLegacy.path,
  };
  const reordered = compareQueryShadow({
    foundationResult: {
      catalogStatus: "complete",
      diagnostics: [],
      documents: [secondFoundation, foundationDocument],
      matches: 2,
    },
    legacyDocuments: [legacyDocument, secondLegacy],
  });

  assert.equal(reordered.ok, true);

  const removed = compareQueryShadow({
    foundationResult: {
      catalogStatus: "complete",
      diagnostics: [],
      documents: [secondFoundation],
      matches: 1,
    },
    legacyDocuments: [legacyDocument, secondLegacy],
  });

  assert.equal(removed.ok, false);
  assert.equal(removed.diagnostics.length, 2);
  assert.match(removed.diagnostics[0], /Document count differs/u);
  assert.match(removed.diagnostics[1], /Document .* differs/u);
});
