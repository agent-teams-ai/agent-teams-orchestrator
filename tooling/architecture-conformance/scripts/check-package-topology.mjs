import { spawnSync } from "node:child_process";
import {
  cp,
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
const validator = path.join(
  repositoryRoot,
  "scripts/architecture/validate-package-topology.mjs",
);
const scaffolder = path.join(
  repositoryRoot,
  "scripts/architecture/scaffold-package.mjs",
);
const catalogSchema = path.join(
  repositoryRoot,
  "architecture/package-catalog.schema.json",
);
const dependencyPolicySchema = path.join(
  repositoryRoot,
  "architecture/source-dependency-policy.schema.json",
);

function run(root) {
  return spawnSync(process.execPath, [validator, "--root", root], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
  });
}

function runScaffolder(root, id, options = {}) {
  return spawnSync(
    process.execPath,
    [
      scaffolder,
      "--root",
      root,
      "--id",
      id,
      ...(options.dryRun ? ["--dry-run"] : []),
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
      },
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

async function writeDossier(root, status) {
  const dossierRoot = path.join(
    root,
    "docs/domain/contexts/work-coordination",
  );
  await mkdir(dossierRoot, { recursive: true });
  await writeFile(
    path.join(dossierRoot, "README.md"),
    `---
id: domain.contexts.work-coordination
type: bounded-context
status: ${status}
owner: work-coordination
summary: Owns task lifecycle and coordination behavior for topology fixtures.
---
`,
  );
}

async function writePlatformOwner(root) {
  const architectureRoot = path.join(root, "docs/architecture");
  await mkdir(architectureRoot, { recursive: true });
  await writeFile(
    path.join(architectureRoot, "platform-test.md"),
    `---
id: architecture.platform-test
type: architecture
status: accepted
owner: architecture
summary: Owns the test platform package for topology fixtures.
---
`,
  );
}

async function writeFeatureReadme(
  featureRoot,
  {
    id,
    owner,
    ownerDocument,
    status = "accepted",
  },
) {
  await writeFile(
    path.join(featureRoot, "README.md"),
    `---
id: ${id}
type: feature
status: ${status}
owner: ${owner}
summary: Owns concrete source behavior used by package topology conformance fixtures.
related:
  - ${ownerDocument}
---

# Fixture Feature
`,
  );
}

async function writeCatalog(root) {
  const architectureRoot = path.join(root, "architecture");
  await mkdir(architectureRoot, { recursive: true });
  await cp(
    catalogSchema,
    path.join(architectureRoot, "package-catalog.schema.json"),
  );
  await cp(
    dependencyPolicySchema,
    path.join(architectureRoot, "source-dependency-policy.schema.json"),
  );
  await writeFile(
    path.join(architectureRoot, "package-catalog.yaml"),
    `version: 1
packages:
  - id: context.work-coordination
    role: bounded-context
    path: packages/contexts/work-coordination
    package_name: "@agent-teams/work-coordination"
    owner_document: domain.contexts.work-coordination
  - id: platform.test
    role: platform
    path: packages/platform/test
    package_name: "@agent-teams/platform-test"
    owner_document: architecture.platform-test
  - id: app.test
    role: app
    path: apps/test
    package_name: "@agent-teams/app-test"
    owner_document: architecture.platform-test
`,
  );
  await writeFile(
    path.join(architectureRoot, "source-dependency-policy.yaml"),
    `version: 1
default: deny
edges:
  - from: app.test
    to: context.work-coordination
    imports:
      - ./module
`,
  );
}

async function materializeContext(root) {
  const packageRoot = path.join(
    root,
    "packages/contexts/work-coordination",
  );
  await mkdir(path.join(packageRoot, "src/features/task-model"), {
    recursive: true,
  });
  await writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name: "@agent-teams/work-coordination",
        private: true,
        type: "module",
        exports: {
          ".": "./src/index.ts",
        },
        agentTeamsArchitecture: {
          role: "bounded-context",
          ownerDocument: "domain.contexts.work-coordination",
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(packageRoot, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { strict: true } }, null, 2),
  );
  await writeFile(path.join(packageRoot, "src/index.ts"), "export {};\n");
  await writeFile(
    path.join(packageRoot, "src/features/task-model/index.ts"),
    "export {};\n",
  );
  await writeFeatureReadme(
    path.join(packageRoot, "src/features/task-model"),
    {
      id: "feature.work-coordination.task-model",
      owner: "work-coordination/task-model",
      ownerDocument: "domain.contexts.work-coordination",
    },
  );
}

async function materializeApp(root) {
  const packageRoot = path.join(root, "apps/test");
  const featureRoot = path.join(packageRoot, "src/features/launch");
  await mkdir(featureRoot, { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name: "@agent-teams/app-test",
        private: true,
        type: "module",
        dependencies: {
          "@agent-teams/work-coordination": "workspace:*",
        },
        agentTeamsArchitecture: {
          role: "app",
          ownerDocument: "architecture.platform-test",
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(packageRoot, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { strict: true } }, null, 2),
  );
  await writeFile(
    path.join(featureRoot, "index.ts"),
    'import "@agent-teams/work-coordination/module";\n',
  );
  await writeFeatureReadme(featureRoot, {
    id: "feature.app-test.launch",
    owner: "apps/test",
    ownerDocument: "architecture.platform-test",
  });
}

const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "agent-teams-topology-"),
);

