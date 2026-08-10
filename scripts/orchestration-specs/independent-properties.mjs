import assert from "node:assert/strict";

export const assertProjectEpochProperty = (spec) => {
  const stateById = new Map(spec.states.map((state) => [state.id, state]));
  const accepted = spec.transitions.filter(
    (transition) => transition.disposition === "accepted",
  );
  assert.equal(accepted.length, 1);
  const [transition] = accepted;
  assert.equal(transition.event, "COMMIT_RETIREMENT");
  assert.equal(transition.source, "open-epoch-1");
  assert.equal(transition.target, "retired-epoch-2");
  assert.ok(
    stateById.get(transition.target).coordinates["deletion-epoch"] >
      stateById.get(transition.source).coordinates["deletion-epoch"],
  );
};

export const assertCutPredecessorProperty = (spec) => {
  const transition = spec.transitions.find(
    (candidate) => candidate.event === "REOPEN_CUT_PREDECESSOR",
  );
  assert.ok(transition);
  assert.equal(transition.source, "suspended-generation-2");
  assert.equal(transition.disposition, "rejected");
  assert.equal(transition.target, null);
  assert.equal(transition.authorityMutation, false);
};
