import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  EXPECTED_STANDARD,
  readProductionFeaturePaths,
  validateConstructActivation,
} from "./validate-feature-module-standard-profile.mjs";

export const QUALITY_TOPOLOGY_PATH = "architecture/foundation/quality-feature-topology.json";

// The Foundation quality reader accepts the flat v1 input. FMS v1.1 retains the same
// obligations while its new constructs are absent; this is a reader-format
// projection, never a second authority or permission to omit production scope.
const FLAT_READER_STANDARD = Object.freeze({
  id: "agent-teams.feature-module-standard",
  version: "v1",
  repository: "agent-teams-ai/.github",
  path: "docs/architecture/feature-module-standard/v1.md",
  git_blob_sha: "d0bfff2033faf544fe65268c1dcdfd524d093015",
  sha256: "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa",
});

// These exclusions protect accepted decisions, retained research, managed Docs
// assets and conformance witnesses. Current maintained documentation stays in
// the broad format census; debt never changes the scope.
const FORMAT_PATHS = [
  ".",
  "!pnpm-lock.yaml",
  "!docs/decisions/[0-9]*.md",
  "!docs/research/**",
  "!architecture/decisions/accepted-decisions.json",
  "!architecture/executable-specs/fixtures/**",
  "!architecture/foundation/docs-*",
  "!architecture/foundation/document-authoring.yaml",
  "!architecture/foundation/required-quality-tests.json",
  "!architecture/feature-module-standard-profile.json",
  "!.agents/skills/docs-authoring/**",
  "!.github/workflows/docs-protocol.yml",
  "!AGENTS.md",
  "!GEMINI.md",
  "!.github/copilot-instructions.md",
  "!scripts/**/fixtures/**",
  "!tooling/architecture-conformance-fixtures/**",
  "!tooling/lint-fixtures/**",
  "!architecture/consumer-module-standard/guide/common-assembly-081.md",
];

export function readRootStackPin(pkg) {
  const pin = pkg.devDependencies?.["stack-toolchain"];
  assert.match(
    pin ?? "",
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u,
    "Stack requires one canonical stable exact root development pin.",
  );
  assert.ok(
    ["dependencies", "optionalDependencies", "peerDependencies"].every(
      (section) => !Object.hasOwn(pkg[section] ?? {}, "stack-toolchain"),
    ),
    "Stack must occur only in root devDependencies.",
  );
  return pin;
}

