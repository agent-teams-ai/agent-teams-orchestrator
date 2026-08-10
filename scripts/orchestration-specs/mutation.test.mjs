import assert from "node:assert/strict";
import test from "node:test";

import { loadSpecs } from "./load-specs.mjs";
import {
  assertCutPredecessorProperty,
  assertProjectEpochProperty,
} from "./independent-properties.mjs";
import { semanticMutations } from "./mutations.mjs";
import { assertOwnedSemantics } from "./validate-specs.mjs";

const specsById = new Map(loadSpecs().map((spec) => [spec.id, spec]));

test("semantic mutation pack is killed by the owned invariant validator", () => {
  for (const mutation of semanticMutations) {
    const source = specsById.get(mutation.specId);
    const mutant = mutation.apply(source);
    assert.notDeepEqual(mutant, source, `${mutation.id} must materially mutate data`);
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

test("state coordinates are closed over modeled axes and declared values", () => {
  const mutationIds = new Set([
    "add-unmodeled-state-coordinate",
    "remove-modeled-state-coordinate",
    "use-undeclared-coordinate-value",
  ]);

  for (const mutation of semanticMutations.filter((candidate) =>
    mutationIds.has(candidate.id),
  )) {
    const source = specsById.get(mutation.specId);
    const mutant = mutation.apply(source);
    assert.throws(() => assertOwnedSemantics(mutant), undefined, mutation.id);
  }
});

test("behavioral property oracles independently kill epoch and predecessor mutants", () => {
  const propertiesByMutation = new Map([
    ["keep-project-deletion-epoch-equal", assertProjectEpochProperty],
    ["reopen-cut-predecessor-authority", assertCutPredecessorProperty],
  ]);

  for (const [mutationId, assertProperty] of propertiesByMutation) {
    const mutation = semanticMutations.find((candidate) => candidate.id === mutationId);
    const mutant = mutation.apply(specsById.get(mutation.specId));
    assert.throws(() => assertProperty(mutant), undefined, mutationId);
  }
});
