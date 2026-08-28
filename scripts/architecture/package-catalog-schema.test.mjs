import assert from "node:assert/strict";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import YAML from "yaml";

import {
  validateOrchestratorPackageCatalog,
} from "./package-catalog-policy.mjs";
import {
  engineeringFoundationPackage,
  loadCanonicalPackageCatalogSchema,
  packageCatalogSchemaId,
  packageCatalogSchemaSpecifier,
  packageManifestSpecifier,
} from "./package-catalog-schema.mjs";
import { loadPackageTopologyInputs } from "./package-topology-inputs.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const foundationVersion = "0.19.0";
const canonicalSchemaPath = path.join(
  repositoryRoot,
  "node_modules",
  ...engineeringFoundationPackage.split("/"),
  "schemas/scaffold-target-catalog/v1.schema.json",
);
const canonicalSchemaSource = await readFile(canonicalSchemaPath, "utf8");
const canonicalSchema = JSON.parse(canonicalSchemaSource);

function validEntry(overrides = {}) {
  return {
    id: "platform.schema-regression",
    role: "platform",
    path: "packages/platform/schema-regression",
    package_name: "@agent-teams/schema-regression",
    owner_document: "architecture.schema-regression",
    ...overrides,
  };
}

function catalogWith(entry, overrides = {}) {
  return { version: 1, packages: [entry], ...overrides };
}

async function registryStatus(consumerRoot, packageRoot, overrides = {}) {
  const canonicalConsumerRoot = await realpath(consumerRoot);
  const canonicalPackageRoot = await realpath(packageRoot);
  return {
    mode: "REGISTRY",
    consumerRoot: canonicalConsumerRoot,
    dependencySpec: foundationVersion,
    installedPackageRoot: canonicalPackageRoot,
    installedVersion: foundationVersion,
    lockfilePath: path.join(canonicalConsumerRoot, "pnpm-lock.yaml"),
    lockfilePackageKey: `${engineeringFoundationPackage}@${foundationVersion}`,
    registryIntegrity: "sha512-Zml4dHVyZQ==",
    issues: [],
    ...overrides,
  };
}

async function localStatus(consumerRoot, packageRoot, overrides = {}) {
  const canonicalConsumerRoot = await realpath(consumerRoot);
  const canonicalPackageRoot = await realpath(packageRoot);
  return {
    mode: "LOCAL",
    consumerRoot: canonicalConsumerRoot,
    dependencySpec: foundationVersion,
    installedPackageRoot: canonicalPackageRoot,
    installedVersion: foundationVersion,
    issues: [],
    linkState: {
      schemaVersion: 1,
      phase: "LOCAL",
      consumerRoot: canonicalConsumerRoot,
      targetPackageRoot: canonicalPackageRoot,
      registryBackupPath: path.join(
        canonicalConsumerRoot,
        ".agent-teams-local/registry-backup",
      ),
      registryEntryKind: "directory",
      registryPackageRoot: path.join(
        canonicalConsumerRoot,
        "node_modules",
        ...engineeringFoundationPackage.split("/"),
      ),
      packageVersion: foundationVersion,
      gitCommit: "a".repeat(40),
      gitDirty: false,
      attachedAt: "2026-08-28T00:00:00.000Z",
    },
    ...overrides,
  };
}

