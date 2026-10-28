import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "yaml";
import {
  checkQualityTopology,
  QUALITY_TOPOLOGY_PATH,
  readRootStackPin,
} from "./validate-quality-topology.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const foundationRoot = dirname(
  fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json")),
);
const stackRoot = dirname(fileURLToPath(import.meta.resolve("stack-toolchain/package.json")));
const foundation = JSON.parse(await readFile(join(foundationRoot, "package.json"), "utf8"));
const cli = join(foundationRoot, foundation.bin["agent-teams-foundation"]);
const profilePath = "architecture/foundation/quality-source-coverage.yaml";
const moduleRoot = "packages/platform/local-host-control";
const admittedRoots = ["packages/contexts/agent-context", "packages/platform/local-host-control"];
const ceiling = (max) => ({
  "max-lines": ["error", { max, skipBlankLines: true, skipComments: true }],
});
const stackManifest = (pin) => ({ devDependencies: { "stack-toolchain": pin } });

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
    const topology = await readJson(repositoryRoot, QUALITY_TOPOLOGY_PATH);
    for (const name of [
      "package.json",
      "pnpm-workspace.yaml",
      "foundation.config.yaml",
      "toolchain.config.json",
      "tsconfig.json",
      "tsconfig.toolchain.json",
      "scripts/orchestration-specs/tsconfig.json",
      "scripts/architecture/tsconfig.cms.json",
      "scripts/architecture/validate-consumer-module-standard.ts",
      "scripts/architecture/validate-consumer-module-standard.test.ts",
      "scripts/orchestration-specs/desktop-first-slice-v1.test.ts",
      "tooling/architecture-conformance/package.json",
      "tooling/architecture-conformance-fixtures/valid",
      "architecture/feature-module-standard-profile.json",
      "architecture/package-catalog.yaml",
      profilePath,
      QUALITY_TOPOLOGY_PATH,
      "architecture/foundation/source-dependencies.yaml",
      "architecture/foundation/dependency-declarations.yaml",
      "architecture/foundation/suppression-governance.yaml",
      ".oxlintrc.json",
      ".oxlintrc.base.json",
      ".oxlintrc.common.json",
      ".oxlintrc.type-aware.json",
      ...topology.modules.flatMap(({ root: packageRoot }) =>
        ["src", "tests", "package.json", "tsconfig.json"].map((leaf) => `${packageRoot}/${leaf}`),
      ),
    ]) {
      await mkdir(join(root, dirname(name)), { recursive: true });
      await cp(join(repositoryRoot, name), join(root, name), {
        recursive: true,
        filter: (source) => !source.split(/[\\/]/u).includes("node_modules"),
      });
    }
    const presets = "node_modules/stack-toolchain/presets";
    await mkdir(join(root, dirname(presets)), { recursive: true });
    await cp(join(stackRoot, "presets"), join(root, presets), { recursive: true });
    await cp(
      join(stackRoot, "package.json"),
      join(root, "node_modules/stack-toolchain/package.json"),
    );
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function inspect(root) {
  const result = spawnSync(
    process.execPath,
    [cli, "check", "quality.source-coverage", "--consumer", root, "--json"],
    { encoding: "utf8", timeout: 60_000 },
  );
  assert.equal(result.error, undefined, result.stderr);
  return { status: result.status, report: JSON.parse(result.stdout) };
}

