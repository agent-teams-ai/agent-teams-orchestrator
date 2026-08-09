import { createMachine, initialTransition, transition } from "xstate";

const transitionConfig = (spec, stateId) => {
  const on = {};

  for (const item of spec.transitions) {
    if (item.source !== stateId || item.disposition === "rejected") {
      continue;
    }

    on[item.event] =
      item.disposition === "accepted" ? { target: item.target } : {};
  }

  return on;
};

export const deriveMachine = (spec) =>
  createMachine({
    id: spec.id,
    initial: spec.initialState,
    states: Object.fromEntries(
      spec.states.map((state) => [
        state.id,
        {
          meta: {
            coordinates: state.coordinates,
            terminal: state.terminal,
          },
          on: transitionConfig(spec, state.id),
        },
      ]),
    ),
  });

export const initialSnapshot = (machine) => initialTransition(machine)[0];

export const applyMachineEvent = (machine, snapshot, event) =>
  transition(machine, snapshot, { type: event })[0];

export const runEventSequence = (spec, events) => {
  const machine = deriveMachine(spec);
  let snapshot = initialSnapshot(machine);

  for (const event of events) {
    snapshot = applyMachineEvent(machine, snapshot, event);
  }

  return snapshot;
};
