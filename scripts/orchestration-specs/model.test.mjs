import assert from "node:assert/strict";
import fs from "node:fs";
import nodePath from "node:path";
import test from "node:test";

import { getSimplePaths } from "@xstate/graph";
import { parse } from "yaml";

import {
  applyMachineEvent,
  deriveMachine,
} from "./derive-machine.mjs";
import {
  assertGeneratedArtifactInventory,
  assertGeneratedArtifactsCurrent,
  expectedGeneratedArtifacts,
  writeGeneratedArtifacts,
} from "./generated-artifacts.mjs";
import {
  loadCatalog,
  loadCatalogBundle,
  loadSchema,
  loadSpecs,
} from "./load-specs.mjs";
import { proofArtifactsDirectory, repositoryRoot } from "./paths.mjs";
import { deriveIndependentStateModels } from "./state-model.mjs";
import {
  assertOwnedSemantics,
  assertSchemaValid,
  createSchemaValidator,
} from "./validate-specs.mjs";

const specs = loadSpecs();

test("catalog is the only schema, document, and harness inventory", () => {
  const catalog = loadCatalog();
  const missingDocument = structuredClone(catalog);
  missingDocument.specifications[0].documents[0].path =
    "architecture/executable-specs/not-cataloged.json";
  assert.throws(
    () => loadCatalogBundle(missingDocument),
    /filesystem inventory differs from the catalog/u,
  );

  const missingSchema = structuredClone(catalog);
  missingSchema.specifications[0].documents[0].schemaId =
    "https://agent-teams.dev/schemas/not-cataloged.json";
  assert.throws(
    () => loadCatalogBundle(missingSchema),
    /Document schema is not cataloged/u,
  );

  const driftedAdapter = structuredClone(catalog);
  driftedAdapter.specifications[0].stateModel.adapterPath =
    "scripts/orchestration-specs/state-model.mjs";
  assert.throws(
    () => loadCatalogBundle(driftedAdapter),
    /does not identify the active harness/u,
  );

  const driftedAxes = structuredClone(catalog);
  driftedAxes.specifications[0].stateModel.axes = [
    "project-identity-lifecycle",
    "deletion-epoch",
  ];
  assert.throws(
    () => loadCatalogBundle(driftedAxes),
    /axes differ from the modeled document axes/u,
  );

  for (const [role, expectedScript] of [
    ["property", "specs:property"],
    ["mutation", "specs:mutation"],
    ["model", "specs:model"],
  ]) {
    const driftedGate = structuredClone(catalog);
    const binding =
      role === "model"
        ? driftedGate.specifications[0].stateModel.gateBinding
        : driftedGate.specifications[0].gateBindings[role];
    binding.script = "docs:check";
    assert.throws(
      () => loadCatalogBundle(driftedGate),
      new RegExp(`${role} gate does not identify ${expectedScript}`, "u"),
    );
  }

  const missingCatalogDocument = structuredClone(catalog);
  missingCatalogDocument.specifications[0].documents.pop();
  assert.throws(
    () => loadCatalogBundle(missingCatalogDocument),
    /filesystem inventory differs from the catalog/u,
  );
});

test("canonical JSON specs satisfy the strict schema and owned semantics", () => {
  const validate = createSchemaValidator(loadSchema());
  for (const spec of specs) {
    assertSchemaValid(validate, spec);
    assertOwnedSemantics(spec);
  }
});

test("accepted authority submodels remain independent, without a cross-product", () => {
  const models = deriveIndependentStateModels(specs);
  const individualStateCounts = specs.map((spec) => spec.states.length);
  const crossProductStateCount = individualStateCounts.reduce(
    (product, count) => product * count,
    1,
  );

  assert.equal(models.length, specs.length);
  assert.deepEqual(
    models.map((model) => model.id),
    specs.map((spec) => spec.id),
  );
  assert.deepEqual(
    models.map((model) => Object.keys(model.states).length),
    individualStateCounts,
  );
  assert.ok(models.every((model) => Object.keys(model.states).length < crossProductStateCount));
});

for (const spec of specs) {
  test(`${spec.id} XState graph reaches every canonical state`, () => {
    const machine = deriveMachine(spec);
    const reachable = new Set(getSimplePaths(machine).map((path) => path.state.value));
    assert.deepEqual(reachable, new Set(spec.states.map((state) => state.id)));
  });
}

test("opaque runtime evidence and stale commands never mutate authority", () => {
  for (const spec of specs) {
    const prohibitedEvents = spec.events
      .filter(
        (event) =>
          event.category === "opaque-evidence" || event.category === "stale-command",
      )
      .map((event) => event.id);
    const machine = deriveMachine(spec);

    for (const path of getSimplePaths(machine)) {
      for (const event of prohibitedEvents) {
        const next = applyMachineEvent(machine, path.state, event);
        assert.equal(next.value, path.state.value);
      }
    }
  }
});

test("combined path and diagram evidence is current", () => {
  assertGeneratedArtifactsCurrent(specs);
});

test("generator bootstrap rejects unexpected proof artifacts", () => {
  const unexpectedPath = nodePath.join(
    proofArtifactsDirectory,
    "unexpected-proof.mmd",
  );
  fs.writeFileSync(unexpectedPath, "stateDiagram-v2\n");
  try {
    assert.throws(
      () => writeGeneratedArtifacts(specs),
      /Unexpected proof artifacts: unexpected-proof\.mmd/u,
    );
  } finally {
    fs.rmSync(unexpectedPath);
  }
});

test("unexpected generated artifacts fail the generated inventory", () => {
  const expectedPaths = [...expectedGeneratedArtifacts(specs).keys()];
  const expectedNames = expectedPaths.map((artifactPath) =>
    artifactPath.split("/").at(-1),
  );

  assert.throws(() =>
    assertGeneratedArtifactInventory(
      [...expectedNames, "retired-state-machine.mmd"],
      expectedPaths,
    ),
  );
});

test("changed JSON routing reaches all executable-spec gates", () => {
  const workflow = parse(
    fs.readFileSync(
      nodePath.join(
        repositoryRoot,
        "architecture/foundation/repository-agent-workflow.yaml",
      ),
      "utf8",
    ),
  );
  const manifest = JSON.parse(
    fs.readFileSync(nodePath.join(repositoryRoot, "package.json"), "utf8"),
  );
  const jsonRoute = workflow.changedChecks.find((check) =>
    check.extensions.includes(".json"),
  );

  assert.equal(jsonRoute.script, "architecture:check");
  assert.match(manifest.scripts[jsonRoute.script], /pnpm run specs:check/);
  assert.match(manifest.scripts[jsonRoute.script], /pnpm run specs:test/);
  assert.match(manifest.scripts["specs:test"], /pnpm run specs:property/);
  assert.match(manifest.scripts["specs:test"], /pnpm run specs:mutation/);
  assert.match(manifest.scripts["specs:test"], /pnpm run specs:model/);
  assert.ok(workflow.fullScanPaths.includes("scripts/orchestration-specs"));
  assert.ok(workflow.fullScanPaths.includes("architecture/executable-specs"));
  assert.match(manifest.scripts["check:fast"], /pnpm run specs:check/);
  assert.match(manifest.scripts["check:fast"], /pnpm run specs:test/);
});
