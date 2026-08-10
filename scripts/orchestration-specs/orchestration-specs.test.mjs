import assert from "node:assert/strict";
import fs from "node:fs";
import nodePath from "node:path";
import test from "node:test";

import { getSimplePaths } from "@xstate/graph";
import {
  array,
  assert as assertProperty,
  constant,
  constantFrom,
  property,
} from "fast-check";
import { parse } from "yaml";

import {
  assertGeneratedArtifactInventory,
  expectedGeneratedArtifacts,
} from "./generated-artifacts.mjs";
import {
  applyMachineEvent,
  deriveMachine,
  initialSnapshot,
} from "./derive-machine.mjs";
import { loadSchema, loadSpecs } from "./load-specs.mjs";
import { semanticMutations } from "./mutations.mjs";
import { repositoryRoot } from "./paths.mjs";
import {
  assertOwnedSemantics,
  assertSchemaValid,
  createSchemaValidator,
} from "./validate-specs.mjs";

const specs = loadSpecs();
const specsById = new Map(specs.map((spec) => [spec.id, spec]));

test("canonical JSON specs satisfy the strict schema and owned semantics", () => {
  const validate = createSchemaValidator(loadSchema());
  for (const spec of specs) {
    assertSchemaValid(validate, spec);
    assertOwnedSemantics(spec);
  }
});

for (const spec of specs) {
  test(`${spec.id} XState graph reaches every canonical state`, () => {
    const machine = deriveMachine(spec);
    const reachable = new Set(getSimplePaths(machine).map((path) => path.state.value));
    assert.deepEqual(reachable, new Set(spec.states.map((state) => state.id)));
  });

  test(`${spec.id} arbitrary event sequences never invent a state`, () => {
    const machine = deriveMachine(spec);
    const stateIds = new Set(spec.states.map((state) => state.id));
    const eventIds = spec.events.map((event) => event.id);

    assertProperty(
      property(
        array(constantFrom(...eventIds), { maxLength: 100 }),
        (events) => {
          let snapshot = initialSnapshot(machine);
          for (const event of events) {
            snapshot = applyMachineEvent(machine, snapshot, event);
            assert.ok(stateIds.has(snapshot.value));
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  test(`${spec.id} terminal states absorb arbitrary late input`, () => {
    const machine = deriveMachine(spec);
    const eventIds = spec.events.map((event) => event.id);
    const terminalStates = new Set(
      spec.states.filter((state) => state.terminal).map((state) => state.id),
    );

    assertProperty(
      property(
        array(constantFrom(...eventIds), { maxLength: 100 }),
        (suffix) => {
          for (const trace of spec.traces) {
            let snapshot = initialSnapshot(machine);
            for (const step of trace.steps) {
              snapshot = applyMachineEvent(machine, snapshot, step.event);
            }
            if (!terminalStates.has(snapshot.value)) {
              continue;
            }

            const terminal = snapshot.value;
            for (const event of suffix) {
              snapshot = applyMachineEvent(machine, snapshot, event);
              assert.equal(snapshot.value, terminal);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
}

test("Run authority generation never decreases over arbitrary traces", () => {
  const spec = specsById.get("orchestrator.run-authority-state");
  const machine = deriveMachine(spec);
  const stateById = new Map(spec.states.map((state) => [state.id, state]));
  const eventIds = spec.events.map((event) => event.id);

  assertProperty(
    property(
      array(constantFrom(...eventIds), { maxLength: 100 }),
      (events) => {
        let snapshot = initialSnapshot(machine);
        let generation = 1;
        for (const event of events) {
          snapshot = applyMachineEvent(machine, snapshot, event);
          const nextGeneration = stateById.get(snapshot.value).coordinates[
            "run-authority-generation"
          ];
          assert.ok(nextGeneration >= generation);
          generation = nextGeneration;
        }
      },
    ),
    { numRuns: 300 },
  );
});

test("Run suspension and reauthorization strictly advance generation", () => {
  const spec = specsById.get("orchestrator.run-authority-state");
  const stateById = new Map(spec.states.map((state) => [state.id, state]));
  const authorityAdvancingEvents = new Set([
    "VERIFIED_REVOCATION",
    "AUTHORITY_EXPIRED",
    "EXPLICIT_REAUTHORIZATION",
  ]);
  const transitions = spec.transitions.filter(
    (transition) =>
      transition.disposition === "accepted" &&
      authorityAdvancingEvents.has(transition.event),
  );

  assertProperty(
    property(constantFrom(...transitions), (transition) => {
      const sourceGeneration = stateById.get(transition.source).coordinates[
        "run-authority-generation"
      ];
      const targetGeneration = stateById.get(transition.target).coordinates[
        "run-authority-generation"
      ];
      assert.equal(targetGeneration, sourceGeneration + 1);
    }),
    { numRuns: 100 },
  );
});

test("equal-generation reauthorization fails the generation property", () => {
  const mutation = semanticMutations.find(
    (candidate) => candidate.id === "keep-equal-generation-on-reauthorization",
  );
  const source = specsById.get(mutation.specId);
  const mutant = mutation.apply(source);
  const stateById = new Map(mutant.states.map((state) => [state.id, state]));
  const reauthorization = mutant.transitions.find(
    (transition) =>
      transition.event === "EXPLICIT_REAUTHORIZATION" &&
      transition.disposition === "accepted",
  );

  assert.throws(() =>
    assertProperty(
      property(constant(reauthorization), (transition) => {
        const sourceGeneration = stateById.get(transition.source).coordinates[
          "run-authority-generation"
        ];
        const targetGeneration = stateById.get(transition.target).coordinates[
          "run-authority-generation"
        ];
        assert.equal(targetGeneration, sourceGeneration + 1);
      }),
      { numRuns: 1 },
    ),
  );
});

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

test("semantic mutation pack is killed by the owned invariant validator", () => {
  for (const mutation of semanticMutations) {
    const source = specsById.get(mutation.specId);
    const mutant = mutation.apply(source);
    assert.throws(
      () => assertOwnedSemantics(mutant),
      undefined,
      mutation.id,
    );
  }
});

test("a missing canonical transition is rejected after mutant construction", () => {
  const mutation = semanticMutations.find(
    (candidate) => candidate.id === "remove-authority-expiry-transition",
  );
  const source = specsById.get(mutation.specId);
  const mutant = mutation.apply(source);

  assert.equal(
    mutant.transitions.some(
      (transition) => transition.event === "AUTHORITY_EXPIRED",
    ),
    false,
  );
  assert.throws(() => assertOwnedSemantics(mutant));
});

test("undeclared trace, fault, and invariant ADR references are rejected", () => {
  const mutationIds = new Set([
    "use-undeclared-trace-event",
    "use-undeclared-fault-event",
    "use-non-authoritative-invariant-adr",
  ]);

  for (const mutation of semanticMutations.filter((candidate) =>
    mutationIds.has(candidate.id),
  )) {
    const source = specsById.get(mutation.specId);
    const mutant = mutation.apply(source);
    assert.throws(() => assertOwnedSemantics(mutant), undefined, mutation.id);
  }
});

test("unexpected stale Mermaid artifacts fail the generated inventory", () => {
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

test("changed JSON routing reaches both executable-spec gates", () => {
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
});
