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
const ceiling = (max) => ({ "max-lines": ["error", { max, skipBlankLines: true, skipComments: true }] });

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
      ".oxlintrc.base.json", ".oxlintrc.common.json", ".oxlintrc.type-aware.json",
      `${moduleRoot}/src`, `${moduleRoot}/tests`, `${moduleRoot}/package.json`,
      `${moduleRoot}/tsconfig.json`,
    ]) {
      await mkdir(join(root, dirname(name)), { recursive: true });
      await cp(join(repositoryRoot, name), join(root, name), { recursive: true, filter: (source) => !source.split(/[\\/]/u).includes("node_modules") });
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

test("adoption pins the installed Foundation and Docs adapter", async () => {
  const pkg = await readJson(repositoryRoot, "package.json");
  assert.equal(pkg.devDependencies["@agent-teams/engineering-foundation"], "1.7.2");
  assert.equal(pkg.devDependencies["@agent-teams/docs-protocol-agent-teams"], "0.3.2");
});

test("published coverage accepts the real consumer profile", async () => {
  await fixture(async (root) => {
    const result = inspect(root);
    assert.equal(result.status, 0, JSON.stringify(result.report));
    await checkQualityTopology(root);
    const typed = await readJson(root, ".oxlintrc.type-aware.json");
    // Recreate the pre-remediation closure without changing its normal policy.
    await writeJson(root, ".oxlintrc.type-aware.json", { ...typed,
      extends: ["./.oxlintrc.common.json", ...typed.extends.slice(1)] });
    assert.equal(inspect(root).status, 0, "pre-remediation disposable baseline must pass");
    await mkdir(join(root, "scripts/architecture"), { recursive: true });
    await writeFile(join(root, "scripts/architecture/benign.test.mjs"), "export const benign = true;\n");
    let rejected = inspect(root);
    assert.equal(rejected.status, 2, JSON.stringify(rejected.report));
    assert.equal(rejected.report.capabilities[0].problem.code, "QUALITY_PROFILE_INVALID");
    await writeFile(join(root, "scripts/architecture/benign.ts"), "export const benign = true;\n");
    rejected = inspect(root);
    assert.equal(rejected.status, 2, JSON.stringify(rejected.report));
    await writeJson(root, ".oxlintrc.type-aware.json", typed);
    const corrected = inspect(root);
    assert.equal(corrected.status, 0, JSON.stringify(corrected.report));
    await checkQualityTopology(root);
  });
});

test("published typed closure rejects unclassified selectors and weaker protection", async () => {
  const source = `${moduleRoot}/src/features/host-discovery/application/model/host-discovery.ts`;
  const namedTest = `${moduleRoot}/src/features/host-discovery/application/model/production.test.ts`;
  const tests = `${moduleRoot}/tests/**`;
  const excluded = "scripts/architecture/benign.test.mjs";
  const unknown = "misc/unknown.test.mjs";
  for (const [label, files, rules, status, excludedFiles] of [
    ["unknown", [unknown], ceiling(800), 2],
    ["excluded only", [excluded], ceiling(800), 2],
    ["tests plus excluded", [tests, excluded], ceiling(800), 2],
    ["mixed relaxed", [source, tests], ceiling(800), 1],
    ["mixed production ceiling", [source, tests], ceiling(500), 0],
    ["empty", [], ceiling(800), 2],
    ["unmatched", ["missing-tests/**"], ceiling(800), 2],
    ["emptied by exclusions", [tests], ceiling(800), 2, [tests]],
    ["path alias", [source.replace("/src/", "/src/../src/")], ceiling(800), 1],
    ["correctness off", [tests], { "typescript/no-floating-promises": "off" }, 1],
    ["budget off", [tests], { "max-lines": "off" }, 1],
    ["production weakened", [source], ceiling(501), 1],
    ["production named test", [namedTest], ceiling(800), 1],
    ["excluded correctness", [excluded], { "typescript/no-floating-promises": "error" }, 2],
  ]) {
    await fixture(async (root) => {
      assert.equal(inspect(root).status, 0, `${label}: original baseline`);
      for (const path of [excluded, unknown, namedTest]) {
        await mkdir(join(root, dirname(path)), { recursive: true });
        await writeFile(join(root, path), "export const benign = true;\n");
      }
      assert.equal(inspect(root).status, 0, `${label}: benign-input baseline`);
      const typed = await readJson(root, ".oxlintrc.type-aware.json");
      typed.overrides.push({ files, rules, ...(excludedFiles ? { excludedFiles } : {}) });
      await writeJson(root, ".oxlintrc.type-aware.json", typed);
      const result = inspect(root);
      assert.equal(result.status, status, `${label}: ${JSON.stringify(result.report)}`);
      assert.equal(result.report.outcome, ["passed", "violations", "invalid-input"][status]);
      if (label === "path alias") {
        const diagnostics = result.report.capabilities.flatMap((capability) => capability.diagnostics ?? []);
        const ceilingViolation = diagnostics.find((diagnostic) =>
          diagnostic.ruleId === "quality.source-coverage.protected-setting"
          && diagnostic.subject === "max-lines:ceiling");
        assert.ok(ceilingViolation, "Canonical production aliases must retain their protected ceiling");
        assert.ok(ceilingViolation.evidence.some(({ kind, value }) => kind === "expected" && value === "500"));
        assert.ok(ceilingViolation.evidence.some(({ kind, value }) => kind === "actual" && value === "800"));
      }
    });
  }
  await fixture(async (root) => {
    const typed = await readJson(root, ".oxlintrc.type-aware.json");
    assert.equal(inspect(root).status, 0, "rule-alias baseline");
    await writeJson(root, ".oxlintrc.type-aware.json", { ...typed, overrides: [...typed.overrides,
      { files: [tests], rules: { "eslint/max-lines": "off" } }] });
    const alias = inspect(root);
    assert.notEqual(alias.status, 0, JSON.stringify(alias.report));
    assert.ok(["violations", "invalid-input"].includes(alias.report.outcome));
    await writeJson(root, "stronger.json", { rules: ceiling(300) });
    typed.extends.push("./stronger.json");
    typed.rules = ceiling(300);
    await writeJson(root, ".oxlintrc.type-aware.json", typed);
    assert.equal(inspect(root).status, 0, "stronger inherited ceiling baseline");
    typed.rules = ceiling(400);
    await writeJson(root, ".oxlintrc.type-aware.json", typed);
    const result = inspect(root);
    assert.equal(result.status, 1, JSON.stringify(result.report));
    assert.match(JSON.stringify(result.report), /protected-setting/u);
  });
});

test("published coverage rejects a test override that also selects unclassified tooling", async () => {
  await fixture(async (root) => {
    await mkdir(join(root, "scripts/architecture"), { recursive: true });
    await writeFile(join(root, "scripts/architecture/benign.test.mjs"), "export const benign = true;\n");
    assert.equal(inspect(root).status, 0, "excluded tooling must not invalidate the protected baseline");
    const typed = await readJson(root, ".oxlintrc.type-aware.json");
    typed.overrides[0].files = ["**/*"];
    await writeJson(root, ".oxlintrc.type-aware.json", typed);
    const result = inspect(root);
    assert.equal(result.status, 2, JSON.stringify(result.report));
    assert.equal(result.report.capabilities[0].problem.code, "QUALITY_PROFILE_INVALID");
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

test("published coverage rejects missing and non-regular declared inputs", async () => {
  for (const target of [".oxlintrc.type-aware.json", `${moduleRoot}/src`]) {
    await fixture(async (root) => {
      await rm(join(root, target), { recursive: true });
      const missing = inspect(root);
      assert.notEqual(missing.status, 0, JSON.stringify(missing.report));
      assert.equal(missing.report.outcome, "invalid-input");
    });
  }
  await fixture(async (root) => {
    await rm(join(root, ".oxlintrc.type-aware.json"));
    await mkdir(join(root, ".oxlintrc.type-aware.json"));
    const unreadable = inspect(root);
    assert.notEqual(unreadable.status, 0, JSON.stringify(unreadable.report));
    assert.equal(unreadable.report.outcome, "invalid-input");
  });
});

test("installed typed gate rejects an unknown assertion bridge by default", async () => {
  await fixture(async (root) => {
    for (const name of ["pnpm-lock.yaml", "tsconfig.json"]) {
      await cp(join(repositoryRoot, name), join(root, name));
    }
    const store = spawnSync("pnpm", ["store", "path"],
      { cwd: repositoryRoot, encoding: "utf8", timeout: 60_000 });
    assert.equal(store.error, undefined, store.stderr);
    assert.equal(store.status, 0, `${store.stdout}${store.stderr}`);
    const storePath = store.stdout.trim();
    assert.ok(storePath, "The root install's effective pnpm store path must be nonempty.");
    const installed = spawnSync("pnpm", ["install", "--frozen-lockfile", "--offline", "--store-dir",
      storePath], { cwd: root, encoding: "utf8", timeout: 60_000 });
    assert.equal(installed.error, undefined, installed.stderr);
    assert.equal(installed.status, 0, `${installed.stdout}${installed.stderr}`);
    const source = `${moduleRoot}/src/features/host-discovery/application/model/host-discovery.ts`;
    const original = await readFile(join(root, source), "utf8");
    const runTyped = () => spawnSync(process.execPath, [cli, "quality", "check", "--consumer", root, "--json"],
      { encoding: "utf8", timeout: 60_000 });
    const baseline = runTyped();
    assert.equal(baseline.error, undefined, baseline.stderr);
    assert.equal(baseline.status, 0, `${baseline.stdout}${baseline.stderr}`);
    await writeFile(join(root, source), `${original}\nexport const unsafeBridge = ('unchecked' as unknown) as { value: string };\n`);
    const result = runTyped();
    assert.equal(result.error, undefined, result.stderr);
    assert.equal(result.status, 1, result.stdout);
    const report = JSON.parse(result.stdout);
    assert.ok(report.capabilities[0].diagnostics.some(({ ruleId }) =>
      ruleId === "quality.source-coverage.explicit-unknown"), JSON.stringify(report));
    await writeFile(join(root, source), `${original}\nexport const safeBridge: { value: string } = { value: 'checked' };\n`);
    const corrected = runTyped();
    assert.equal(corrected.error, undefined, corrected.stderr);
    assert.equal(corrected.status, 0, `${corrected.stdout}${corrected.stderr}`);
  });
});
