import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  evaluateThreatScenario,
  validateClassificationSemantics,
  validateSecurityFoundation,
} from "./validate-security-architecture.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const fixturesRoot = path.join(scriptDirectory, "fixtures");

async function readJson(name) {
  return JSON.parse(await readFile(path.join(fixturesRoot, name), "utf8"));
}

test("accepts the canonical security foundation fixtures", async () => {
  const result = await validateSecurityFoundation(repositoryRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.fixtureAssets, 5);
  assert.equal(result.materializedAssets, 0);
  assert.equal(result.materializedManifests, 0);
  assert.equal(result.threatScenarios, 15);
});

test("discovers and validates feature-local security manifests", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-teams-security-test-"));
  try {
    await mkdir(path.join(root, "architecture"), { recursive: true });
    await mkdir(path.join(root, "scripts/security"), { recursive: true });
    await mkdir(path.join(root, "docs"), { recursive: true });
    await cp(
      path.join(repositoryRoot, "architecture/security"),
      path.join(root, "architecture/security"),
      { recursive: true },
    );
    await cp(
      path.join(repositoryRoot, "scripts/security/fixtures"),
      path.join(root, "scripts/security/fixtures"),
      { recursive: true },
    );
    await cp(
      path.join(repositoryRoot, "docs/owners.yaml"),
      path.join(root, "docs/owners.yaml"),
    );

    const featureRoot = path.join(
      root,
      "packages/contexts/run-orchestration/src/features/run-control",
    );
    await mkdir(featureRoot, { recursive: true });
    await writeFile(
      path.join(featureRoot, "security.manifest.json"),
      JSON.stringify(
        {
          assets: [
            {
              classification: "internal",
              containsAuthorityEvidence: false,
              containsUserContent: false,
              exportPolicy: "restricted",
              id: "run-orchestration.control-result",
              redactionProfile: "standard",
              retentionClass: "durable",
              surface: "public-contract",
              tenantScope: "project",
            },
          ],
          owner: "run-orchestration",
          schemaVersion: 1,
        },
        null,
        2,
      ),
    );

    const result = await validateSecurityFoundation(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.materializedAssets, 1);
    assert.equal(result.materializedManifests, 1);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("every positive threat fixture is allowed", async () => {
  const scenarios = await readJson("threats.allowed.json");
  for (const scenario of scenarios) {
    assert.deepEqual(evaluateThreatScenario(scenario), scenario.expected);
  }
});

test("every negative threat fixture is rejected by exact rule ids", async () => {
  const scenarios = await readJson("threats.denied.json");
  for (const scenario of scenarios) {
    assert.deepEqual(evaluateThreatScenario(scenario), {
      decision: scenario.expected.decision,
      ruleIds: [...scenario.expected.ruleIds].toSorted(),
    });
  }
});

test("rejects protected telemetry with unrestricted export", async () => {
  const fixture = await readJson("data-classification.invalid.json");
  const ruleIds = validateClassificationSemantics(fixture.manifest)
    .map((error) => error.slice(0, error.indexOf(" ")))
    .toSorted();
  assert.deepEqual(ruleIds, [...fixture.expectedRuleIds].toSorted());
});
