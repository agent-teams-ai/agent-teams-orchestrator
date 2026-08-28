import assert from "node:assert/strict";
import {
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
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  engineeringFoundationPackage,
  loadCanonicalPackageCatalogSchema,
  packageCatalogSchemaSpecifier,
  packageManifestSpecifier,
} from "./package-catalog-schema.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptDirectory, "../..");
export const foundationVersion = "0.20.0";
export const canonicalSchemaPath = path.join(
  repositoryRoot,
  "node_modules",
  ...engineeringFoundationPackage.split("/"),
  "schemas/scaffold-target-catalog/v1.schema.json",
);
export const canonicalSchemaSource = await readFile(canonicalSchemaPath, "utf8");
export const canonicalSchema = JSON.parse(canonicalSchemaSource);

export async function registryStatus(
  consumerRoot,
  packageRoot,
  overrides = {},
) {
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

export async function localStatus(
  consumerRoot,
  packageRoot,
  overrides = {},
) {
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
        ".agent-teams-local/foundation-registry-backup",
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

export async function createAuthorityFixture(
  t,
  { mode = "REGISTRY" } = {},
) {
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
    ...(mode === "LOCAL"
      ? [
          mkdir(
            path.join(
              consumerRoot,
              ".agent-teams-local/foundation-registry-backup",
            ),
            { recursive: true },
          ),
        ]
      : []),
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
    writeFile(
      path.join(consumerRoot, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\n",
    ),
    writeFile(
      path.join(packageRoot, "package.json"),
      JSON.stringify({
        name: engineeringFoundationPackage,
        version: foundationVersion,
      }),
    ),
    writeFile(path.join(packageRoot, "v1.schema.json"), canonicalSchemaSource),
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
