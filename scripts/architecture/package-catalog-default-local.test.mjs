import assert from "node:assert/strict";
import {
  copyFile,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  engineeringFoundationPackage,
  loadCanonicalPackageCatalogSchema,
  packageCatalogSchemaId,
} from "./package-catalog-schema.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const foundationVersion = "0.20.0";

async function createDefaultLocalAuthorityFixture(t) {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-default-local-authority-"),
  );
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const consumerRoot = path.join(temporaryRoot, "consumer");
  const packageRoot = path.join(temporaryRoot, "foundation-source");
  const stateRoot = path.join(consumerRoot, ".agent-teams-local");
  const backupRoot = path.join(stateRoot, "foundation-registry-backup");
  const installedEntry = path.join(
    consumerRoot,
    "node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  const installedFoundationRoot = await realpath(
    path.join(
      repositoryRoot,
      "node_modules",
      ...engineeringFoundationPackage.split("/"),
    ),
  );
  await Promise.all([
    mkdir(path.dirname(installedEntry), { recursive: true }),
    mkdir(path.join(consumerRoot, "node_modules/.pnpm"), { recursive: true }),
    mkdir(stateRoot, { recursive: true }),
    mkdir(path.join(packageRoot, "schemas/scaffold-target-catalog"), {
      recursive: true,
    }),
    mkdir(backupRoot, { recursive: true }),
  ]);
  await symlink(
    packageRoot,
    installedEntry,
    process.platform === "win32" ? "junction" : "dir",
  );
  const canonicalConsumerRoot = await realpath(consumerRoot);
  const canonicalPackageRoot = await realpath(packageRoot);
  const statePath = path.join(stateRoot, "foundation-link.json");
  await Promise.all([
    writeFile(
      path.join(consumerRoot, "package.json"),
      `${JSON.stringify({
        name: "orchestrator-default-local-fixture",
        packageManager: "pnpm@11.18.0",
        private: true,
        devDependencies: { [engineeringFoundationPackage]: foundationVersion },
      })}\n`,
    ),
    copyFile(
      path.join(repositoryRoot, "pnpm-lock.yaml"),
      path.join(consumerRoot, "pnpm-lock.yaml"),
    ),
    copyFile(
      path.join(repositoryRoot, "pnpm-lock.yaml"),
      path.join(consumerRoot, "node_modules/.pnpm/lock.yaml"),
    ),
    writeFile(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify({
        name: engineeringFoundationPackage,
        version: foundationVersion,
        exports: {
          "./package.json": "./package.json",
          "./schemas/*": "./schemas/*",
        },
      })}\n`,
    ),
    copyFile(
      path.join(
        installedFoundationRoot,
        "schemas/scaffold-target-catalog/v1.schema.json",
      ),
      path.join(
        packageRoot,
        "schemas/scaffold-target-catalog/v1.schema.json",
      ),
    ),
    writeFile(
      statePath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          phase: "LOCAL",
          consumerRoot: canonicalConsumerRoot,
          targetPackageRoot: canonicalPackageRoot,
          registryBackupPath: backupRoot,
          registryEntryKind: "directory",
          registryPackageRoot: installedEntry,
          packageVersion: foundationVersion,
          gitCommit: "a".repeat(64),
          gitDirty: false,
          attachedAt: "2026-08-28T00:00:00.000Z",
        },
        null,
        2,
      )}\n`,
    ),
  ]);
  return {
    backupRoot,
    statePath,
    load: () => loadCanonicalPackageCatalogSchema({ consumerRoot }),
  };
}

test("exercises the default Foundation inspector with physical LOCAL state", async (t) => {
  const fixture = await createDefaultLocalAuthorityFixture(t);
  const authority = await fixture.load();
  assert.equal(authority.foundationVersion, foundationVersion);
  assert.equal(authority.schema.$id, packageCatalogSchemaId);
  assert.equal(authority.trustMode, "LOCAL");
});

test("default Foundation inspector rejects damaged physical LOCAL state", async (t) => {
  await t.test("missing registry backup", async (caseContext) => {
    const fixture = await createDefaultLocalAuthorityFixture(caseContext);
    await rm(fixture.backupRoot, { recursive: true, force: true });
    await assert.rejects(fixture.load(), (error) => {
      assert.match(error.message, /provenance\.issues/u);
      assert.match(error.message, /foundation:status/u);
      assert.doesNotMatch(error.message, /foundation:assert-registry/u);
      return true;
    });
  });
  await t.test("corrupt link state", async (caseContext) => {
    const fixture = await createDefaultLocalAuthorityFixture(caseContext);
    await writeFile(fixture.statePath, "{not-json\n");
    await assert.rejects(fixture.load(), (error) => {
      assert.match(error.message, /provenance\.issues/u);
      assert.match(error.message, /foundation:status/u);
      assert.doesNotMatch(error.message, /foundation:assert-registry/u);
      return true;
    });
  });
});
