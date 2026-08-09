import assert from "node:assert/strict";
import test from "node:test";

import { getSimplePaths } from "@xstate/graph";
import {
  array,
  assert as assertProperty,
  constantFrom,
  property,
} from "fast-check";

import {
  applyMachineEvent,
  deriveMachine,
  initialSnapshot,
} from "./derive-machine.mjs";
import { loadSchema, loadSpecs } from "./load-specs.mjs";
import { semanticMutations } from "./mutations.mjs";
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
    assert.throws(
      () => assertOwnedSemantics(mutation.apply(source)),
      undefined,
      mutation.id,
    );
  }
});
