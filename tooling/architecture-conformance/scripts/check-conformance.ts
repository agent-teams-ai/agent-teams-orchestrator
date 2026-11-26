import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { observeAdvisoryGraph, requireCompleteAcyclicGraph } from "./run-advisory-graph.ts";

interface ConformanceConfigFactory {
  createConformanceOxlintConfig(root: string): { readonly filePath: string; readonly dispose: () => void };
}
function conformanceConfigFactory(value: unknown): value is ConformanceConfigFactory {
  return typeof value === "object" && value !== null &&
    "createConformanceOxlintConfig" in value && typeof value.createConformanceOxlintConfig === "function";
}
const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../..");
const configFactory: unknown = await import(
  pathToFileURL(path.join(repositoryRoot, "scripts/lint/create-conformance-config.mjs")).href
);
if (!conformanceConfigFactory(configFactory)) {
  throw new Error("Root conformance Oxlint configuration factory is missing.");
}
const generatedOxlintConfig = configFactory.createConformanceOxlintConfig(repositoryRoot);
const conformanceOxlintConfig = generatedOxlintConfig.filePath;
process.once("exit", generatedOxlintConfig.dispose);

function run(command: string, args: string[], cwd: string): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
  });
}

function combinedOutput(result: SpawnSyncReturns<string>): string {
  return `${result.stdout}\n${result.stderr}`;
}

function requireSuccess(label: string, result: SpawnSyncReturns<string>): void {
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${combinedOutput(result)}`);
  }
}

function requireFailure(label: string, result: SpawnSyncReturns<string>, expectedText: string): void {
  const output = combinedOutput(result);
  if (result.status === 0 || !output.includes(expectedText)) {
    throw new Error(`${label} did not fail with ${expectedText}:\n${output}`);
  }
}

const fixtureRoot = path.join(repositoryRoot, "tooling/architecture-conformance-fixtures");
const validRoot = path.join(fixtureRoot, "valid");
const validLint = run(
  "pnpm",
  ["exec", "oxlint", "--config", conformanceOxlintConfig, "--disable-nested-config", validRoot],
  repositoryRoot,
);
requireSuccess("valid Oxlint boundary fixture", validLint);

const validCoreRoot = path.join(fixtureRoot, "core-valid");
const validCoreLint = run(
  "pnpm",
  ["exec", "oxlint", "--config", conformanceOxlintConfig, "--disable-nested-config", validCoreRoot],
  repositoryRoot,
);
requireSuccess("valid core-module adapter fixture", validCoreLint);

const invalidBoundaryFiles = [
  "domain/value-import.ts",
  "domain/type-import.ts",
  "domain/dynamic-import.ts",
  "domain/re-export.ts",
  "domain/alias-import.ts",
  "domain/external-import.ts",
  "domain/cross-feature-import.ts",
  "domain/core-import.ts",
  "application/import-contract.ts",
  "contracts/import-domain.ts",
  "adapters/inbound/import-outbound.ts",
  "adapters/outbound/import-inbound.ts",
];

const invalidRoot = path.join(fixtureRoot, "invalid");
const invalidLint = run(
  "pnpm",
  ["exec", "oxlint", "--config", conformanceOxlintConfig, "--disable-nested-config", invalidRoot],
  repositoryRoot,
);
requireFailure("invalid Oxlint boundary fixtures", invalidLint, "boundaries(dependencies)");
const invalidLintOutput = combinedOutput(invalidLint);
for (const fileName of invalidBoundaryFiles) {
  if (!invalidLintOutput.includes(fileName)) {
    throw new Error(
      `invalid Oxlint boundary fixture ${fileName} was not reported:\n${invalidLintOutput}`,
    );
  }
}

const validGraph = await observeAdvisoryGraph(repositoryRoot, [path.relative(repositoryRoot, validRoot)]);
requireCompleteAcyclicGraph(validGraph);
const cyclicGraph = await observeAdvisoryGraph(repositoryRoot, [
  path.relative(repositoryRoot, path.join(fixtureRoot, "cycles")),
]);
assert.throws(() => { requireCompleteAcyclicGraph(cyclicGraph); }, /no-circular-dependencies/u);

console.log("Architecture tooling conformance passed.");
generatedOxlintConfig.dispose();
process.off("exit", generatedOxlintConfig.dispose);
