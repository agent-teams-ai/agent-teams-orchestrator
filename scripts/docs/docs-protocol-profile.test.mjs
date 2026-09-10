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

test("preserves the historical integration until a qualified v2 cohort is supplied", async () => {
  const [integration, qualification] = await Promise.all([
    readJson("architecture/foundation/docs-consumer-integration.json"),
    readJson("architecture/foundation/docs-protocol-qualification.json"),
  ]);

  assert.equal(integration.schemaVersion, 2);
  assert.equal(integration.cohort.schemaVersion, 1);
  assert.deepEqual(integration.qualification, {
    contractPath: "architecture/foundation/docs-protocol-qualification.json",
    gateCommand: "pnpm docs:protocol:check",
  });
  assert.equal(qualification.schemaVersion, 2);
  assert.equal(qualification.scenarios.length, 6);
});

test("retains the historical portable profile separately for old-artifact parity", async () => {
  const historical = await readYaml(
    "scripts/docs/fixtures/profile-migration/docs-protocol-v2.yaml",
  );
  const candidate = await readYaml("architecture/foundation/docs-protocol.yaml");

  assert.equal(historical.schemaVersion, 2);
  assert.equal(historical.agentWorkflow.adoption, undefined);
  assert.deepEqual(candidate, {
    ...historical,
    schemaVersion: 3,
    agentWorkflow: { ...historical.agentWorkflow, adoption: "portable-v1" },
  });
});

test("keeps the portable v3 profile thin and routes one Authoring v3 authority", async () => {
  const profile = await readYaml("architecture/foundation/docs-protocol.yaml");

  assert.deepEqual(Object.keys(profile).toSorted(), [
    "agentWorkflow",
    "foundationProfile",
    "protocol",
    "schemaVersion",
    "semanticValidatorIds",
  ]);
  assert.equal(profile.schemaVersion, 3);
  assert.deepEqual(profile.protocol, {
    id: "agent-teams.docs-protocol",
    version: 1,
  });
  assert.deepEqual(profile.foundationProfile, {
    path: "architecture/foundation/document-authoring.yaml",
    schemaVersion: 3,
    metadataSidecarPolicy: "foundation-profile-v3-strict-merge",
  });
  assert.deepEqual(profile.agentWorkflow, {
    adoption: "portable-v1",
    skillPath: ".agents/skills/docs-authoring/SKILL.md",
  });
  assert.deepEqual(profile.semanticValidatorIds, [
    "orchestrator.architecture.likec4",
    "orchestrator.docs.code-impact",
    "orchestrator.docs.local-links",
    "orchestrator.docs.mermaid",
    "orchestrator.docs.metadata-schema",
    "orchestrator.docs.prose",
    "orchestrator.docs.reachability",
    "orchestrator.docs.relations",
  ]);
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

  assert.equal(profile.schemaVersion, 3);
  assert.equal(profile.authoring.ownerSets.schemaVersion, 1);
  assert.deepEqual(
    profile.authoring.ownerSets.sets["registered-owners"].toSorted(
      (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)),
    ),
    owners,
  );
  assert.deepEqual(Object.keys(artifacts).toSorted(), [
    "adr",
    "bounded-context",
    "contract",
    "feature",
    "open-decision",
    "runbook",
  ]);
  for (const artifact of Object.values(artifacts)) {
    assert.equal(artifact.ownerSetId, "registered-owners");
    assert.equal(artifact.allowedOwnerIds, undefined);
  }
  assert.equal(
    profile.authoring.artifactTypes.filter((artifact) =>
      artifact.ownerSetId === "registered-owners",
    ).length,
    6,
    "all six types must preserve the registered-owner authoring boundary",
  );
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
    indexPath: "docs/README.md",
  });
  assert.deepEqual(artifacts.feature.reachability, {
    kind: "manual-colocated-index",
    pathPrefix: "before-required-segments",
    indexBasename: "README.md",
  });
  assert.deepEqual(artifacts.runbook.reachability, {
    kind: "manual-fixed-index",
    indexPath: "docs/README.md",
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
  for (const command of ["check", "context", "doctor", "find", "info", "new", "recover"]) {
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

test("pins managed direct roots and exact transitive age exceptions without activating history", async () => {
  const { devDependencies } = await readJson("package.json");
  const workspace = await readYaml("pnpm-workspace.yaml");
  const roots = {
    "@agent-teams/docs-protocol": "0.6.0",
    "@agent-teams/docs-protocol-agent-teams": "0.2.4",
    "@agent-teams/engineering-foundation": "1.2.0",
  };
  assert.deepEqual(
    Object.fromEntries(Object.entries(devDependencies).filter(([name]) => name.startsWith("@agent-teams/"))),
    roots,
  );
  assert.equal(workspace.minimumReleaseAge, 1440);
  assert.equal(workspace.minimumReleaseAgeStrict, true);
  assert.deepEqual(
    workspace.minimumReleaseAgeExclude.filter((name) => name.startsWith("@agent-teams/")).toSorted(),
    [
      ...Object.entries(roots).map(([name, version]) => `${name}@${version}`),
      "@agent-teams/document-authoring@0.3.0",
      "@agent-teams/repository-mutation@0.2.0",
    ].toSorted(),
  );
});