test("active coverage binds exact tools, authority, scope and a single full typed route", async () => {
  await checkQualityTopology(repositoryRoot);
  const config = parse(await readFile(join(repositoryRoot, "foundation.config.yaml"), "utf8"));
  assert.equal(config.schemaVersion, 2);
  assert.deepEqual(config.capabilities["quality.source-coverage"], { configPath: profilePath });
  const profile = parse(await readFile(join(repositoryRoot, profilePath), "utf8"));
  assert.equal(profile.schemaVersion, 4);
  assert.equal(profile.featureProfilePath, QUALITY_TOPOLOGY_PATH);
  assert.equal(profile.lintConfigPath, ".oxlintrc.type-aware.json");
  assert.equal(Object.hasOwn(profile, "compilerProjects"), false);
  assert.equal(profile.toolchainConfigPath, "toolchain.config.json");
  const toolchain = await readJson(repositoryRoot, profile.toolchainConfigPath);
  assert.deepEqual(toolchain.typecheck.projects, [
    "tsconfig.toolchain.json",
    ...admittedRoots.map((root) => `${root}/tsconfig.json`),
    "scripts/orchestration-specs/tsconfig.json",
    "scripts/architecture/tsconfig.cms.json",
  ]);
  const pkg = await readJson(repositoryRoot, "package.json");
  assert.equal(
    pkg.scripts["quality:coverage:scope"],
    "agent-teams-foundation quality check --consumer . --scope-only",
  );
  assert.equal(pkg.scripts["lint:typed"], "agent-teams-foundation quality check --consumer .");
  assert.equal(
    pkg.scripts.lint,
    "pnpm run lint:fast && pnpm run lint:typed && pnpm run lint:suppressions && pnpm run lint:test",
  );
  assert.equal(pkg.scripts["lint:type-aware:files"], "node scripts/lint/run-type-aware.mjs");
  assert.equal(pkg.scripts["lint:type-aware"], "pnpm run lint:typed");
  assert.deepEqual(profile.scripts, {
    fast: "check:fast",
    full: "check",
    scope: "quality:coverage:scope",
    typed: "lint:typed",
  });
  for (const name of [".oxlintrc.json", ".oxlintrc.type-aware.json"]) {
    const lint = await readJson(repositoryRoot, name);
    assert.equal(lint.options.reportUnusedDisableDirectives, "error");
    assert.equal(lint.options.respectEslintDisableDirectives, false);
  }
});

test("adoption pins the installed Foundation and Docs adapter", async () => {
  const pkg = await readJson(repositoryRoot, "package.json");
  assert.equal(pkg.devDependencies["@agent-teams/engineering-foundation"], "3.0.0");
  readRootStackPin(pkg);
  assert.equal(pkg.devDependencies["@agent-teams/docs-protocol-agent-teams"], "0.3.2");
});

test("root Stack binding accepts a stable update and rejects noncanonical declarations", async () => {
  assert.throws(() => readRootStackPin({}), /canonical stable exact/u);
  for (const pin of ["0.1.1", "0.1.2"]) {
    assert.equal(readRootStackPin(stackManifest(pin)), pin);
  }
  for (const pin of [
    undefined,
    "^0.1.1",
    "latest",
    "npm:stack-toolchain@0.1.1",
    "file:../stack",
    "git+https://example.invalid/stack.git",
    "workspace:*",
    "0.1.2-rc.1",
    "01.1.1",
    "0.1.1+build",
  ]) {
    assert.throws(() => readRootStackPin(stackManifest(pin)), /canonical stable exact/u);
  }
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    assert.throws(
      () =>
        readRootStackPin({ ...stackManifest("0.1.2"), [section]: { "stack-toolchain": "0.1.2" } }),
      /only in root devDependencies/u,
    );
  }
  await fixture(async (root) => {
    const pkg = await readJson(root, "package.json");
    pkg.devDependencies["stack-toolchain"] = "0.1.2";
    await writeJson(root, "package.json", pkg);
    // Pure Host binding probe; no future installed package or engine is qualified.
    await checkQualityTopology(root);
  });
});

