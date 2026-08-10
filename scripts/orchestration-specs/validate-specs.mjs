import assert from "node:assert/strict";

import Ajv2020 from "ajv/dist/2020.js";

import { runEventSequence } from "./derive-machine.mjs";

const uniqueBy = (items, selector, label) => {
  const values = items.map(selector);
  assert.equal(
    new Set(values).size,
    values.length,
    `${label} must be unique`,
  );
};

const transitionKey = ({ source, event }) => `${source}:${event}`;

const transitionFor = (spec, source, event) =>
  spec.transitions.find(
    (transition) => transition.source === source && transition.event === event,
  );

const assertTransition = (
  spec,
  source,
  event,
  disposition,
  target = null,
) => {
  const item = transitionFor(spec, source, event);
  assert.ok(item, `${spec.id} must declare ${source} + ${event}`);
  assert.equal(item.disposition, disposition);
  assert.equal(item.target, target);
};

const assertGenericSemantics = (spec) => {
  uniqueBy(spec.axes, (axis) => axis.id, `${spec.id} axis IDs`);
  uniqueBy(spec.states, (state) => state.id, `${spec.id} state IDs`);
  uniqueBy(spec.events, (event) => event.id, `${spec.id} event IDs`);
  uniqueBy(spec.invariants, (invariant) => invariant.id, `${spec.id} invariant IDs`);
  uniqueBy(spec.traces, (trace) => trace.id, `${spec.id} trace IDs`);
  uniqueBy(spec.faultCases, (fault) => fault.id, `${spec.id} fault-case IDs`);
  uniqueBy(spec.transitions, transitionKey, `${spec.id} transition keys`);

  const stateIds = new Set(spec.states.map((state) => state.id));
  const eventIds = new Set(spec.events.map((event) => event.id));
  assert.ok(stateIds.has(spec.initialState), `${spec.id} initial state must exist`);

  for (const item of spec.transitions) {
    assert.ok(stateIds.has(item.source), `${item.source} must exist`);
    assert.ok(eventIds.has(item.event), `${item.event} must exist`);
    assert.ok(spec.authority.adrRefs.includes(item.adrRef));

    if (item.disposition === "accepted") {
      assert.equal(item.authorityMutation, true);
      assert.ok(stateIds.has(item.target), `${item.target} must exist`);
    } else {
      assert.equal(item.authorityMutation, false);
      assert.equal(item.target, null);
    }
  }

  for (const state of spec.states.filter((candidate) => candidate.terminal)) {
    const outgoingMutation = spec.transitions.find(
      (item) => item.source === state.id && item.disposition === "accepted",
    );
    assert.equal(
      outgoingMutation,
      undefined,
      `${state.id} must have no accepted outgoing mutation`,
    );
  }

  for (const trace of spec.traces) {
    for (const step of trace.steps) {
      assert.ok(
        eventIds.has(step.event),
        `${spec.id} trace ${trace.id} event ${step.event} must be declared`,
      );
      assert.ok(
        stateIds.has(step.expectedState),
        `${spec.id} trace ${trace.id} state ${step.expectedState} must exist`,
      );
    }

    const actual = runEventSequence(
      spec,
      trace.steps.map((step) => step.event),
    );
    assert.equal(
      actual.value,
      trace.steps.at(-1).expectedState,
      `${spec.id} trace ${trace.id} final state`,
    );

    for (let index = 0; index < trace.steps.length; index += 1) {
      const prefix = trace.steps.slice(0, index + 1);
      const snapshot = runEventSequence(
        spec,
        prefix.map((step) => step.event),
      );
      assert.equal(
        snapshot.value,
        prefix.at(-1).expectedState,
        `${spec.id} trace ${trace.id} step ${index + 1}`,
      );
    }
  }

  for (const fault of spec.faultCases) {
    assert.ok(
      stateIds.has(fault.source),
      `${spec.id} fault ${fault.id} source must exist`,
    );
    assert.ok(
      eventIds.has(fault.event),
      `${spec.id} fault ${fault.id} event ${fault.event} must be declared`,
    );
    assert.ok(
      stateIds.has(fault.expectedState),
      `${spec.id} fault ${fault.id} expected state must exist`,
    );
    const item = transitionFor(spec, fault.source, fault.event);
    assert.ok(
      item,
      `${spec.id} fault ${fault.id} must reference an explicit transition`,
    );
    assert.equal(item.disposition, fault.expectedDisposition);
    assert.equal(fault.expectedState, fault.source);
  }

  for (const invariant of spec.invariants) {
    for (const adrRef of invariant.adrRefs) {
      assert.ok(
        spec.authority.adrRefs.includes(adrRef),
        `${spec.id} invariant ${invariant.id} ADR ${adrRef} must be authoritative`,
      );
    }
  }
};

