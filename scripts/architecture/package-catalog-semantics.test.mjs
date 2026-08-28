import assert from "node:assert/strict";
import test from "node:test";

import { catalogResourceBudgets } from "./package-catalog-resource-guards.mjs";
import { validateCatalogSemantics } from "./package-catalog-semantics.mjs";

const ownerDocument = "architecture.catalog-semantics-fixture";
const documents = new Map([
  [
    ownerDocument,
    { metadata: { status: "accepted", type: "architecture" } },
  ],
]);

function entry(index, packagePath) {
  return {
    id: `platform.fixture-${index}`,
    owner_document: ownerDocument,
    package_name: `@agent-teams/fixture-${index}`,
    path: packagePath,
    role: "platform",
  };
}

test("reports deterministic nearest-ancestor overlaps", () => {
  const catalog = {
    packages: [
      entry(3, "packages/sdk/independent"),
      entry(2, "packages/platform/root/child/grandchild"),
      entry(0, "packages/platform/root"),
      entry(1, "packages/platform/root/child"),
    ],
  };
  const errors = [];
  validateCatalogSemantics(catalog, documents, errors);
  assert.deepEqual(errors, [
    "architecture/package-catalog.yaml: package paths overlap: packages/platform/root and packages/platform/root/child",
    "architecture/package-catalog.yaml: package paths overlap: packages/platform/root/child and packages/platform/root/child/grandchild",
  ]);
});

test("caps adversarial overlap diagnostics with deterministic early termination", () => {
  const root = entry(0, "packages/platform/root");
  const descendants = Array.from({ length: 4_096 }, (_, index) =>
    entry(index + 1, `packages/platform/root/child-${String(index).padStart(4, "0")}`),
  );
  const forwardErrors = [];
  const reverseErrors = [];
  validateCatalogSemantics(
    { packages: [root, ...descendants] },
    documents,
    forwardErrors,
  );
  validateCatalogSemantics(
    { packages: descendants.toReversed().concat(root) },
    documents,
    reverseErrors,
  );
  assert.deepEqual(reverseErrors, forwardErrors);
  assert.equal(forwardErrors.length, catalogResourceBudgets.diagnostics);
  assert.match(
    forwardErrors.at(-1),
    /orchestrator\.catalog\.resource\.diagnostics-omitted/u,
  );
});