test("published coverage accepts the real consumer profile", async () => {
  await fixture(async (root) => {
    const result = inspect(root);
    assert.equal(result.status, 0, JSON.stringify(result.report));
    await checkQualityTopology(root);
    const typed = await readJson(root, ".oxlintrc.type-aware.json");
    // Exact validator inputs may include excluded TypeScript tooling. Keep that
    // closure present while isolating this legacy relaxed test-selector witness
    // from common's independent global TypeScript selector.
    const fixtureCommon = await readJson(root, ".oxlintrc.common.json");
    const typescriptRules = fixtureCommon.overrides.find((entry) =>
      entry.files.includes("**/*.{ts,tsx,mts,cts}"),
    );
    assert.ok(typescriptRules);
    typescriptRules.files = [...typed.overrides[1].files];
    // The v4 fixture also carries the native TS6 workspace manifest. Isolate
    // that known tooling metadata from this source-selector regression witness.
    fixtureCommon.overrides[0].files = fixtureCommon.overrides[0].files.filter(
      (selector) => selector !== "tooling/architecture-conformance/**",
    );
    await writeJson(root, ".oxlintrc.common.json", fixtureCommon);
    // Recreate the pre-remediation test-selector closure without weakening assertions.
    await writeJson(root, ".oxlintrc.type-aware.json", {
      ...typed,
      extends: ["./.oxlintrc.common.json", ...typed.extends.slice(1)],
    });
    const preRemediation = inspect(root);
    assert.equal(
      preRemediation.status,
      0,
      `pre-remediation disposable baseline must pass: ${JSON.stringify(preRemediation.report)}`,
    );
    await mkdir(join(root, "scripts/architecture"), { recursive: true });
    await writeFile(
      join(root, "scripts/architecture/benign.test.mjs"),
      "export const benign = true;\n",
    );
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
        const diagnostics = result.report.capabilities.flatMap(
          (capability) => capability.diagnostics ?? [],
        );
        const ceilingViolation = diagnostics.find(
          (diagnostic) =>
            diagnostic.ruleId === "quality.source-coverage.protected-setting" &&
            diagnostic.subject === "max-lines:ceiling",
        );
        assert.ok(
          ceilingViolation,
          "Canonical production aliases must retain their protected ceiling",
        );
        assert.ok(
          ceilingViolation.evidence.some(
            ({ kind, value }) => kind === "expected" && value === "500",
          ),
        );
        assert.ok(
          ceilingViolation.evidence.some(({ kind, value }) => kind === "actual" && value === "800"),
        );
      }
    });
  }
  await fixture(async (root) => {
    const typed = await readJson(root, ".oxlintrc.type-aware.json");
    assert.equal(inspect(root).status, 0, "rule-alias baseline");
    await writeJson(root, ".oxlintrc.type-aware.json", {
      ...typed,
      overrides: [...typed.overrides, { files: [tests], rules: { "eslint/max-lines": "off" } }],
    });
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
    await writeFile(
      join(root, "scripts/architecture/benign.test.mjs"),
      "export const benign = true;\n",
    );
    assert.equal(
      inspect(root).status,
      0,
      "excluded tooling must not invalidate the protected baseline",
    );
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
    (value) => {
      value.modules = [];
    },
    (value) => {
      value.modules[0].sourceRoot = `${moduleRoot}/missing`;
    },
    (value) => {
      value.standard.sha256 = "0".repeat(64);
    },
    (value) => {
      value.standard.version = "v1.1";
    },
  ]) {
    await fixture(async (root) => {
      const topology = await readJson(root, QUALITY_TOPOLOGY_PATH);
      mutate(topology);
      await writeJson(root, QUALITY_TOPOLOGY_PATH, topology);
      await assert.rejects(checkQualityTopology(root), /projection has drifted/u);
    });
  }
});

test("flat reader projection remains bounded to the adopted v1.1 profile", async () => {
  const authorityPath = "architecture/feature-module-standard-profile.json";
  const authority = await readJson(repositoryRoot, authorityPath);
  const projection = await readJson(repositoryRoot, QUALITY_TOPOLOGY_PATH);
  assert.equal(authority.standard.version, "v1.1");
  assert.equal(projection.standard.version, "v1");
  assert.deepEqual(projection.productionRoots, authority.adoption.scope.production_roots);
  assert.deepEqual(projection.excludedRoots, authority.adoption.scope.excluded_roots);
  for (const [key, value] of [
    ["version", "v1"],
    ["path", "docs/architecture/feature-module-standard/unknown.md"],
    ["sha256", "0".repeat(64)],
  ]) {
    await fixture(async (root) => {
      const changed = await readJson(root, authorityPath);
      changed.standard[key] = value;
      await writeJson(root, authorityPath, changed);
      await assert.rejects(
        checkQualityTopology(root),
        /requires the exact accepted FMS v1\.1 authority/u,
      );
    });
  }
});