async function createAuthorityFixture(t, { mode = "REGISTRY" } = {}) {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-catalog-authority-"),
  );
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const consumerRoot = path.join(temporaryRoot, "consumer");
  const packageRoot =
    mode === "LOCAL"
      ? path.join(temporaryRoot, "foundation-source")
      : path.join(
          consumerRoot,
          "node_modules",
          ...engineeringFoundationPackage.split("/"),
        );
  const installedEntry = path.join(
    consumerRoot,
    "node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  await Promise.all([
    mkdir(packageRoot, { recursive: true }),
    mkdir(path.dirname(installedEntry), { recursive: true }),
  ]);
  if (mode === "LOCAL") {
    await symlink(
      packageRoot,
      installedEntry,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  await Promise.all([
    writeFile(
      path.join(consumerRoot, "package.json"),
      JSON.stringify({
        devDependencies: { [engineeringFoundationPackage]: foundationVersion },
      }),
    ),
    writeFile(path.join(consumerRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n"),
    writeFile(
      path.join(packageRoot, "package.json"),
      JSON.stringify({
        name: engineeringFoundationPackage,
        version: foundationVersion,
      }),
    ),
    writeFile(
      path.join(packageRoot, "v1.schema.json"),
      canonicalSchemaSource,
    ),
  ]);
  const schemaPath = path.join(packageRoot, "v1.schema.json");
  const manifestPath = path.join(packageRoot, "package.json");
  let status =
    mode === "LOCAL"
      ? await localStatus(consumerRoot, packageRoot)
      : await registryStatus(consumerRoot, packageRoot);
  let resolver = (specifier) => {
    assert.ok(
      [packageManifestSpecifier, packageCatalogSchemaSpecifier].includes(
        specifier,
      ),
    );
    return pathToFileURL(
      specifier === packageManifestSpecifier ? manifestPath : schemaPath,
    ).href;
  };
  return {
    consumerRoot,
    manifestPath,
    packageRoot,
    schemaPath,
    get resolver() {
      return resolver;
    },
    set resolver(value) {
      resolver = value;
    },
    get status() {
      return status;
    },
    set status(value) {
      status = value;
    },
    async load(overrides = {}) {
      return loadCanonicalPackageCatalogSchema({
        consumerRoot,
        loadFoundationLocalMode: async () => ({
          inspectFoundationMode: async () => status,
        }),
        resolvePackageExport: resolver,
        ...overrides,
      });
    },
  };
}

async function createInputFixture(t) {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-catalog-inputs-"),
  );
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const root = path.join(temporaryRoot, "consumer");
  const packageRoot = path.join(temporaryRoot, "foundation-source");
  const installedEntry = path.join(
    root,
    "node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  const schemaPath = path.join(
    packageRoot,
    "schemas/scaffold-target-catalog/v1.schema.json",
  );
  const architectureRoot = path.join(root, "architecture");
  await Promise.all([
    mkdir(architectureRoot, { recursive: true }),
    mkdir(path.join(root, "docs"), { recursive: true }),
    mkdir(path.dirname(installedEntry), { recursive: true }),
    mkdir(path.dirname(schemaPath), { recursive: true }),
  ]);
  await symlink(
    packageRoot,
    installedEntry,
    process.platform === "win32" ? "junction" : "dir",
  );
  await Promise.all([
    writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        devDependencies: { [engineeringFoundationPackage]: foundationVersion },
      }),
    ),
    writeFile(
      path.join(packageRoot, "package.json"),
      JSON.stringify({
        name: engineeringFoundationPackage,
        version: foundationVersion,
        exports: {
          "./package.json": "./package.json",
          "./schemas/*": "./schemas/*",
        },
      }),
    ),
    writeFile(schemaPath, canonicalSchemaSource),
    writeFile(
      path.join(architectureRoot, "package-materialization-policy.yaml"),
      "version: 1\nentries: []\n",
    ),
    writeFile(
      path.join(architectureRoot, "source-dependency-policy.yaml"),
      "version: 1\ndefault: deny\nedges: []\nfeature_edges: []\n",
    ),
    copyFile(
      path.join(
        repositoryRoot,
        "architecture/package-materialization-policy.schema.json",
      ),
      path.join(
        architectureRoot,
        "package-materialization-policy.schema.json",
      ),
    ),
    copyFile(
      path.join(repositoryRoot, "architecture/source-dependency-policy.schema.json"),
      path.join(architectureRoot, "source-dependency-policy.schema.json"),
    ),
  ]);
  const status = await localStatus(root, packageRoot);
  return {
    root,
    async validate(catalog, schema = canonicalSchema) {
      await Promise.all([
        writeFile(
          path.join(architectureRoot, "package-catalog.yaml"),
          YAML.stringify(catalog),
        ),
        writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`),
      ]);
      const errors = [];
      await loadPackageTopologyInputs(root, errors, {
        loadPackageCatalogSchema: async ({ consumerRoot }) => {
          assert.equal(consumerRoot, root);
          return loadCanonicalPackageCatalogSchema({
            consumerRoot,
            loadFoundationLocalMode: async () => ({
              inspectFoundationMode: async (inspectedRoot) => {
                assert.equal(inspectedRoot, await realpath(root));
                return status;
              },
            }),
          });
        },
      });
      return errors;
    },
  };
}

test("binds the exact registry schema through independent consumer-root resolution", async () => {
  const packageRoot = await realpath(
    path.join(
      repositoryRoot,
      "node_modules",
      ...engineeringFoundationPackage.split("/"),
    ),
  );
  const status = await registryStatus(repositoryRoot, packageRoot);
  let inspectedRoot;
  const authority = await loadCanonicalPackageCatalogSchema({
    consumerRoot: repositoryRoot,
    loadFoundationLocalMode: async () => ({
      inspectFoundationMode: async (consumerRoot) => {
        inspectedRoot = consumerRoot;
        return status;
      },
    }),
  });
  assert.equal(inspectedRoot, await realpath(repositoryRoot));
  assert.equal(authority.foundationVersion, foundationVersion);
  assert.equal(authority.schema.$id, packageCatalogSchemaId);
  assert.equal(authority.trustMode, "REGISTRY");
  assert.ok(authority.schemaPath.startsWith(`${packageRoot}${path.sep}`));
});

test("admits explicit guarded LOCAL schema development without relabeling trust", async (t) => {
  const fixture = await createAuthorityFixture(t, { mode: "LOCAL" });
  await writeFile(
    fixture.schemaPath,
    `${JSON.stringify({ $id: packageCatalogSchemaId })}\n`,
  );
  const authority = await fixture.load();
  assert.equal(authority.trustMode, "LOCAL");
  assert.deepEqual(authority.schema, { $id: packageCatalogSchemaId });
});

test("fails closed for table-driven provenance inspection cases", async (t) => {
  const fixture = await createAuthorityFixture(t);
  const cases = [
    {
      label: "missing inspector export",
      load: () => fixture.load({ loadFoundationLocalMode: async () => ({}) }),
      rule: /provenance\.inspector-export/u,
    },
    {
      label: "inspector throw",
      load: () =>
        fixture.load({
          loadFoundationLocalMode: async () => ({
            inspectFoundationMode: async () => {
              throw new Error("inspection failed");
            },
          }),
        }),
      rule: /provenance\.inspector-failure/u,
    },
    {
      label: "null status",
      status: null,
      rule: /provenance\.status/u,
    },
    {
      label: "malformed issues",
      status: { ...fixture.status, issues: "none" },
      rule: /provenance\.issues/u,
    },
    {
      label: "invalid mode",
      status: { ...fixture.status, mode: "INVALID" },
      rule: /provenance\.mode/u,
    },
    {
      label: "missing installed root",
      status: { ...fixture.status, installedPackageRoot: undefined },
      rule: /provenance\.field/u,
    },
    {
      label: "malformed LOCAL state",
      status: { ...fixture.status, mode: "LOCAL", linkState: { phase: "LOCAL" } },
      rule: /provenance\.local-state/u,
    },
  ];
  for (const candidate of cases) {
    await t.test(candidate.label, async () => {
      if (Object.hasOwn(candidate, "status")) {
        fixture.status = candidate.status;
      }
      await assert.rejects(candidate.load?.() ?? fixture.load(), candidate.rule);
      fixture.status = await registryStatus(
        fixture.consumerRoot,
        fixture.packageRoot,
      );
    });
  }
});

test("rejects independent identity and provenance mismatches", async (t) => {
  const cases = [
    ["wrong package name", "package", /authority\.package-identity/u],
    ["wrong package version", "version", /authority\.package-identity/u],
    ["non-exact declared version", "declared-version", /authority\.declared-version/u],
    ["wrong reported consumer root", "consumer-root", /provenance\.binding/u],
    ["wrong reported root", "root", /provenance\.binding/u],
    ["broad reported root", "broad-root", /provenance\.binding/u],
    ["non-empty issues", "issues", /provenance\.issues/u],
  ];
  for (const [label, mutation, expected] of cases) {
    await t.test(label, async (caseContext) => {
      const fixture = await createAuthorityFixture(caseContext);
      if (mutation === "declared-version") {
        await writeFile(
          path.join(fixture.consumerRoot, "package.json"),
          JSON.stringify({
            devDependencies: { [engineeringFoundationPackage]: "^0.19.0" },
          }),
        );
      } else if (mutation === "package" || mutation === "version") {
        await writeFile(
          fixture.manifestPath,
          JSON.stringify({
            name:
              mutation === "package"
                ? "@agent-teams/not-foundation"
                : engineeringFoundationPackage,
            version: mutation === "version" ? "0.19.1" : foundationVersion,
          }),
        );
      } else if (mutation === "root") {
        fixture.status = {
          ...fixture.status,
          installedPackageRoot: fixture.consumerRoot,
        };
      } else if (mutation === "consumer-root") {
        fixture.status = {
          ...fixture.status,
          consumerRoot: fixture.packageRoot,
        };
      } else if (mutation === "broad-root") {
        fixture.status = {
          ...fixture.status,
          installedPackageRoot: path.join(fixture.consumerRoot, "node_modules"),
        };
      } else {
        fixture.status = {
          ...fixture.status,
          issues: ["untrusted\n\u001b[31m" + "x".repeat(2000)],
        };
      }
      await assert.rejects(fixture.load(), expected);
      if (mutation === "issues") {
        await assert.rejects(fixture.load(), (error) => {
          assert.equal(error.message.includes("\n"), false);
          assert.equal(error.message.includes("\u001b"), false);
          assert.ok(error.message.length < 700);
          return true;
        });
      }
    });
  }
});

test("rejects unreadable, escaping, malformed, and tampered schema exports", async (t) => {
  const cases = [
    ["outside package root", "outside", /schema-containment/u],
    ["escaping symlink", "symlink", /schema-containment/u],
    ["unreadable schema", "missing", /authority\.read/u],
    ["invalid JSON", "json", /authority\.schema-json/u],
    ["boolean schema", "boolean", /authority\.schema-identity/u],
    ["wrong schema id", "id", /authority\.schema-identity/u],
    ["tampered in-root registry bytes", "tamper", /registry-digest/u],
  ];
  for (const [label, mutation, expected] of cases) {
    await t.test(label, async (caseContext) => {
      const mode = ["json", "boolean", "id"].includes(mutation)
        ? "LOCAL"
        : "REGISTRY";
      const fixture = await createAuthorityFixture(caseContext, { mode });
      if (mutation === "outside" || mutation === "symlink") {
        const outsideRoot = path.join(
          path.dirname(fixture.consumerRoot),
          `${mutation}-outside`,
        );
        const outside = path.join(outsideRoot, "v1.schema.json");
        await mkdir(outsideRoot, { recursive: true });
        await writeFile(outside, canonicalSchemaSource);
        if (mutation === "outside") {
          fixture.resolver = (specifier) =>
            pathToFileURL(
              specifier === packageManifestSpecifier
                ? fixture.manifestPath
                : outside,
            ).href;
        } else {
          const escapingDirectory = path.join(
            fixture.packageRoot,
            "escaping-schemas",
          );
          await symlink(
            outsideRoot,
            escapingDirectory,
            process.platform === "win32" ? "junction" : "dir",
          );
          fixture.resolver = (specifier) =>
            pathToFileURL(
              specifier === packageManifestSpecifier
                ? fixture.manifestPath
                : path.join(escapingDirectory, "v1.schema.json"),
            ).href;
        }
      } else if (mutation === "missing") {
        await rm(fixture.schemaPath);
        await mkdir(fixture.schemaPath);
      } else if (mutation === "json") {
        await writeFile(fixture.schemaPath, "{not json");
      } else if (mutation === "boolean") {
        await writeFile(fixture.schemaPath, "true\n");
      } else if (mutation === "id") {
        await writeFile(fixture.schemaPath, JSON.stringify({ $id: "wrong" }));
      } else {
        await writeFile(fixture.schemaPath, `${canonicalSchemaSource} `);
      }
      await assert.rejects(fixture.load(), expected);
    });
  }
});

test("uses the production topology-input path for shared schema and policy", async (t) => {
  const fixture = await createInputFixture(t);

  assert.deepEqual(await fixture.validate(catalogWith(validEntry())), []);

  const schemaOnlyErrors = await fixture.validate(
    catalogWith({ ...validEntry(), unexpected: true }),
  );
  assert.ok(
    schemaOnlyErrors.some(
      (error) =>
        error.includes("orchestrator.catalog.schema.violation") &&
        error.includes("additionalProperties"),
    ),
    schemaOnlyErrors.join("\n"),
  );

  const overlongOwner = `architecture.${"a".repeat(160)}`;
  assert.match(
    overlongOwner,
    /^(ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)$/u,
  );
  const sentinelErrors = await fixture.validate(
    catalogWith(validEntry({ owner_document: overlongOwner })),
  );
  assert.ok(
    sentinelErrors.some(
      (error) =>
        error.includes("orchestrator.catalog.schema.violation") &&
        error.includes("maxLength"),
    ),
    sentinelErrors.join("\n"),
  );

  const opaque = {
    id: "opaque",
    role: "opaque",
    path: "somewhere",
    package_name: "package",
    owner_document: "Owner",
  };
  const opaqueErrors = await fixture.validate(catalogWith(opaque));
  assert.ok(
    opaqueErrors.some((error) => error.includes("orchestrator.catalog.entry.id")),
    opaqueErrors.join("\n"),
  );
  assert.equal(
    opaqueErrors.some((error) =>
      error.includes("orchestrator.catalog.schema.violation"),
    ),
    false,
    opaqueErrors.join("\n"),
  );

  const permissiveErrors = await fixture.validate(catalogWith(opaque), {
    $id: packageCatalogSchemaId,
  });
  assert.ok(
    permissiveErrors.some((error) =>
      error.includes("orchestrator.catalog.entry.role-path"),
    ),
    permissiveErrors.join("\n"),
  );

  const compileErrors = await fixture.validate(catalogWith(validEntry()), {
    $id: packageCatalogSchemaId,
    type: 42,
  });
  assert.ok(
    compileErrors.some((error) =>
      error.includes("orchestrator.catalog.schema.compile"),
    ),
    compileErrors.join("\n"),
  );
});

test("enforces the immutable security envelope and every role path grammar", () => {
  const accepted = [
    validEntry({
      id: "app.cli",
      role: "app",
      path: "apps/cli",
      package_name: "@agent-teams/cli",
    }),
    validEntry({
      id: "context.work-coordination",
      role: "bounded-context",
      path: "packages/contexts/work-coordination",
      package_name: "@agent-teams/work-coordination",
    }),
    validEntry({
      id: "integration.github.webhooks",
      role: "integration",
      path: "packages/integrations/github/webhooks",
      package_name: "@agent-teams/github-webhooks",
    }),
    validEntry(),
    validEntry({
      id: "sdk.orchestrator",
      role: "sdk",
      path: "packages/sdk/orchestrator",
      package_name: "@agent-teams/orchestrator-sdk",
    }),
    validEntry({
      id: "testing.conformance",
      role: "testing",
      path: "packages/testing/conformance",
      package_name: "@agent-teams/conformance",
    }),
  ];
  const acceptedErrors = [];
  validateOrchestratorPackageCatalog(
    { version: 1, packages: accepted },
    acceptedErrors,
  );
  assert.deepEqual(acceptedErrors, []);

  const cases = [
    ["non-object envelope", []],
    ["non-array packages", { version: 1, packages: {} }],
    ["version zero", { version: 0, packages: [] }],
    ["primitive entry", { version: 1, packages: [0, "entry", null, []] }],
    ["parent segment", catalogWith(validEntry({ role: "app", path: "apps/.." }))],
    ["uppercase", catalogWith(validEntry({ path: "packages/platform/Upper" }))],
    ["underscore", catalogWith(validEntry({ path: "packages/platform/under_score" }))],
    ["dot", catalogWith(validEntry({ path: "packages/platform/dot.name" }))],
    ["at sign", catalogWith(validEntry({ path: "packages/platform/@scope" }))],
    ["backslash", catalogWith(validEntry({ path: "packages\\platform\\bad" }))],
    ["absolute", catalogWith(validEntry({ path: "/packages/platform/bad" }))],
  ];
  for (const [label, catalog] of cases) {
    const errors = [];
    validateOrchestratorPackageCatalog(catalog, errors);
    assert.ok(errors.length > 0, `${label} unexpectedly passed`);
    if (label === "primitive entry") {
      assert.equal(
        errors.filter((error) =>
          error.includes("orchestrator.catalog.entry.object"),
        ).length,
        4,
      );
    }
  }
});

test("bounds and sanitizes every untrusted catalog diagnostic", () => {
  const errors = [];
  validateOrchestratorPackageCatalog(
    catalogWith(
      validEntry({
        id: `platform.bad\n\u001b[31m${"x".repeat(5000)}`,
        path: `packages/platform/bad\r\n${"y".repeat(5000)}`,
      }),
    ),
    errors,
  );
  assert.ok(errors.length > 0);
  for (const error of errors) {
    assert.match(error, /^\[orchestrator\.catalog\./u);
    for (const control of ["\r", "\n", "\u001b", "\u2028", "\u2029"]) {
      assert.equal(error.includes(control), false, error);
    }
    assert.ok(error.length < 900, error.length);
  }
});

test("uses mkdtemp and guaranteed cleanup for missing-schema coverage", async (t) => {
  const fixture = await createAuthorityFixture(t);
  await rm(fixture.schemaPath);
  await assert.rejects(fixture.load(), /authority\.realpath/u);
});
