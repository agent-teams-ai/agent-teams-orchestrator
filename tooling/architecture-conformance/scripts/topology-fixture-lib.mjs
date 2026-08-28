import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function qualifiedLibraryScripts() {
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

export function qualifiedLibraryExports(additional = {}) {
  return {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    },
    ...additional,
  };
}

export async function writeRootReferences(root, references) {
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

export async function writeDossier(root, status) {
  const dossierRoot = path.join(root, "docs/domain/contexts/work-coordination");
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

export async function writePlatformOwner(root) {
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

export async function writeMaterializationGate(root) {
  const decisionsRoot = path.join(root, "docs/open-decisions");
  await mkdir(decisionsRoot, { recursive: true });
  await writeFile(
    path.join(decisionsRoot, "OD-999-fixture-materialization.md"),
    `---
id: OD-999
type: open-decision
status: open
owner: architecture
summary: Keeps fixture package materialization deferred.
---
`,
  );
}

export async function writeFeatureReadme(
  featureRoot,
  { id, owner, ownerDocument, status = "accepted" },
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

export async function writeEmptyMaterializationPolicy(root, schemaPath) {
  const architectureRoot = path.join(root, "architecture");
  await mkdir(architectureRoot, { recursive: true });
  await Promise.all([
    cp(
      schemaPath,
      path.join(architectureRoot, "package-materialization-policy.schema.json"),
    ),
    writeFile(
      path.join(architectureRoot, "package-materialization-policy.yaml"),
      "version: 1\nentries: []\n",
    ),
  ]);
}

export async function writeCatalog(root, schemaPaths) {
  const architectureRoot = path.join(root, "architecture");
  await mkdir(architectureRoot, { recursive: true });
  await cp(
    schemaPaths.dependencyPolicy,
    path.join(architectureRoot, "source-dependency-policy.schema.json"),
  );
  await writeEmptyMaterializationPolicy(root, schemaPaths.materializationPolicy);
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
  const foundationRoot = path.join(architectureRoot, "foundation");
  await mkdir(foundationRoot, { recursive: true });
  await writeFile(
    path.join(foundationRoot, "scaffolding.yaml"),
    `schemaVersion: 1
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
feature_edges: []
`,
  );
}

export async function materializeContext(root) {
  const packageRoot = path.join(root, "packages/contexts/work-coordination");
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

export async function materializeApp(root) {
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
        dependencies: { "@agent-teams/work-coordination": "workspace:*" },
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
