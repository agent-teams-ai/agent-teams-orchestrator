const quote = (value) => value.replaceAll('"', "'");
const aliasFor = (modelIndex, stateId) =>
  `model_${modelIndex}_state_${stateId.replaceAll("-", "_")}`;

const classifiedEvents = (spec, stateId, disposition) =>
  spec.transitions
    .filter(
      (transition) =>
        transition.source === stateId && transition.disposition === disposition,
    )
    .map((transition) => transition.event)
    .sort();

const renderModel = (spec, modelIndex) => {
  const lines = [
    `    state "${quote(spec.title)} (independent)" as model_${modelIndex} {`,
    `        [*] --> ${aliasFor(modelIndex, spec.initialState)}`,
  ];

  for (const state of spec.states) {
    lines.push(
      `        state "${quote(state.label)}" as ${aliasFor(modelIndex, state.id)}`,
    );
  }

  for (const item of spec.transitions.filter(
    (transition) => transition.disposition === "accepted",
  )) {
    lines.push(
      `        ${aliasFor(modelIndex, item.source)} --> ${aliasFor(modelIndex, item.target)}: ${item.event}`,
    );
  }

  for (const state of spec.states) {
    const ignored = classifiedEvents(spec, state.id, "ignored");
    const rejected = classifiedEvents(spec, state.id, "rejected");
    const notes = [];
    if (ignored.length > 0) {
      notes.push(`Ignored: ${ignored.join(", ")}`);
    }
    if (rejected.length > 0) {
      notes.push(`Rejected: ${rejected.join(", ")}`);
    }
    if (notes.length === 0) {
      continue;
    }

    lines.push(`        note right of ${aliasFor(modelIndex, state.id)}`);
    for (const note of notes) {
      lines.push(`            ${note}`);
    }
    lines.push("        end note");
  }

  lines.push("    }");
  return lines;
};

export const renderCombinedMermaid = (specs) =>
  `${[
    "%% Derived from independent accepted authority submodels.",
    "%% This diagram is not a cross-product or a production runtime machine.",
    "stateDiagram-v2",
    ...specs.flatMap(renderModel),
  ].join("\n")}\n`;
