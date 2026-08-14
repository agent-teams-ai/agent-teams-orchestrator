import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");

async function readYaml(repositoryPath) {
  return YAML.parse(await readFile(path.join(repositoryRoot, repositoryPath), "utf8"));
}

test("keeps the protocol profile thin and routes one Foundation v2 authority", async () => {
  const profile = await readYaml("architecture/foundation/docs-protocol.yaml");

  assert.deepEqual(Object.keys(profile).toSorted(), [
    "agentWorkflow",
    "foundationProfile",
    "protocol",
    "schemaVersion",
    "semanticValidatorIds",
  ]);
  assert.deepEqual(profile.protocol, {
    id: "agent-teams.docs-protocol",
    version: 1,
  });
  assert.deepEqual(profile.foundationProfile, {
    path: "architecture/foundation/document-authoring.yaml",
    schemaVersion: 2,
    metadataSidecarPolicy: "foundation-profile-v2-strict-merge",
  });
  assert.equal(
    profile.agentWorkflow.skillPath,
    ".agents/skills/docs-authoring/SKILL.md",
  );
  assert.deepEqual(
    profile.semanticValidatorIds,
    profile.semanticValidatorIds.toSorted((left, right) =>
      Buffer.compare(Buffer.from(left), Buffer.from(right)),
    ),
  );
});

test("declares explicit reachability for every Orchestrator authoring type", async () => {
  const profile = await readYaml(
    "architecture/foundation/document-authoring.yaml",
  );
  const artifacts = Object.fromEntries(
    profile.authoring.artifactTypes.map((artifact) => [artifact.type, artifact]),
  );

  assert.equal(profile.schemaVersion, 2);
  assert.deepEqual(Object.keys(artifacts).toSorted(), [
    "adr",
    "bounded-context",
    "contract",
    "feature",
    "open-decision",
    "runbook",
  ]);
  assert.deepEqual(artifacts.adr.reachability, {
    kind: "manual-fixed-index",
    indexPath: "docs/decisions/README.md",
  });
  assert.deepEqual(artifacts["open-decision"].reachability, {
    kind: "manual-fixed-index",
    indexPath: "docs/open-decisions/README.md",
  });
  assert.deepEqual(artifacts["bounded-context"].reachability, {
    kind: "manual-fixed-index",
    indexPath: "docs/domain/contexts/README.md",
  });
  assert.deepEqual(artifacts.contract.reachability, {
    kind: "manual-fixed-index",
    indexPath: "docs/contracts/README.md",
  });
  assert.deepEqual(artifacts.feature.reachability, {
    kind: "manual-colocated-index",
    pathPrefix: "before-required-segments",
    indexBasename: "README.md",
  });
  assert.deepEqual(artifacts.runbook.reachability, {
    kind: "manual-fixed-index",
    indexPath: "docs/operations/README.md",
  });
});
