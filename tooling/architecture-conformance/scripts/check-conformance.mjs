import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const toolingRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(toolingRoot, "../..");
const rootOxlintConfig = path.join(repositoryRoot, ".oxlintrc.json");
const graphConfig = path.join(
  toolingRoot,
  "dependency-cruiser.config.cjs",
);
const dependencyCruiserBin = path.join(
  toolingRoot,
  "node_modules/.bin/dependency-cruiser",
);

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
  });
}

function combinedOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function requireSuccess(label, result) {
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${combinedOutput(result)}`);
  }
}

function requireFailure(label, result, expectedText) {
  const output = combinedOutput(result);
  if (result.status === 0 || !output.includes(expectedText)) {
    throw new Error(
      `${label} did not fail with ${expectedText}:\n${output}`,
    );
  }
}

const info = run(dependencyCruiserBin, ["--info"], repositoryRoot);
requireSuccess("dependency-cruiser environment check", info);
const infoOutput = combinedOutput(info);
for (const expected of ["typescript@6.0.3"]) {
  if (!infoOutput.includes(expected)) {
    throw new Error(
      `dependency-cruiser environment is missing ${expected}:\n${infoOutput}`,
    );
  }
}

const validRoot = path.join(toolingRoot, "fixtures/valid");
const validLint = run(
  "pnpm",
  ["exec", "oxlint", "--config", rootOxlintConfig, validRoot],
  repositoryRoot,
);
requireSuccess("valid Oxlint boundary fixture", validLint);

const validCoreRoot = path.join(toolingRoot, "fixtures/core-valid");
const validCoreLint = run(
  "pnpm",
  ["exec", "oxlint", "--config", rootOxlintConfig, validCoreRoot],
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

const invalidRoot = path.join(toolingRoot, "fixtures/invalid");
const invalidLint = run(
  "pnpm",
  ["exec", "oxlint", "--config", rootOxlintConfig, invalidRoot],
  repositoryRoot,
);
requireFailure(
  "invalid Oxlint boundary fixtures",
  invalidLint,
  "boundaries(dependencies)",
);
const invalidLintOutput = combinedOutput(invalidLint);
for (const fileName of invalidBoundaryFiles) {
  if (!invalidLintOutput.includes(fileName)) {
    throw new Error(
      `invalid Oxlint boundary fixture ${fileName} was not reported:\n${invalidLintOutput}`,
    );
  }
}

const validGraph = run(
  dependencyCruiserBin,
  [
    "--config",
    graphConfig,
    "--output-type",
    "err",
    path.relative(repositoryRoot, validRoot),
  ],
  repositoryRoot,
);
requireSuccess("valid dependency graph fixture", validGraph);

const invalidGraph = run(
  dependencyCruiserBin,
  [
    "--config",
    graphConfig,
    "--output-type",
    "err",
    path.relative(
      repositoryRoot,
    invalidRoot,
    ),
    path.relative(
      repositoryRoot,
      path.join(toolingRoot, "fixtures/cycles"),
    ),
  ],
  repositoryRoot,
);

for (const expectedRule of [
  "domain-must-not-depend-on-outer-layers",
  "no-circular-dependencies",
]) {
  requireFailure(
    "invalid dependency graph fixtures",
    invalidGraph,
    expectedRule,
  );
}

console.log("Architecture tooling conformance passed.");
