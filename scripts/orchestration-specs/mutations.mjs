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
    id: "keep-equal-generation-on-reauthorization",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      const successor = mutated.states.find(
        (state) => state.id === "active-generation-3-basis-b",
      );
      successor.coordinates["run-authority-generation"] = 2;
      return mutated;
    },
  },
  {
    id: "remove-authority-expiry-transition",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      mutated.transitions = mutated.transitions.filter(
        (transition) =>
          !(
            transition.source === "active-generation-1-basis-a" &&
            transition.event === "AUTHORITY_EXPIRED"
          ),
      );
      return mutated;
    },
  },
  {
    id: "use-undeclared-trace-event",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      mutated.traces[0].steps[0].event = "UNDECLARED_TRACE_EVENT";
      return mutated;
    },
  },
  {
    id: "use-undeclared-fault-event",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      mutated.faultCases[0].event = "UNDECLARED_FAULT_EVENT";
      return mutated;
    },
  },
  {
    id: "use-non-authoritative-invariant-adr",
    specId: "orchestrator.run-authority-state",
    apply(spec) {
      const mutated = clone(spec);
      mutated.invariants[0].adrRefs = ["ADR-9999"];
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
