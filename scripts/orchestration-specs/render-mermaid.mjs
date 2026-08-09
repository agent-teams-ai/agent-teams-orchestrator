const quote = (value) => value.replaceAll('"', "'");
const aliasFor = (stateId) => `state_${stateId.replaceAll("-", "_")}`;

const classifiedEvents = (spec, stateId, disposition) =>
  spec.transitions
    .filter(
      (transition) =>
        transition.source === stateId && transition.disposition === disposition,
    )
    .map((transition) => transition.event)
    .sort();

export const renderMermaid = (spec) => {
  const lines = [
    `%% Generated from ${spec.id}; edit the JSON spec, not this file.`,
    "stateDiagram-v2",
    `    [*] --> ${aliasFor(spec.initialState)}`,
  ];

  for (const state of spec.states) {
    lines.push(`    state "${quote(state.label)}" as ${aliasFor(state.id)}`);
  }

  for (const item of spec.transitions.filter(
    (transition) => transition.disposition === "accepted",
  )) {
    lines.push(
      `    ${aliasFor(item.source)} --> ${aliasFor(item.target)}: ${item.event}`,
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

    lines.push(`    note right of ${aliasFor(state.id)}`);
    for (const note of notes) {
      lines.push(`        ${note}`);
    }
    lines.push("    end note");
  }

  return `${lines.join("\n")}\n`;
};
