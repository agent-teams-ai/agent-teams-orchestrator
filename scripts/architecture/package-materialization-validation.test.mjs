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
    ["OD-021", { metadata: { status, type: "open-decision" } }],
    ["OD-035", { metadata: { status, type: "open-decision" } }],
    [
      "OD-040",
      {
        metadata: {
          resolved_by: "ADR-0099",
          status,
          type: "open-decision",
        },
      },
    ],
    ["ADR-0093", { metadata: { status: "accepted", type: "adr" } }],
    ["ADR-0099", { metadata: { status: "accepted", type: "adr" } }],
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
  assert.match(errors.join("\n"), /requires an accepted materialization ADR/u);
});

test("rejects a non-OD materialization gate", () => {
  const entry = {
    package_id: "context.work-coordination",
    state: "deferred",
    blocked_by: ["architecture.overview"],
    decision: null,
  };
  const invalidDocuments = new Map([
    [
      "architecture.overview",
      { metadata: { status: "proposed", type: "architecture" } },
    ],
  ]);
  const errors = [];
  validateMaterializationGates(entry, invalidDocuments, errors);
  assert.match(errors.join("\n"), /must reference an open decision/u);
});

test("rejects an accepted non-ADR materialization decision", () => {
  const entry = {
    package_id: "context.work-coordination",
    state: "allowed",
    blocked_by: ["OD-999"],
    decision: "architecture.overview",
  };
  const invalidDocuments = new Map([
    ["OD-999", { metadata: { status: "resolved", type: "open-decision" } }],
    [
      "architecture.overview",
      { metadata: { status: "accepted", type: "architecture" } },
    ],
  ]);
  const errors = [];
  validateMaterializationGates(entry, invalidDocuments, errors);
  assert.match(errors.join("\n"), /requires an accepted materialization ADR/u);
});

test("admits materialization after every gate and the deciding ADR agree", () => {
  const entry = localEntry();
  entry.state = "allowed";
  entry.decision = "ADR-0099";
  const errors = [];
  validateMaterializationGates(entry, documents("resolved"), errors);
  assert.deepEqual(errors, []);
});
