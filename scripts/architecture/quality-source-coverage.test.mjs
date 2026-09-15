import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "yaml";
import { checkQualityTopology, QUALITY_TOPOLOGY_PATH } from "./validate-quality-topology.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const foundationRoot = dirname(fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json")));
const foundation = JSON.parse(await readFile(join(foundationRoot, "package.json"), "utf8"));
const cli = join(foundationRoot, foundation.bin["agent-teams-foundation"]);
const profilePath = "architecture/foundation/quality-source-coverage.yaml";
const moduleRoot = "packages/platform/local-host-control";

async function readJson(root, name) {
  return JSON.parse(await readFile(join(root, name), "utf8"));
}

async function writeJson(root, name, value) {
  await mkdir(join(root, dirname(name)), { recursive: true });
  await writeFile(join(root, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function fixture(action) {
  const root = await mkdtemp(join(tmpdir(), "orchestrator-quality-coverage-"));
  try {
    await mkdir(join(root, "apps"));
    await mkdir(join(root, "tooling"));
    for (const name of [
      "package.json", "pnpm-workspace.yaml", "foundation.config.yaml",
      "architecture/feature-module-standard-profile.json", "architecture/package-catalog.yaml",
      profilePath, QUALITY_TOPOLOGY_PATH,
      "architecture/foundation/source-dependencies.yaml",
      "architecture/foundation/suppression-governance.yaml",
      ".oxlintrc.common.json", ".oxlintrc.type-aware.json",
      `${moduleRoot}/src`, `${moduleRoot}/tests`, `${moduleRoot}/package.json`,
      `${moduleRoot}/tsconfig.json`,
    ]) {
      await mkdir(join(root, dirname(name)), { recursive: true });
      await cp(join(repositoryRoot, name), join(root, name), { recursive: true });
    }
    const presets = "node_modules/@agent-teams/engineering-foundation/presets";
    await mkdir(join(root, dirname(presets)), { recursive: true });
    await cp(join(foundationRoot, "presets"), join(root, presets), { recursive: true });
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function inspect(root) {
  const result = spawnSync(process.execPath, [cli, "check", "quality.source-coverage",
    "--consumer", root, "--json"], { encoding: "utf8", timeout: 60_000 });
  assert.equal(result.error, undefined, result.stderr);
  return { status: result.status, report: JSON.parse(result.stdout) };
}

test("active coverage binds exact tools, authority, scope and a single full typed route", async () => {
  await checkQualityTopology(repositoryRoot);
  const config = parse(await readFile(join(repositoryRoot, "foundation.config.yaml"), "utf8"));
  assert.equal(config.schemaVersion, 2);
  assert.deepEqual(config.capabilities["quality.source-coverage"], { configPath: profilePath });
  const profile = parse(await readFile(join(repositoryRoot, profilePath), "utf8"));
  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.featureProfilePath, QUALITY_TOPOLOGY_PATH);
  assert.equal(profile.lintConfigPath, ".oxlintrc.type-aware.json");
  assert.deepEqual(profile.compilerProjects, [`${moduleRoot}/tsconfig.json`]);
  const pkg = await readJson(repositoryRoot, "package.json");
  assert.equal(pkg.scripts["quality:coverage:scope"], "agent-teams-foundation quality check --consumer . --scope-only");
  assert.equal(pkg.scripts["lint:typed"], "agent-teams-foundation quality check --consumer .");
  assert.equal(pkg.scripts.lint, "pnpm run lint:fast && pnpm run lint:typed && pnpm run lint:suppressions && pnpm run lint:test");
  assert.equal(pkg.scripts["lint:type-aware:files"], "node scripts/lint/run-type-aware.mjs");
  assert.equal(pkg.scripts["lint:type-aware"], "pnpm run lint:typed");
  assert.deepEqual(profile.scripts, {
    fast: "check:fast", full: "check", scope: "quality:coverage:scope", typed: "lint:typed",
  });
  for (const name of [".oxlintrc.json", ".oxlintrc.type-aware.json"]) {
    const lint = await readJson(repositoryRoot, name);
    assert.equal(lint.options.reportUnusedDisableDirectives, "error");
    assert.equal(lint.options.respectEslintDisableDirectives, false);
  }
});

test("adoption pins the qualified Foundation and Docs adapter", async () => {
  const pkg = await readJson(repositoryRoot, "package.json");
  assert.equal(pkg.devDependencies["@agent-teams/engineering-foundation"], "1.3.3");
  assert.equal(pkg.devDependencies["@agent-teams/docs-protocol-agent-teams"], "0.2.8");
});

test("published coverage accepts the real consumer profile", async () => {
  await fixture(async (root) => {
    const result = inspect(root);
    assert.equal(result.status, 0, JSON.stringify(result.report));
    await checkQualityTopology(root);
  });
});

test("projection rejects omission and source or standard drift", async () => {
  for (const mutate of [
    (value) => { value.modules = []; },
    (value) => { value.modules[0].sourceRoot = `${moduleRoot}/missing`; },
    (value) => { value.standard.sha256 = "0".repeat(64); },
  ]) {
    await fixture(async (root) => {
      const topology = await readJson(root, QUALITY_TOPOLOGY_PATH);
      mutate(topology);
      await writeJson(root, QUALITY_TOPOLOGY_PATH, topology);
      await assert.rejects(checkQualityTopology(root), /projection has drifted/u);
    });
  }
});

test("published coverage rejects an unclassified new workspace package", async () => {
  await fixture(async (root) => {
    await writeJson(root, "packages/unclassified/package.json", { name: "@fixture/unclassified", private: true });
    const result = inspect(root);
    assert.equal(result.status, 1, JSON.stringify(result.report));
    assert.match(JSON.stringify(result.report), /quality\.source-coverage\.source-package/u);
  });
});

test("projection rejects missing production source", async () => {
  await fixture(async (root) => {
    await rm(join(root, moduleRoot, "src"), { recursive: true });
    await assert.rejects(checkQualityTopology(root), /ENOENT/u);
  });
});
