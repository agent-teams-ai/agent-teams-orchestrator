import { createMachine, initialTransition, transition } from "xstate";

import { deriveStateModel } from "./state-model.mjs";

export const deriveMachine = (spec) =>
  createMachine(deriveStateModel(spec));

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
