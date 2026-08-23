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

function countUnresolvedMaterializationGates(entry, documents, errors) {
  let unresolvedGateCount = 0;
  for (const gateId of entry.blocked_by ?? []) {
    const gate = documents.get(gateId);
    if (!gate) {
      errors.push(
        `architecture/package-materialization-policy.yaml: ${entry.package_id} references unknown materialization gate ${gateId}`,
      );
    } else if (gate.metadata.type !== "open-decision") {
      errors.push(
        `architecture/package-materialization-policy.yaml: ${entry.package_id} materialization gate ${gateId} must reference an open decision`,
      );
    } else if (unresolvedDecisionStatuses.has(gate.metadata.status)) {
      unresolvedGateCount += 1;
    }
  }
  return unresolvedGateCount;
}

export function validateRequiredMaterializationEntries(
  entries,
  documents,
  errors,
) {
  if (!documents.has("ADR-0093")) {
    return;
  }
  const entryIds = new Set(entries.map((entry) => entry.package_id));
  for (const requiredId of requiredLocalMaterializationGates.keys()) {
    if (!entryIds.has(requiredId)) {
      errors.push(
        `architecture/package-materialization-policy.yaml: required Fully Local reservation ${requiredId} is missing`,
      );
    }
  }
}

export function validateMaterializationGates(entry, documents, errors) {
  const requiredGates = requiredLocalMaterializationGates.get(entry.package_id);
  if (requiredGates && !sameMembers(entry.blocked_by ?? [], requiredGates)) {
    errors.push(
      `architecture/package-materialization-policy.yaml: ${entry.package_id} must retain the accepted Fully Local materialization gate set`,
    );
  }
  const unresolvedGateCount = countUnresolvedMaterializationGates(
    entry,
    documents,
    errors,
  );

  if (entry.state === "allowed" && unresolvedGateCount > 0) {
    errors.push(
      `architecture/package-materialization-policy.yaml: ${entry.package_id} cannot allow materialization while a gate is unresolved`,
    );
  }
  if (entry.state === "deferred" && unresolvedGateCount === 0) {
    errors.push(
      `architecture/package-materialization-policy.yaml: ${entry.package_id} is deferred without an unresolved materialization gate`,
    );
  }
  if (entry.state === "deferred" && entry.decision) {
    errors.push(
      `architecture/package-materialization-policy.yaml: ${entry.package_id} cannot record a materialization decision while deferred`,
    );
  }
  if (entry.state !== "allowed") {
    return;
  }

  const decision = documents.get(entry.decision);
  if (
    !decision ||
    decision.metadata.type !== "adr" ||
    !acceptedOwnerStatuses.has(decision.metadata.status)
  ) {
    errors.push(
      `architecture/package-materialization-policy.yaml: ${entry.package_id} requires an accepted materialization ADR`,
    );
  }
  const explicitGate = documents.get("OD-040");
  if (requiredGates && explicitGate?.metadata.resolved_by !== entry.decision) {
    errors.push(
      `architecture/package-materialization-policy.yaml: ${entry.package_id} materialization decision must resolve OD-040`,
    );
  }
}

export function validatePackageMaterializationPolicy(
  policy,
  catalogEntries,
  documents,
  errors,
) {
  const catalogIds = new Set(catalogEntries.map((entry) => entry.id));
  const entriesByPackageId = new Map();

  validateRequiredMaterializationEntries(policy.entries, documents, errors);
  for (const entry of policy.entries) {
    if (entriesByPackageId.has(entry.package_id)) {
      errors.push(
        `architecture/package-materialization-policy.yaml: duplicate package_id ${entry.package_id}`,
      );
      continue;
    }
    entriesByPackageId.set(entry.package_id, entry);
    if (!catalogIds.has(entry.package_id)) {
      errors.push(
        `architecture/package-materialization-policy.yaml: unknown package_id ${entry.package_id}`,
      );
    }
    validateMaterializationGates(entry, documents, errors);
  }

  return entriesByPackageId;
}