export async function checkToolchainAdoption(root, modules) {
  const read = (name) => readFile(resolve(root, name), "utf8");
  const json = async (name) => JSON.parse(await read(name));
  const pkg = await json("package.json");
  assert.equal(pkg.devDependencies["@agent-teams/engineering-foundation"], "3.0.0");
  // The mandatory public Foundation v4 gate binds this pin to the installed graph.
  readRootStackPin(pkg);
  assert.equal(
    pkg.scripts["toolchain:doctor"],
    "stack-toolchain doctor",
    "Toolchain doctor must use the public installed package CLI.",
  );
  for (const gate of ["check:fast", "check"]) {
    assert.equal(
      pkg.scripts[gate]?.split(" && ")[0],
      "pnpm toolchain:doctor",
      `Toolchain doctor must run first in ${gate}.`,
    );
  }
  const profile = parse(await read("architecture/foundation/quality-source-coverage.yaml"));
  assert.equal(profile.schemaVersion, 4);
  assert.equal(
    Object.hasOwn(profile, "compilerProjects"),
    false,
    "Ordinary projects have one authority in the public toolchain configuration.",
  );
  assert.equal(profile.toolchainConfigPath, "toolchain.config.json");
  assert.deepEqual(
    await json(profile.toolchainConfigPath),
    {
      schemaVersion: 1,
      profile: "typescript-node",
      typecheck: {
        projects: [
          "tsconfig.toolchain.json",
          ...modules.map(({ root: path }) => `${path}/tsconfig.json`),
          "scripts/orchestration-specs/tsconfig.json",
          "scripts/architecture/tsconfig.cms.json",
        ],
      },
      lint: {
        config: profile.lintConfigPath,
        paths: modules.flatMap(({ sourceRoot, testRoots }) => [sourceRoot, ...testRoots]),
      },
      format: { paths: FORMAT_PATHS },
    },
    "Toolchain scope must retain ordinary projects, typed roots and maintained formatting scope.",
  );
  assert.deepEqual(
    await json("tsconfig.toolchain.json"),
    { extends: "./tsconfig.json" },
    "The ordinary root inherits strict scope without inheriting build references.",
  );
  const rootProject = await json("tsconfig.json");
  assert.equal(rootProject.extends, "stack-toolchain/presets/typescript/node.json");
  assert.deepEqual(
    rootProject.references,
    modules.map(({ root: path }) => ({ path: `./${path}` })),
    "Independent reference and output gates retain their production graph.",
  );
  for (const name of ["typecheck", "typecheck:root"]) {
    assert.equal(pkg.scripts[name], "stack-toolchain typecheck");
  }
  assert.equal(pkg.scripts["format:check"], "stack-toolchain format:check");
  assert.ok(pkg.scripts.check.split(" && ").includes("pnpm format:check"));
  assert.equal(pkg.scripts["lint:typed"], "agent-teams-foundation quality check --consumer .");
  assert.equal(
    pkg.scripts["lint:fast"],
    "oxlint --config .oxlintrc.json --deny-warnings --disable-nested-config .",
  );
  assert.equal(
    pkg.scripts["architecture:conformance"],
    "pnpm --filter @agent-teams/architecture-conformance run check:conformance",
  );
  assert.equal(pkg.scripts["packages:check"], 'pnpm --filter "./packages/**" run check');
  assert.deepEqual((await json(".oxlintrc.json")).jsPlugins, [
    { name: "boundaries", specifier: "eslint-plugin-boundaries" },
  ]);
  const workspace = parse(await read("pnpm-workspace.yaml"));
  assert.deepEqual(
    {
      strictDepBuilds: workspace.strictDepBuilds,
      allowBuilds: workspace.allowBuilds,
      ignoreScripts: workspace.ignoreScripts ?? false,
      dangerouslyAllowAllBuilds: workspace.dangerouslyAllowAllBuilds ?? false,
    },
    {
      strictDepBuilds: true,
      allowBuilds: { esbuild: true, nx: true, bun: false },
      ignoreScripts: false,
      dangerouslyAllowAllBuilds: false,
    },
    "Toolchain build policy must keep strict admission and the package-specific Bun denial.",
  );
  assert.equal(
    workspace.catalog.oxlint,
    "1.83.0",
    "Native host-plugin gates retain their admitted Oxlint.",
  );
  assert.equal(
    workspace.catalog.typescript,
    "7.0.2",
    "Reference/build/spec gates retain the official compiler.",
  );
  assert.deepEqual(workspace.catalogs["tooling-ts6"], {
    "dependency-cruiser": "18.1.0",
    typescript: "6.0.3",
  });
  assert.deepEqual(workspace.packageExtensions["dependency-cruiser@18.1.0"], {
    peerDependencies: { typescript: ">=2.0.0 <7.0.0" },
  });
  const tooling = await json("tooling/architecture-conformance/package.json");
  assert.equal(tooling.devDependencies.typescript, "catalog:tooling-ts6");
  assert.equal(tooling.devDependencies["dependency-cruiser"], "catalog:tooling-ts6");
  const policy = parse(await read("architecture/foundation/dependency-declarations.yaml"));
  assert.ok(policy.policies.exactRegistryDevelopmentOnlyPackages.includes("stack-toolchain"));
}

export async function checkQualityTopology(root = process.cwd()) {
  const read = (name) => readFile(resolve(root, name), "utf8");
  const authority = JSON.parse(await read("architecture/feature-module-standard-profile.json"));
  assert.deepEqual(
    authority.standard,
    EXPECTED_STANDARD,
    "Quality compatibility projection requires the exact accepted FMS v1.1 authority.",
  );
  validateConstructActivation(
    authority.adoption.constructs,
    await readProductionFeaturePaths(root, ["apps", "packages"]),
  );
  const catalog = parse(await read("architecture/package-catalog.yaml"));
  const modules = [];
  for (const entry of catalog.packages) {
    try {
      await stat(resolve(root, entry.path, "package.json"));
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    assert.notEqual(
      entry.role,
      "app",
      "Materialized applications require explicit quality adoption.",
    );
    for (const directory of ["src", "tests"]) {
      assert.ok(
        (await stat(resolve(root, entry.path, directory))).isDirectory(),
        `Quality topology requires ${entry.path}/${directory}.`,
      );
    }
    modules.push({
      root: entry.path,
      sourceRoot: `${entry.path}/src`,
      testRoots: [`${entry.path}/tests`],
    });
  }
  assert.ok(modules.length > 0, "Quality topology requires a materialized module.");
  assert.deepEqual(
    JSON.parse(await read(QUALITY_TOPOLOGY_PATH)),
    {
      schemaVersion: 1,
      standard: FLAT_READER_STANDARD,
      productionRoots: authority.adoption.scope.production_roots,
      applicationRoots: [],
      excludedRoots: authority.adoption.scope.excluded_roots,
      topology: { sourcePolicy: "architecture/foundation/source-dependencies.yaml" },
      modules,
    },
    "Quality topology projection has drifted from accepted authority or materialized packages.",
  );
  await checkToolchainAdoption(root, modules);
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkQualityTopology();
  console.log("Foundation quality topology projection matches Orchestrator authority.");
}
