const clone = (value) => structuredClone(value);

const findTransition = (spec, source, event) =>
  spec.transitions.find(
    (transition) => transition.source === source && transition.event === event,
  );

const acceptAs = (transition, target) => {
  transition.disposition = "accepted";
  transition.target = target;
  transition.authorityMutation = true;
};

export const semanticMutations = [
  {
    id: "allow-direct-active-replacement",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(
          mutated,
          "active-generation-1-basis-a",
          "EXPLICIT_REAUTHORIZATION",
        ),
        "active-generation-3-basis-b",
      );
      return mutated;
    },
  },
  {
    id: "let-runtime-evidence-grant-run-authority",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(
          mutated,
          "suspended-generation-2",
          "LATE_OPAQUE_AR_EVIDENCE",
        ),
        "active-generation-3-basis-b",
      );
      return mutated;
    },
  },
  {
    id: "let-stale-generation-bypass-suspension",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(
          mutated,
          "suspended-generation-2",
          "STALE_GENERATION_COMMAND",
        ),
        "active-generation-3-basis-b",
      );
      return mutated;
    },
  },
  {
    id: "make-run-generation-decrease",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      findTransition(
        mutated,
        "suspended-generation-2",
        "BUSINESS_CANCEL",
      ).target = "cancelled-generation-1";
      return mutated;
    },
  },
  {
    id: "allow-project-reopen",
    specId: "orchestrator.orchestration-project-lifecycle",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(mutated, "retired-epoch-2", "REOPEN_PROJECT"),
        "open-epoch-1",
      );
      return mutated;
    },
  },
  {
    id: "let-runtime-evidence-reopen-project",
    specId: "orchestrator.orchestration-project-lifecycle",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(mutated, "retired-epoch-2", "LATE_OPAQUE_AR_EVIDENCE"),
        "open-epoch-1",
      );
      return mutated;
    },
  },
  {
    id: "turn-retirement-cancel-into-identity-state-change",
    specId: "orchestrator.orchestration-project-lifecycle",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(mutated, "open-epoch-1", "CANCEL_RETIREMENT"),
        "retired-epoch-2",
      );
      return mutated;
    },
  },
  {
    id: "let-stale-epoch-retire-project",
    specId: "orchestrator.orchestration-project-lifecycle",
    apply(spec) {
      const mutated = clone(spec);
      acceptAs(
        findTransition(
          mutated,
          "open-epoch-1",
          "STALE_DELETION_EPOCH_COMMAND",
        ),
        "retired-epoch-2",
      );
      return mutated;
    },
  },
];
