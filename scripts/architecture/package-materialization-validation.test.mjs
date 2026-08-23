import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMaterializationGates,
  validatePackageMaterializationPolicy,
  validateRequiredMaterializationEntries,
} from "./package-materialization-validation.mjs";

const exactGates = ["OD-021", "OD-035", "OD-040"];

function documents(status = "open") {
  return new Map([
    ["OD-021", { metadata: { status } }],
    ["OD-035", { metadata: { status } }],
    ["OD-040", { metadata: { resolved_by: "ADR-0099", status } }],
    ["ADR-0093", { metadata: { status: "accepted" } }],
    ["ADR-0099", { metadata: { status: "accepted" } }],
  ]);
}

function localEntry() {
  return {
    package_id: "app.local-supervisor",
    state: "deferred",
    blocked_by: exactGates,
    decision: null,
  };
}

test("accepts the exact deferred Fully Local materialization gate set", () => {
  const errors = [];
  validateMaterializationGates(localEntry(), documents(), errors);
  assert.deepEqual(errors, []);
});

test("rejects deleting a required Fully Local reservation", () => {
  const errors = [];
  validateRequiredMaterializationEntries(
    [
      { package_id: "app.orchestrator-local" },
      { package_id: "sdk.orchestrator-local-host" },
    ],
    documents(),
    errors,
  );
  assert.match(errors.join("\n"), /app\.local-supervisor is missing/u);
});

test("rejects a materialization policy entry without a catalog package", () => {
  const errors = [];
  validatePackageMaterializationPolicy(
    { entries: [localEntry()] },
    [],
    new Map(),
    errors,
  );
  assert.match(errors.join("\n"), /unknown package_id app\.local-supervisor/u);
});

test("rejects deleting OD-040 from a reserved local package", () => {
  const entry = localEntry();
  entry.blocked_by = ["OD-021", "OD-035"];
  const errors = [];
  validateMaterializationGates(entry, documents(), errors);
  assert.match(errors.join("\n"), /must retain the accepted Fully Local/u);
});

test("requires the accepted decision that resolves OD-040", () => {
  const entry = localEntry();
  entry.state = "allowed";
  entry.decision = "ADR-0093";
  const errors = [];
  validateMaterializationGates(entry, documents("resolved"), errors);
  assert.match(errors.join("\n"), /materialization decision must resolve OD-040/u);
});

test("rejects allowed materialization while a gate remains unresolved", () => {
  const entry = localEntry();
  entry.state = "allowed";
  entry.decision = "ADR-0099";
  const errors = [];
  validateMaterializationGates(entry, documents(), errors);
  assert.match(errors.join("\n"), /while a gate is unresolved/u);
});

test("rejects allowed materialization without an accepted decision", () => {
  const entry = localEntry();
  entry.state = "allowed";
  const errors = [];
  validateMaterializationGates(entry, documents("resolved"), errors);
  assert.match(errors.join("\n"), /requires an accepted materialization decision/u);
});

test("admits materialization after every gate and the deciding ADR agree", () => {
  const entry = localEntry();
  entry.state = "allowed";
  entry.decision = "ADR-0099";
  const errors = [];
  validateMaterializationGates(entry, documents("resolved"), errors);
  assert.deepEqual(errors, []);
});
