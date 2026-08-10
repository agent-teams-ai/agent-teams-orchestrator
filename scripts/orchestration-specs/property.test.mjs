import assert from "node:assert/strict";
import test from "node:test";

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
import { loadSpecs } from "./load-specs.mjs";

const propertyParameters = { numRuns: 300, seed: 8_020_026 };
const specs = loadSpecs();
const specsById = new Map(specs.map((spec) => [spec.id, spec]));

for (const spec of specs) {
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
      propertyParameters,
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
      { ...propertyParameters, numRuns: 200 },
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
    propertyParameters,
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
    { ...propertyParameters, numRuns: 100 },
  );
});
