import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "yaml";

const foundationManifestPath = fileURLToPath(
  import.meta.resolve("@agent-teams/engineering-foundation/package.json"),
);
const foundationManifest = JSON.parse(await readFile(foundationManifestPath, "utf8"));
const foundationCli = join(dirname(foundationManifestPath), foundationManifest.bin["agent-teams-foundation"]);
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const configPath = "architecture/foundation/source-dependencies.yaml";
const policy = parse(await readFile(join(repositoryRoot, configPath), "utf8"));

test("live source policy is schema v3 with root package and workspace package roots", () => {
  assert.equal(policy.schemaVersion, 3);
  assert.equal(policy.rootPackage, true);
  assert.equal(Object.hasOwn(policy, "includeRootPackage"), false);
  assert.deepEqual(policy.packageRoots, [
    "packages/platform/local-host-control",
    "tooling/architecture-conformance",
  ]);
});

test("oxlint counterexample fixtures are classified as fixture.lint", () => {
  assert.ok(policy.governedRoots.includes("tooling/lint-fixtures"));
  const fixture = policy.boundaries.find((boundary) => boundary.id === "fixture.lint");
  assert.ok(fixture, "fixture.lint must exist");
  assert.equal(fixture.dependencyMode, "development");
  assert.deepEqual(fixture.roots, ["tooling/lint-fixtures"]);
  assert.deepEqual(fixture.allow.runtimeReferences, ["dynamic"]);
});

test("source v3 rejects includeRootPackage as an unknown public field", async () => {
  const root = await mkdtemp(join(tmpdir(), "orch-foundation-include-root-"));
  try {
    await mkdir(join(root, dirname(configPath)), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "@agent-teams/orchestrator-repository",
      private: true,
      type: "module",
    }));
    await writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\n");
    await writeFile(join(root, configPath), `${await readFile(join(repositoryRoot, configPath), "utf8")}\nincludeRootPackage: true\n`);
    await writeFile(join(root, "foundation.config.yaml"), JSON.stringify({
      schemaVersion: 1,
      project: { id: "foundation-include-root-fixture" },
      capabilities: { "architecture.source-dependencies": { configPath } },
    }));
    const result = spawnSync(process.execPath, [foundationCli, "check",
      "architecture.source-dependencies", "--consumer", root, "--json"],
    { encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.error, undefined, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assert.notEqual(envelope.outcome, "passed", JSON.stringify(envelope));
    assert.match(JSON.stringify(envelope), /includeRootPackage|unknown property|invalid-input/iu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
