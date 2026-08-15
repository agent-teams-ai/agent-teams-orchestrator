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

async function readJson(repositoryPath) {
  return JSON.parse(await readFile(path.join(repositoryRoot, repositoryPath), "utf8"));
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
  const owners = Object.keys((await readYaml("docs/owners.yaml")).owners).toSorted(
    (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)),
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
  for (const artifact of Object.values(artifacts)) {
    assert.deepEqual(
      artifact.allowedOwnerIds.toSorted((left, right) =>
        Buffer.compare(Buffer.from(left), Buffer.from(right)),
      ),
      owners,
      `${artifact.type} must preserve the registered-owner authoring boundary`,
    );
  }
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

test("routes the canonical protocol commands without weakening repository documentation gates", async () => {
  const { scripts } = await readJson("package.json");

  assert.equal(scripts["docs:repository:check"], "pnpm run docs:protocol:check");
  assert.deepEqual(scripts["docs:protocol:check"].split(" && "), [
    "pnpm run docs:check",
    "pnpm run docs:validate",
    "pnpm run docs:test",
    "pnpm run skills:check",
    "pnpm run architecture:model:check",
    "pnpm run docs:lint",
    "pnpm run docs:prose",
    "pnpm run docs:impact",
  ]);
  assert.match(scripts["docs:prose"], /docs:vale.*docs:spell/u);
  assert.match(scripts["docs:test"], /docs-protocol-parity\.test\.mjs/u);
  for (const command of ["check", "doctor", "find", "info", "new", "recover"]) {
    assert.equal(
      scripts[`docs:${command}`],
      `agent-teams-docs ${command} --consumer . --profile architecture/foundation/docs-protocol.yaml`,
    );
  }
  for (const removed of [
    "docs:foundation:doctor",
    "docs:foundation:find",
    "docs:foundation:new",
    "docs:foundation:recover",
    "docs:protocol:parity",
    "docs:query",
    "docs:query:shadow",
  ]) {
    assert.equal(scripts[removed], undefined);
  }
});
