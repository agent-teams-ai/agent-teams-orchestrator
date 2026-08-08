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

function runScaffolder(root, id) {
  const planPath = `.agent-teams-local/scaffolding-plans/${id}.json`;
  const planned = spawnSync(
    process.execPath,
    [
      scaffolder,
      "plan",
      "--root",
      root,
      "--id",
      id,
      "--plan",
      planPath,
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
  if (planned.status !== 0) {
    return planned;
  }
  return spawnSync(
    process.execPath,
    [
      scaffolder,
      "apply",
      "--root",
      root,
      "--plan",
      planPath,
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

function qualifiedLibraryScripts() {
  return {
    build: "tsc --project tsconfig.json --pretty false",
    check:
      "pnpm run clean && pnpm run typecheck && pnpm run build && pnpm run test",
    clean:
      "node -e \"const fs=require('node:fs'); for (const path of ['dist','.cache']) fs.rmSync(path, { recursive: true, force: true })\"",
    prepack: "pnpm run clean && pnpm run build",
    test: "node --test --test-concurrency=1",
    typecheck: "tsc --project tsconfig.json --noEmit --pretty false",
  };
}

function qualifiedLibraryExports(additional = {}) {
  return {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    },
    ...additional,
  };
}

async function writeRootReferences(root, references) {
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: { noEmit: true },
        files: [],
        references: references.map((reference) => ({ path: `./${reference}` })),
      },
      null,
      2,
    ),
  );
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
    `version: 2
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
  const foundationRoot = path.join(architectureRoot, "foundation");
  await mkdir(foundationRoot, { recursive: true });
  await writeFile(
    path.join(foundationRoot, "scaffolding.yaml"),
    `schemaVersion: 2
projectId: package-topology-conformance
targetCatalogPath: architecture/package-catalog.yaml
compositions:
  - id: orchestrator-library-boundary
    scaffoldProfile:
      ref:
        id: foundation.node-typescript-pnpm-esm
        contractVersion: 1
      parameters:
        tsconfigBase: tsconfig.json
    recipe:
      ref:
        id: foundation.node-typescript-library-boundary
        contractVersion: 1
    targetRoles:
      - bounded-context
      - integration
      - platform
      - sdk
      - testing
    authorityVerifiers:
      - id: foundation.markdown-yaml-owner
        contractVersion: 1
        parameters:
          allowedStatuses:
            - accepted
            - active
          documentRoots:
            - docs
    policies: []
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
        files: ["dist"],
        scripts: qualifiedLibraryScripts(),
        exports: qualifiedLibraryExports(),
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
    "Owner document status is not admitted by the selected Composition",
  );

  await materializeContext(temporaryRoot);
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination",
  ]);
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
  requireFailure(
    "stale project reference",
    run(temporaryRoot),
    "points to an unmaterialized catalog package",
  );
  await writeRootReferences(temporaryRoot, []);
  requireSuccess(
    "scaffold accepted context",
    runScaffolder(temporaryRoot, "context.work-coordination"),
  );
  const scaffoldedManifestPath = path.join(
    temporaryRoot,
    "packages/contexts/work-coordination/package.json",
  );
  const scaffoldedManifest = JSON.parse(
    await readFile(scaffoldedManifestPath, "utf8"),
  );
  if (
    JSON.stringify(scaffoldedManifest.scripts) !==
      JSON.stringify(qualifiedLibraryScripts()) ||
    JSON.stringify(scaffoldedManifest.exports) !==
      JSON.stringify(qualifiedLibraryExports()) ||
    JSON.stringify(scaffoldedManifest.files) !== JSON.stringify(["dist"])
  ) {
    throw new Error("scaffolder did not emit the qualified library manifest");
  }
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination",
  ]);
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
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination/",
  ]);
  requireSuccess(
    "project reference with trailing slash",
    run(temporaryRoot),
  );
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination/tsconfig.json",
  ]);
  requireSuccess(
    "project reference to explicit tsconfig",
    run(temporaryRoot),
  );
  await writeFile(
    path.join(temporaryRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: { noEmit: true },
        files: [],
        references: [{ path: "C:\\outside\\tsconfig.json" }],
      },
      null,
      2,
    ),
  );
  requireFailure(
    "Windows absolute project reference",
    run(temporaryRoot),
    "every project reference requires a relative in-repository path",
  );
  await writeFile(
    path.join(temporaryRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: { noEmit: true },
        files: [],
        references: [{ path: "C:outside\\tsconfig.json" }],
      },
      null,
      2,
    ),
  );
  requireFailure(
    "Windows drive-relative project reference",
    run(temporaryRoot),
    "every project reference requires a relative in-repository path",
  );
  await writeFile(
    path.join(temporaryRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: { noEmit: true },
        files: [],
        references: [{ path: "\\\\server\\share\\tsconfig.json" }],
      },
      null,
      2,
    ),
  );
  requireFailure(
    "UNC absolute project reference",
    run(temporaryRoot),
    "every project reference requires a relative in-repository path",
  );
  await writeRootReferences(temporaryRoot, []);
  requireFailure(
    "missing project reference",
    run(temporaryRoot),
    "must appear exactly once in project references (found 0)",
  );
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination/",
    "packages/contexts/work-coordination/tsconfig.json",
  ]);
  requireFailure(
    "duplicate project reference",
    run(temporaryRoot),
    "must appear exactly once in project references (found 2)",
  );
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination",
  ]);

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
  await rm(unknownRoot, { recursive: true });

  const manifestPath = path.join(
    temporaryRoot,
    "packages/contexts/work-coordination/package.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  delete manifest.scripts.test;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library without test gate",
    run(temporaryRoot),
    "materialized library requires a test script",
  );
  manifest.scripts.test = "node --test";
  delete manifest.type;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library without module type",
    run(temporaryRoot),
    "materialized library requires type module",
  );
  manifest.type = "module";
  manifest.exports = qualifiedLibraryExports();
  manifest.exports["."].types = "./dist/index.js";
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library with invalid declaration export",
    run(temporaryRoot),
    "library export . requires a normalized dist declaration target",
  );
  manifest.exports = qualifiedLibraryExports();
  delete manifest.exports["."].types;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library without declaration export",
    run(temporaryRoot),
    "library export . requires a normalized dist declaration target",
  );
  manifest.exports = qualifiedLibraryExports();
  manifest.exports["."].import = "./dist/index.d.ts";
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library with invalid ESM export",
    run(temporaryRoot),
    "library export . requires a normalized dist ESM import target",
  );
  manifest.exports = qualifiedLibraryExports();
  delete manifest.exports["."].import;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library without ESM export",
    run(temporaryRoot),
    "library export . requires a normalized dist ESM import target",
  );
  manifest.exports = qualifiedLibraryExports({
    "./module": {
      import: "./dist/module.js",
    },
  });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library subpath without declaration export",
    run(temporaryRoot),
    "library export ./module requires a normalized dist declaration target",
  );
  manifest.exports = { ".": "./src/index.ts" };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library with source-only export",
    run(temporaryRoot),
    "library exports must reference built artifacts",
  );
  manifest.exports = { ".": "./dist/../src/index.js" };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library export traversal",
    run(temporaryRoot),
    "library exports must reference built artifacts",
  );
  manifest.exports = qualifiedLibraryExports();
  manifest.exports["."].import = "./dist/%2e/index.js";
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library export with encoded dot segment",
    run(temporaryRoot),
    "library export . requires a normalized dist ESM import target",
  );
  manifest.exports = qualifiedLibraryExports();
  manifest.files = [];
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireFailure(
    "library without packed dist",
    run(temporaryRoot),
    "materialized library files must include dist",
  );
  manifest.files = ["dist"];
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
  manifest.exports = qualifiedLibraryExports({
    "./generated": {
      types: "./dist/generated/index.d.ts",
      import: "./dist/generated/index.js",
    },
  });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  requireSuccess(
    "library exports may precede generated build output",
    run(temporaryRoot),
  );
  manifest.exports = qualifiedLibraryExports({
    "./module": {
      types: "./dist/module.d.ts",
      import: "./dist/module.js",
    },
  });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeFile(
    path.join(
      temporaryRoot,
      "packages/contexts/work-coordination/src/module.ts",
    ),
    "export const workCoordinationModuleFixture = true;\n",
  );
  await materializeApp(temporaryRoot);
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination",
    "apps/test",
  ]);
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
    ...qualifiedLibraryExports({
      "./module": {
        types: "./dist/module.d.ts",
        import: "./dist/module.js",
      },
    }),
    "./*": {
      types: "./dist/*.d.ts",
      import: "./dist/*.js",
    },
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
  contextManifest.exports = qualifiedLibraryExports({
    "./module": {
      types: "./dist/module.d.ts",
      import: "./dist/module.js",
    },
  });
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
    "await import(`@agent-teams/work-coordination/module`);\n",
  );
  requireSuccess("static template import", run(temporaryRoot));
  await writeFile(
    appFeaturePath,
    "await import(`@agent-teams/work-coordination/private`);\n",
  );
  requireFailure(
    "template import outside allowed surface",
    run(temporaryRoot),
    "is not an allowed surface",
  );
  await writeFile(
    appFeaturePath,
    "const surface = 'module';\nawait import(`@agent-teams/work-coordination/${surface}`);\n",
  );
  requireFailure(
    "dynamic template import",
    run(temporaryRoot),
    "non-literal import module specifier",
  );
  await writeFile(
    appFeaturePath,
    "const surface = 'module';\nawait import('@agent-teams/work-coordination/' + surface);\n",
  );
  requireFailure(
    "concatenated import",
    run(temporaryRoot),
    "non-literal import module specifier",
  );
  await writeFile(
    appFeaturePath,
    "await import(`@agent-teams\\u002fwork-coordination/private`);\n",
  );
  requireFailure(
    "escaped template import",
    run(temporaryRoot),
    "is not an allowed surface",
  );
  await writeFile(
    appFeaturePath,
    "import '@agent-teams\\u002fwork-coordination/private';\n",
  );
  requireFailure(
    "escaped side-effect import",
    run(temporaryRoot),
    "is not an allowed surface",
  );
  await writeFile(
    appFeaturePath,
    "const marker = /https?:\\/\\/example/;\nawait import(`@agent-teams/work-coordination/private`);\n",
  );
  requireFailure(
    "regex before template import",
    run(temporaryRoot),
    "is not an allowed surface",
  );

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
  await writeRootReferences(temporaryRoot, [
    "packages/contexts/work-coordination",
    "apps/test",
    "packages/platform/test",
  ]);
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