const assertRunAuthoritySemantics = (spec) => {
  assert.deepEqual(spec.authority.adrRefs, ["ADR-0079"]);
  assert.equal(
    spec.axes.find((axis) => axis.id === "run-authority-state")?.modeled,
    true,
  );
  assert.equal(
    spec.axes.filter((axis) => axis.modeled).length,
    1,
    "Only RunAuthorityState is modeled",
  );

  assertTransition(
    spec,
    "active-generation-1-basis-a",
    "EXPLICIT_REAUTHORIZATION",
    "rejected",
  );
  assertTransition(
    spec,
    "active-generation-1-basis-a",
    "VERIFIED_REVOCATION",
    "accepted",
    "suspended-generation-2",
  );
  assertTransition(
    spec,
    "active-generation-1-basis-a",
    "AUTHORITY_EXPIRED",
    "accepted",
    "suspended-generation-2",
  );
  assertTransition(
    spec,
    "suspended-generation-2",
    "EXPLICIT_REAUTHORIZATION",
    "accepted",
    "active-generation-3-basis-b",
  );
  assertTransition(
    spec,
    "suspended-generation-2",
    "REOPEN_CUT_PREDECESSOR",
    "rejected",
  );

  const stateById = new Map(spec.states.map((state) => [state.id, state]));
  const acceptedTransitions = spec.transitions.filter(
    (transition) => transition.disposition === "accepted",
  );
  for (const item of acceptedTransitions) {
    const sourceGeneration = stateById.get(item.source).coordinates[
      "run-authority-generation"
    ];
    const targetGeneration = stateById.get(item.target).coordinates[
      "run-authority-generation"
    ];
    assert.ok(
      targetGeneration >= sourceGeneration,
      "Run authority generation cannot decrease",
    );
  }

  const generationAdvancingEvents = new Set([
    "VERIFIED_REVOCATION",
    "AUTHORITY_EXPIRED",
    "EXPLICIT_REAUTHORIZATION",
  ]);
  for (const item of acceptedTransitions.filter((transition) =>
    generationAdvancingEvents.has(transition.event),
  )) {
    const sourceGeneration = stateById.get(item.source).coordinates[
      "run-authority-generation"
    ];
    const targetGeneration = stateById.get(item.target).coordinates[
      "run-authority-generation"
    ];
    assert.equal(
      targetGeneration,
      sourceGeneration + 1,
      `${item.event} must advance Run authority generation exactly once`,
    );
  }

  for (const item of spec.transitions.filter((transition) => {
    const event = spec.events.find((candidate) => candidate.id === transition.event);
    return event.category === "opaque-evidence" || event.category === "stale-command";
  })) {
    assert.notEqual(item.disposition, "accepted");
    assert.equal(item.authorityMutation, false);
  }
};

const assertProjectSemantics = (spec) => {
  assert.deepEqual(spec.authority.adrRefs, ["ADR-0080", "ADR-0079"]);
  assert.equal(
    spec.axes.find((axis) => axis.id === "project-identity-lifecycle")?.modeled,
    true,
  );
  assert.equal(
    spec.axes.filter((axis) => axis.modeled).length,
    1,
    "Only Project identity lifecycle is modeled",
  );
  assert.deepEqual(
    spec.states.map((state) => state.coordinates["project-identity-lifecycle"]),
    ["OPEN", "RETIRED"],
  );

  assertTransition(
    spec,
    "open-epoch-1",
    "COMMIT_RETIREMENT",
    "accepted",
    "retired-epoch-2",
  );
  assertTransition(spec, "open-epoch-1", "CANCEL_RETIREMENT", "ignored");
  assertTransition(spec, "retired-epoch-2", "REOPEN_PROJECT", "rejected");
  assertTransition(
    spec,
    "retired-epoch-2",
    "FRESH_EXTERNAL_AUTHORIZATION",
    "rejected",
  );

  const accepted = spec.transitions.filter(
    (transition) => transition.disposition === "accepted",
  );
  assert.deepEqual(
    accepted.map(({ source, event, target }) => ({ source, event, target })),
    [
      {
        source: "open-epoch-1",
        event: "COMMIT_RETIREMENT",
        target: "retired-epoch-2",
      },
    ],
  );

  const open = spec.states.find((state) => state.id === "open-epoch-1");
  const retired = spec.states.find((state) => state.id === "retired-epoch-2");
  assert.ok(retired.coordinates["deletion-epoch"] > open.coordinates["deletion-epoch"]);

  for (const item of spec.transitions.filter((transition) => {
    const event = spec.events.find((candidate) => candidate.id === transition.event);
    return event.category === "opaque-evidence" || event.category === "stale-command";
  })) {
    assert.notEqual(item.disposition, "accepted");
    assert.equal(item.authorityMutation, false);
  }
};

export const createSchemaValidator = (schema) => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(schema);
};

export const assertSchemaValid = (validate, spec) => {
  assert.equal(
    validate(spec),
    true,
    `${spec.id ?? "unknown spec"} schema errors: ${JSON.stringify(validate.errors)}`,
  );
};

export const assertOwnedSemantics = (spec) => {
  assertGenericSemantics(spec);

  if (spec.id === "orchestrator.run-authority-state") {
    assertRunAuthoritySemantics(spec);
    return;
  }

  if (spec.id === "orchestrator.orchestration-project-lifecycle") {
    assertProjectSemantics(spec);
    return;
  }

  assert.fail(`Unknown executable-spec authority: ${spec.id}`);
};