try {
  await writeCatalog(temporaryRoot);
  await writeDossier(temporaryRoot, "proposed");
  await writePlatformOwner(temporaryRoot);
  requireSuccess(
    "reserved proposed context",
    run(temporaryRoot),
  );
  requireFailure(
    "scaffold proposed context",
    runScaffolder(temporaryRoot, "context.work-coordination"),
    "must be accepted or active before scaffolding",
  );

  await materializeContext(temporaryRoot);
  requireFailure(
    "materialized proposed context",
    run(temporaryRoot),
    "code package requires accepted or active ownership",
  );

  await writeDossier(temporaryRoot, "accepted");
  requireSuccess(
    "materialized accepted context",
    run(temporaryRoot),
  );

  await rm(
    path.join(temporaryRoot, "packages/contexts/work-coordination"),
    { recursive: true },
  );
  requireSuccess(
    "scaffold accepted context",
    runScaffolder(temporaryRoot, "context.work-coordination"),
  );
  requireFailure(
    "package-only scaffold",
    run(temporaryRoot),
    "requires at least one real source file in an accepted feature slice",
  );
  const scaffoldedFeatureRoot = path.join(
    temporaryRoot,
    "packages/contexts/work-coordination/src/features/task-model",
  );
  await mkdir(scaffoldedFeatureRoot, { recursive: true });
  await writeFile(
    path.join(scaffoldedFeatureRoot, "index.ts"),
    "export interface TaskFixture { readonly id: string; }\n",
  );
  requireFailure(
    "feature source without documentation",
    run(temporaryRoot),
    "requires colocated",
  );
  await writeFeatureReadme(scaffoldedFeatureRoot, {
    id: "feature.work-coordination.task-model",
    owner: "work-coordination/task-model",
    ownerDocument: "domain.contexts.work-coordination",
    status: "proposed",
  });
  requireFailure(
    "proposed feature metadata",
    run(temporaryRoot),
    "status accepted",
  );
  await writeFeatureReadme(scaffoldedFeatureRoot, {
    id: "feature.work-coordination.task-model",
    owner: "work-coordination/task-model",
    ownerDocument: "domain.contexts.work-coordination",
  });
  requireSuccess(
    "scaffolded accepted context",
    run(temporaryRoot),
  );

  await writeFile(
    path.join(
      temporaryRoot,
      "packages/contexts/work-coordination/src/rogue.ts",
    ),
    "export {};\n",
  );
  requireFailure(
    "source outside feature ownership",
    run(temporaryRoot),
    "production source must belong to src/features/**",
  );
  await rm(
    path.join(
      temporaryRoot,
      "packages/contexts/work-coordination/src/rogue.ts",
    ),
  );

  const unknownRoot = path.join(temporaryRoot, "packages/shared");
  await mkdir(unknownRoot, { recursive: true });
  await writeFile(
    path.join(unknownRoot, "package.json"),
    JSON.stringify({ name: "@agent-teams/shared" }),
  );
  requireFailure(
    "uncataloged package",
    run(temporaryRoot),
    "production file is outside the package catalog",
  );

  const manifestPath = path.join(
    temporaryRoot,
    "packages/contexts/work-coordination/package.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.name = "@agent-teams/wrong-name";
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "package name mismatch",
    run(temporaryRoot),
    "name must be @agent-teams/work-coordination",
  );

  manifest.name = "@agent-teams/work-coordination";
  manifest.dependencies = {
    "@agent-teams/unknown": "workspace:*",
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "unknown internal dependency",
    run(temporaryRoot),
    "internal dependency @agent-teams/unknown is not registered",
  );

  delete manifest.dependencies;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await rm(unknownRoot, { recursive: true });
  manifest.exports = {
    ".": "./src/index.ts",
    "./module": "./src/module.ts",
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeFile(
    path.join(
      temporaryRoot,
      "packages/contexts/work-coordination/src/module.ts",
    ),
    "export const workCoordinationModuleFixture = true;\n",
  );
  await materializeApp(temporaryRoot);
  requireSuccess(
    "materialized app with accepted feature and public package import",
    run(temporaryRoot),
  );
  const appFeaturePath = path.join(
    temporaryRoot,
    "apps/test/src/features/launch/index.ts",
  );
  const appManifestPath = path.join(temporaryRoot, "apps/test/package.json");
  const appManifest = JSON.parse(await readFile(appManifestPath, "utf8"));
  delete appManifest.dependencies;
  await writeFile(appManifestPath, JSON.stringify(appManifest, null, 2));
  requireFailure(
    "undeclared internal package import",
    run(temporaryRoot),
    "is not declared in apps/test/package.json",
  );
  appManifest.dependencies = {
    "@agent-teams/work-coordination": "workspace:*",
  };
  await writeFile(appManifestPath, JSON.stringify(appManifest, null, 2));
  const dependencyPolicyPath = path.join(
    temporaryRoot,
    "architecture/source-dependency-policy.yaml",
  );
  await writeFile(
    dependencyPolicyPath,
    "version: 1\ndefault: deny\nedges: []\n",
  );
  requireFailure(
    "undeclared source dependency edge",
    run(temporaryRoot),
    "source dependency app.test -> context.work-coordination is denied by default",
  );
  await writeFile(
    dependencyPolicyPath,
    "version: 1\ndefault: deny\nedges:\n  - from: app.test\n    to: context.work-coordination\n    imports:\n      - ./module\n",
  );
  await writeFile(
    appFeaturePath,
    'import "@agent-teams/work-coordination/src/features/task-model";\n',
  );
  requireFailure(
    "deep internal source import",
    run(temporaryRoot),
    "bypasses package exports",
  );
  await writeFile(
    appFeaturePath,
    'import "@agent-teams/work-coordination/private";\n',
  );
  requireFailure(
    "unexported internal package subpath",
    run(temporaryRoot),
    "is not exported by @agent-teams/work-coordination",
  );
  const contextManifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  );
  contextManifest.exports = {
    ".": "./src/index.ts",
    "./module": "./src/module.ts",
    "./*": "./src/*.ts",
    "./blocked/*": null,
  };
  await writeFile(
    manifestPath,
    JSON.stringify(contextManifest, null, 2),
  );
  await writeFile(
    appFeaturePath,
    'import "@agent-teams/work-coordination/blocked/internal";\n',
  );
  requireFailure(
    "null export overrides a broader wildcard",
    run(temporaryRoot),
    "is not exported by @agent-teams/work-coordination",
  );
  contextManifest.exports = {
    ".": "./src/index.ts",
    "./module": "./src/module.ts",
  };
  await writeFile(
    manifestPath,
    JSON.stringify(contextManifest, null, 2),
  );
  await writeFile(
    appFeaturePath,
    'import "@agent-teams/work-coordination/module";\n',
  );
  await writeFile(
    path.join(temporaryRoot, "apps/test/src/rogue.ts"),
    "export {};\n",
  );
  requireFailure(
    "app source outside feature or assembly",
    run(temporaryRoot),
    "production source must belong to src/features/**",
  );
  await rm(path.join(temporaryRoot, "apps/test/src/rogue.ts"));
  requireSuccess("restored valid app topology", run(temporaryRoot));

  await writeFile(
    appFeaturePath,
    'import "../../../../../packages/contexts/work-coordination/src/module.ts";\n',
  );
  requireFailure(
    "cross-package relative import",
    run(temporaryRoot),
    "bypasses the source dependency policy",
  );
  await writeFile(
    appFeaturePath,
    'import "@agent-teams/work-coordination/module";\n',
  );
  await writeFile(
    dependencyPolicyPath,
    "version: 1\ndefault: deny\nedges:\n  - from: app.test\n    to: context.work-coordination\n    imports:\n      - ./module\n  - from: context.work-coordination\n    to: app.test\n    imports:\n      - ./module\n",
  );
  requireFailure(
    "source dependency cycle",
    run(temporaryRoot),
    "source dependency cycle",
  );
  await writeFile(
    dependencyPolicyPath,
    "version: 1\ndefault: deny\nedges:\n  - from: app.test\n    to: context.work-coordination\n    imports:\n      - ./module\n",
  );
  requireSuccess("restored source dependency policy", run(temporaryRoot));

  requireSuccess(
    "scaffold platform package",
    runScaffolder(temporaryRoot, "platform.test"),
  );
  const platformFeatureRoot = path.join(
    temporaryRoot,
    "packages/platform/test/src/features/test-capability",
  );
  await mkdir(platformFeatureRoot, { recursive: true });
  await writeFile(
    path.join(platformFeatureRoot, "index.ts"),
    "export const platformFixture = true;\n",
  );
  await writeFeatureReadme(platformFeatureRoot, {
    id: "feature.platform-test.test-capability",
    owner: "architecture/tooling",
    ownerDocument: "architecture.platform-test",
  });
  const platformManifestPath = path.join(
    temporaryRoot,
    "packages/platform/test/package.json",
  );
  const platformManifest = JSON.parse(
    await readFile(platformManifestPath, "utf8"),
  );
  platformManifest.dependencies = {
    "@agent-teams/work-coordination": "workspace:*",
  };
  await writeFile(
    platformManifestPath,
    JSON.stringify(platformManifest, null, 2),
  );
  requireFailure(
    "platform depends on business context",
    run(temporaryRoot),
    "role platform cannot depend on bounded-context package",
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log("Package topology conformance passed.");
