const transitionConfiguration = (spec, stateId) => {
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

export const deriveStateModel = (spec) => ({
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
        on: transitionConfiguration(spec, state.id),
      },
    ]),
  ),
});

export const deriveIndependentStateModels = (specs) =>
  specs.map(deriveStateModel);
