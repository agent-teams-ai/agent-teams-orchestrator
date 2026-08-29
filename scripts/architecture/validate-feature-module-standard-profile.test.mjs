import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AGENT_INSTRUCTIONS_PATH,
  PROFILE_DOCUMENT_PATH,
  PROFILE_PATH,
  validateFeatureModuleStandardProfile,
} from "./validate-feature-module-standard-profile.mjs";

const profile = JSON.parse(await readFile(PROFILE_PATH, "utf8"));
const document = await readFile(PROFILE_DOCUMENT_PATH, "utf8");
const agentInstructions = await readFile(AGENT_INSTRUCTIONS_PATH, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const clone = (value) => structuredClone(value);

function validate(overrides = {}) {
  return validateFeatureModuleStandardProfile({
    profile,
    document,
    agentInstructions,
    packageJson,
    ...overrides,
  });
}

test("accepts the checked-in Orchestrator adoption profile", () => {
  assert.doesNotThrow(() => validate());
});

test("rejects central identity or digest drift", () => {
  for (const [key, value] of [
    ["version", "v2"],
    ["repository", "agent-teams-ai/other"],
    ["sha256", "0".repeat(64)],
  ]) {
    const changed = clone(profile);
    changed.standard[key] = value;
    assert.throws(() => validate({ profile: changed }), /Standard binding does not match/u);
  }
});

test("rejects silent scope, authority, and enforcement drift", () => {
  const changedScope = clone(profile);
  changedScope.adoption.scope.production_roots.pop();
  assert.throws(() => validate({ profile: changedScope }), /Production roots does not match/u);

  const missingAuthority = clone(profile);
  missingAuthority.adoption.extensions[0].authority = "docs/architecture/overview.md";
  assert.throws(() => validate({ profile: missingAuthority }), /Adoption extensions/u);

  const missingGate = clone(profile);
  missingGate.adoption.enforcement.pop();
  assert.throws(() => validate({ profile: missingGate }), /Adoption enforcement/u);

  const missingCommand = clone(packageJson);
  delete missingCommand.scripts["architecture:conformance"];
  assert.throws(
    () => validate({ packageJson: missingCommand }),
    /missing from package.json/u,
  );

  const missingArchitectureGate = clone(packageJson);
  missingArchitectureGate.scripts["architecture:check"] =
    missingArchitectureGate.scripts["architecture:check"].replace(
      " && pnpm run architecture:conformance",
      "",
    );
  assert.throws(
    () => validate({ packageJson: missingArchitectureGate }),
    /architecture:check must include architecture:conformance/u,
  );
});

test("requires explicit, owned deviation records", () => {
  const changed = clone(profile);
  changed.adoption.deviations.push({
    clause: "universal-feature-ownership",
    scope: "packages/example",
    rationale: "",
    owner: "architecture",
    decision: "ADR-0100",
    review_trigger: "second consumer",
  });
  assert.throws(() => validate({ profile: changed }), /Deviation rationale must be non-empty/u);

  changed.adoption.deviations[0].rationale = "Temporary compatibility boundary";
  changed.adoption.deviations[0].decision = "issue-100";
  assert.throws(() => validate({ profile: changed }), /must reference an ADR ID/u);
});

test("binds the human profile to the machine-readable adoption", () => {
  assert.throws(
    () => validate({ document: document.replace("## Adoption", "## Local adoption") }),
    /missing required marker/u,
  );
  assert.throws(
    () => validate({
      agentInstructions: agentInstructions.replace(
        "docs/architecture/feature-module-standard.md",
        "docs/architecture/overview.md",
      ),
    }),
    /Agent instructions are missing/u,
  );
});