test("flat reader projection rejects declared or materialized v1.1 constructs", async () => {
  for (const name of ["sub_features", "republications", "composition_contracts", "activation"]) {
    await fixture(async (root) => {
      const authorityPath = "architecture/feature-module-standard-profile.json";
      const authority = await readJson(root, authorityPath);
      authority.adoption.constructs[name] =
        name === "activation" ? "active" : [{ feature: "parent/child" }];
      await writeJson(root, authorityPath, authority);
      await assert.rejects(checkQualityTopology(root), /must remain empty|remain blocked/u);
    });
  }
  for (const [source, expected] of [
    [
      "features/host-discovery/features/child/application/execute.ts",
      /sub-feature materialization/u,
    ],
    ["features/host-discovery/composition/host-discovery.contracts.ts", /composition contracts/u],
    ["composition/host.contracts.ts", /composition contracts/u],
  ]) {
    await fixture(async (root) => {
      const path = join(root, moduleRoot, "src", source);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, "export const value = 1;\n");
      await assert.rejects(checkQualityTopology(root), expected);
    });
  }
});

test("published coverage rejects an unclassified new workspace package", async () => {
  await fixture(async (root) => {
    await writeJson(root, "packages/unclassified/package.json", {
      name: "@fixture/unclassified",
      private: true,
    });
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
    await cp(
      join(repositoryRoot, "scripts/orchestration-specs"),
      join(root, "scripts/orchestration-specs"),
      { recursive: true },
    );
    for (const name of ["pnpm-lock.yaml", "tsconfig.json"]) {
      await cp(join(repositoryRoot, name), join(root, name));
    }
    const store = spawnSync("pnpm", ["store", "path"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(store.error, undefined, store.stderr);
    assert.equal(store.status, 0, `${store.stdout}${store.stderr}`);
    const storePath = store.stdout.trim();
    assert.ok(storePath, "The root install's effective pnpm store path must be nonempty.");
    const installed = spawnSync(
      "pnpm",
      ["install", "--frozen-lockfile", "--offline", "--store-dir", storePath],
      { cwd: root, encoding: "utf8", timeout: 60_000 },
    );
    assert.equal(installed.error, undefined, installed.stderr);
    assert.equal(installed.status, 0, `${installed.stdout}${installed.stderr}`);
    const source = `${moduleRoot}/src/features/host-discovery/application/model/host-discovery.ts`;
    const original = await readFile(join(root, source), "utf8");
    const runTyped = () =>
      spawnSync(process.execPath, [cli, "quality", "check", "--consumer", root, "--json"], {
        encoding: "utf8",
        timeout: 60_000,
      });
    const baseline = runTyped();
    assert.equal(baseline.error, undefined, baseline.stderr);
    assert.equal(baseline.status, 0, `${baseline.stdout}${baseline.stderr}`);
    await writeFile(
      join(root, source),
      `${original}\nexport const unsafeBridge = ('unchecked' as unknown) as { value: string };\n`,
    );
    const result = runTyped();
    assert.equal(result.error, undefined, result.stderr);
    assert.equal(result.status, 1, result.stdout);
    const report = JSON.parse(result.stdout);
    assert.ok(
      report.capabilities[0].diagnostics.some(
        ({ ruleId }) => ruleId === "quality.source-coverage.explicit-unknown",
      ),
      JSON.stringify(report),
    );
    await writeFile(
      join(root, source),
      `${original}\nexport const safeBridge: { value: string } = { value: 'checked' };\n`,
    );
    const corrected = runTyped();
    assert.equal(corrected.error, undefined, corrected.stderr);
    assert.equal(corrected.status, 0, `${corrected.stdout}${corrected.stderr}`);
  });
});

test("toolchain adoption rejects scope loss and native-gate substitution", async () => {
  for (const [name, mutate] of [
    ["ordinary root lost", (config) => config.typecheck.projects.shift()],
    ["CMS strict owner lost", (config) => config.typecheck.projects.pop()],
    ["typed tests lost", (config) => config.lint.paths.pop()],
    [
      "blanket tooling project",
      (config) => config.typecheck.projects.push("tooling/architecture-conformance/tsconfig.json"),
    ],
    [
      "executable plugin lane",
      (config) => {
        config.lint.syntax = { config: ".oxlintrc.json", paths: ["."] };
      },
    ],
    [
      "formatter narrowed to green",
      (config) => {
        config.format.paths = ["package.json"];
      },
    ],
  ]) {
    await fixture(async (root) => {
      await checkQualityTopology(root);
      const config = await readJson(root, "toolchain.config.json");
      mutate(config);
      await writeJson(root, "toolchain.config.json", config);
      await assert.rejects(checkQualityTopology(root), /Toolchain scope/u, name);
    });
  }
  await fixture(async (root) => {
    const tooling = await readJson(root, "tooling/architecture-conformance/package.json");
    tooling.devDependencies.typescript = "catalog:";
    await writeJson(root, "tooling/architecture-conformance/package.json", tooling);
    await assert.rejects(checkQualityTopology(root), /catalog:tooling-ts6/u);
  });
  await fixture(async (root) => {
    const pkg = await readJson(root, "package.json");
    pkg.scripts["lint:fast"] = "stack-toolchain lint";
    await writeJson(root, "package.json", pkg);
    await assert.rejects(checkQualityTopology(root), /oxlint --config/u);
  });
  await fixture(async (root) => {
    const project = await readJson(root, "tsconfig.json");
    project.references = [];
    await writeJson(root, "tsconfig.json", project);
    await assert.rejects(checkQualityTopology(root), /reference and output gates/u);
  });
});

test("toolchain adoption rejects doctor bypass and build-policy weakening", async () => {
  await fixture(async (root) => {
    await checkQualityTopology(root);
    const pkg = await readJson(root, "package.json");
    for (const [name, mutate] of [
      ["missing public doctor", (value) => delete value.scripts["toolchain:doctor"]],
      [
        "echoed doctor",
        (value) => {
          value.scripts["toolchain:doctor"] = "echo healthy";
        },
      ],
      [
        "metadata-only doctor",
        (value) => {
          value.scripts["toolchain:doctor"] =
            "node -p \"require('stack-toolchain/package.json').version\"";
        },
      ],
      ...["check:fast", "check"].flatMap((gate) => [
        [
          `${gate} doctor removed`,
          (value) => {
            value.scripts[gate] = value.scripts[gate].replace("pnpm toolchain:doctor && ", "");
          },
        ],
        [
          `${gate} doctor after typecheck`,
          (value) => {
            value.scripts[gate] = `pnpm typecheck && ${value.scripts[gate]}`;
          },
        ],
      ]),
    ]) {
      const candidate = structuredClone(pkg);
      mutate(candidate);
      await writeJson(root, "package.json", candidate);
      await assert.rejects(checkQualityTopology(root), /Toolchain doctor/u, name);
    }
    await writeJson(root, "package.json", pkg);
    const workspace = parse(await readFile(join(root, "pnpm-workspace.yaml"), "utf8"));
    for (const [name, mutate] of [
      ["strict admission missing", (value) => delete value.strictDepBuilds],
      [
        "strict admission disabled",
        (value) => {
          value.strictDepBuilds = false;
        },
      ],
      ["Bun denial missing", (value) => delete value.allowBuilds.bun],
      [
        "Bun build approved",
        (value) => {
          value.allowBuilds.bun = true;
        },
      ],
      [
        "global scripts ignored",
        (value) => {
          value.ignoreScripts = true;
        },
      ],
      [
        "global builds approved",
        (value) => {
          value.dangerouslyAllowAllBuilds = true;
        },
      ],
      ["existing approval lost", (value) => delete value.allowBuilds.nx],
    ]) {
      const candidate = structuredClone(workspace);
      mutate(candidate);
      await writeJson(root, "pnpm-workspace.yaml", candidate);
      await assert.rejects(checkQualityTopology(root), /Toolchain build policy/u, name);
    }
  });
});
