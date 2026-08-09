import { acceptedOwnerStatuses } from "./package-catalog-lib.mjs";

const unresolvedDecisionStatuses = new Set(["deferred", "open", "proposed"]);
const requiredLocalMaterializationGates = new Map([
  ["app.local-supervisor", ["OD-021", "OD-035", "OD-040"]],
  ["app.orchestrator-local", ["OD-021", "OD-035", "OD-040"]],
  ["sdk.orchestrator-local-host", ["OD-021", "OD-035", "OD-040"]],
]);

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.toSorted().every((value, index) => value === expected[index])
  );
}

export function validateMaterializationGates(entry, documents, errors) {
  const requiredGates = requiredLocalMaterializationGates.get(entry.id);
  if (
    requiredGates &&
    !sameMembers(entry.materialization_blocked_by ?? [], requiredGates)
  ) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} must retain the accepted Fully Local materialization gate set`,
    );
  }
  let unresolvedGateCount = 0;
  for (const gateId of entry.materialization_blocked_by ?? []) {
    const gate = documents.get(gateId);
    if (!gate) {
      errors.push(
        `architecture/package-catalog.yaml: ${entry.id} references unknown materialization gate ${gateId}`,
      );
    } else if (unresolvedDecisionStatuses.has(gate.metadata.status)) {
      unresolvedGateCount += 1;
    }
  }

  if (entry.materialization === "allowed" && unresolvedGateCount > 0) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} cannot allow materialization while a gate is unresolved`,
    );
  }
  if (entry.materialization === "deferred" && unresolvedGateCount === 0) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} is deferred without an unresolved materialization gate`,
    );
  }
  if (
    entry.materialization === "deferred" &&
    entry.materialization_decision
  ) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} cannot record a materialization decision while deferred`,
    );
  }
  if (entry.materialization !== "allowed") {
    return;
  }

  const decision = documents.get(entry.materialization_decision);
  if (!decision || !acceptedOwnerStatuses.has(decision.metadata.status)) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} requires an accepted materialization decision`,
    );
  }
  const explicitGate = documents.get("OD-040");
  if (
    requiredGates &&
    explicitGate?.metadata.resolved_by !== entry.materialization_decision
  ) {
    errors.push(
      `architecture/package-catalog.yaml: ${entry.id} materialization decision must resolve OD-040`,
    );
  }
}
