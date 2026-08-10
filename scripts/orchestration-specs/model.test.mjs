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
} from "./generated-artifacts.mjs";
import { loadSchema, loadSpecs } from "./load-specs.mjs";
import { repositoryRoot } from "./paths.mjs";
import { deriveIndependentStateModels } from "./state-model.mjs";
import {
  assertOwnedSemantics,
  assertSchemaValid,
  createSchemaValidator,
} from "./validate-specs.mjs";

const specs = loadSpecs();

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
});
