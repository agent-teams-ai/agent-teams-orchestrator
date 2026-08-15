import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolingRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(toolingRoot, "../..");
const requireFromTooling = createRequire(import.meta.url);
const foundationPackageRoot = path.dirname(
  requireFromTooling.resolve(
    "@agent-teams/engineering-foundation/package.json",
  ),
);
const foundationCli = path.join(foundationPackageRoot, "dist/cli.js");
const validator = path.join(
  repositoryRoot,
  "scripts/architecture/validate-dependency-specifiers.mjs",
);

function run(root) {
  return spawnSync(process.execPath, [validator, "--root", root], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function runFoundation(root) {
  return spawnSync(
    process.execPath,
    [foundationCli, "check", "--consumer", root, "--format", "json"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
}

function output(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function requireSuccess(label, result) {
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${output(result)}`);
  }
}

function requireFailure(label, result, expectedText) {
  const actual = output(result);
  if (result.status === 0 || !actual.includes(expectedText)) {
    throw new Error(
      `${label} did not fail with ${expectedText}:\n${actual}`,
    );
  }
}

function foundationReport(label, result) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} returned invalid foundation JSON:\n${output(result)}`);
  }
}

function requireFoundationSuccess(label, result) {
  const report = foundationReport(label, result);
  if (result.status !== 0 || report.outcome !== "passed") {
    throw new Error(`${label} failed foundation validation:\n${output(result)}`);
  }
}

function requireFoundationViolation(label, result, expectedRuleId) {
  const report = foundationReport(label, result);
  const ruleIds = report.capabilities.flatMap((capability) =>
    capability.diagnostics.map((diagnostic) => diagnostic.ruleId),
  );
  if (
    result.status !== 1 ||
    report.outcome !== "violations" ||
    !ruleIds.includes(expectedRuleId)
  ) {
    throw new Error(
      `${label} did not report ${expectedRuleId}:\n${output(result)}`,
    );
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "agent-teams-dependencies-"),
);

try {
  await mkdir(path.join(temporaryRoot, "packages/internal"), {
    recursive: true,
  });
  await mkdir(path.join(temporaryRoot, "packages/consumer"), {
    recursive: true,
  });
  await writeFile(
    path.join(temporaryRoot, "pnpm-workspace.yaml"),
    `packages:
  - "packages/**"
catalogMode: strict
catalog:
  external-one: 1.2.3
catalogs:
  compatibility:
    external-tool: 2.0.0
`,
  );
  await mkdir(path.join(temporaryRoot, "architecture/foundation"), {
    recursive: true,
  });
  await writeFile(
    path.join(temporaryRoot, "foundation.config.yaml"),
    `schemaVersion: 1
project:
  id: dependency-conformance
capabilities:
  workspace.dependency-declarations:
    configPath: architecture/foundation/dependency-declarations.yaml
`,
  );
  await writeFile(
    path.join(
      temporaryRoot,
      "architecture/foundation/dependency-declarations.yaml",
    ),
    `schemaVersion: 1
packageManager:
  kind: pnpm
  workspaceManifest: pnpm-workspace.yaml
policies:
  externalDependencies: catalog
  catalogVersions: exact
  internalDependencies: workspace-protocol
  reservedScopes:
    - "@agent-teams/"
  developmentOnlyPackages: []
  exactRegistryDevelopmentOnlyPackages:
    - "@agent-teams/docs-protocol"
    - "@agent-teams/engineering-foundation"
`,
  );
  await writeJson(path.join(temporaryRoot, "package.json"), {
    name: "@agent-teams/test-root",
    private: true,
    packageManager: "pnpm@11.18.0",
    devDependencies: {
      "@agent-teams/engineering-foundation": "0.2.0",
      "external-one": "catalog:",
    },
  });
  await writeJson(
    path.join(temporaryRoot, "packages/internal/package.json"),
    { name: "@agent-teams/internal", private: true },
  );
  const consumerManifestPath = path.join(
    temporaryRoot,
    "packages/consumer/package.json",
  );
  const validConsumerManifest = {
    name: "@agent-teams/consumer",
    private: true,
    dependencies: {
      "@agent-teams/internal": "workspace:*",
      "external-one": "catalog:",
    },
    devDependencies: {
      "@agent-teams/docs-protocol": "0.1.0",
      "@agent-teams/engineering-foundation": "0.1.0",
      "external-tool": "catalog:compatibility",
    },
  };
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireSuccess("valid dependency specifiers", run(temporaryRoot));
  requireFoundationSuccess(
    "valid dependency specifiers",
    runFoundation(temporaryRoot),
  );

  validConsumerManifest.dependencies["external-one"] = "1.2.3";
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireFailure(
    "direct external version",
    run(temporaryRoot),
    "external and must use catalog:",
  );
  requireFoundationViolation(
    "direct external version",
    runFoundation(temporaryRoot),
    "workspace.dependency-declarations.external-version-not-cataloged",
  );

  validConsumerManifest.dependencies["external-one"] = "catalog:";
  validConsumerManifest.dependencies["@agent-teams/internal"] = "0.0.0";
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireFailure(
    "direct internal version",
    run(temporaryRoot),
    "internal and must use the workspace: protocol",
  );
  requireFoundationViolation(
    "direct internal version",
    runFoundation(temporaryRoot),
    "workspace.dependency-declarations.internal-dependency-without-workspace-protocol",
  );

  validConsumerManifest.dependencies["@agent-teams/internal"] = "workspace:*";
  validConsumerManifest.dependencies["external-missing"] = "catalog:";
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireFailure(
    "missing catalog entry",
    run(temporaryRoot),
    "external-missing is missing from catalog default",
  );
  requireFoundationViolation(
    "missing catalog entry",
    runFoundation(temporaryRoot),
    "workspace.dependency-declarations.catalog-reference-missing",
  );
  delete validConsumerManifest.dependencies["external-missing"];

  validConsumerManifest.dependencies[
    "@agent-teams/engineering-foundation"
  ] = "0.1.0";
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireFailure(
    "foundation runtime dependency",
    run(temporaryRoot),
    "allowed only as an exact devDependency",
  );
  requireFoundationViolation(
    "foundation runtime dependency",
    runFoundation(temporaryRoot),
    "workspace.dependency-declarations.development-only-package-in-runtime-section",
  );
  delete validConsumerManifest.dependencies[
    "@agent-teams/engineering-foundation"
  ];

  validConsumerManifest.devDependencies[
    "@agent-teams/engineering-foundation"
  ] = "^0.1.0";
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireFailure(
    "inexact foundation dev dependency",
    run(temporaryRoot),
    "must use an exact registry version",
  );
  requireFoundationViolation(
    "inexact foundation dev dependency",
    runFoundation(temporaryRoot),
    "workspace.dependency-declarations.exact-registry-development-only-package-version-not-exact",
  );
  validConsumerManifest.devDependencies[
    "@agent-teams/engineering-foundation"
  ] = "0.1.0";

  const consumerSourceRoot = path.join(
    temporaryRoot,
    "packages/consumer/src/features/example",
  );
  await mkdir(consumerSourceRoot, { recursive: true });
  const consumerSourcePath = path.join(consumerSourceRoot, "index.ts");
  await writeFile(
    consumerSourcePath,
    'import "@agent-teams/engineering-foundation";\n',
  );
  await writeJson(consumerManifestPath, validConsumerManifest);
  requireFailure(
    "foundation production import",
    run(temporaryRoot),
    "production source cannot import @agent-teams/engineering-foundation",
  );
  requireFoundationSuccess(
    "production import is outside declaration capability",
    runFoundation(temporaryRoot),
  );
  await writeFile(
    consumerSourcePath,
    `// import "@agent-teams/engineering-foundation";
export const documentationExample =
  'import "@agent-teams/engineering-foundation"';
`,
  );
  requireSuccess(
    "foundation text in comments and strings",
    run(temporaryRoot),
  );
  await writeFile(
    consumerSourcePath,
    'export const foundation = import("@agent-teams/engineering-foundation/cli");\n',
  );
  requireFailure(
    "dynamic foundation production import",
    run(temporaryRoot),
    "production source cannot import @agent-teams/engineering-foundation",
  );
  requireFoundationSuccess(
    "dynamic production import is outside declaration capability",
    runFoundation(temporaryRoot),
  );
  await writeFile(
    consumerSourcePath,
    'import "@agent-teams/docs-protocol";\n',
  );
  requireFailure(
    "docs protocol production import",
    run(temporaryRoot),
    "production source cannot import @agent-teams/docs-protocol",
  );
  requireFoundationSuccess(
    "docs protocol production import is outside declaration capability",
    runFoundation(temporaryRoot),
  );
  await rm(path.join(temporaryRoot, "packages/consumer/src"), {
    recursive: true,
  });
  requireSuccess(
    "restored exact dev-only foundation dependency",
    run(temporaryRoot),
  );

  const workspacePath = path.join(temporaryRoot, "pnpm-workspace.yaml");
  const workspaceSource = await readFile(workspacePath, "utf8");
  await writeFile(
    workspacePath,
    workspaceSource.replace("external-one: 1.2.3", "external-one: ^1.2.3"),
  );
  requireFailure(
    "inexact catalog version",
    run(temporaryRoot),
    "must use an exact registry version",
  );
  requireFoundationViolation(
    "inexact catalog version",
    runFoundation(temporaryRoot),
    "workspace.dependency-declarations.catalog-version-not-exact",
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log("Dependency specifier conformance passed.");
