import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  canonicalSchemaSource,
  createAuthorityFixture,
  foundationVersion,
} from "./package-catalog-authority-fixture.mjs";
import {
  engineeringFoundationPackage,
  packageCatalogSchemaId,
  packageCatalogSchemaSpecifier,
  packageManifestSpecifier,
  trustedRegistrySchemaDigests,
} from "./package-catalog-schema.mjs";

test("regression: unary realpath resolution reaches exact schema and provenance checks", async (t) => {
  const fixture = await createAuthorityFixture(t);
  let inspectedRoot;
  const resolvedSpecifiers = [];
  const authority = await fixture.load({
    loadFoundationLocalMode: async () => ({
      inspectFoundationMode: async (consumerRoot) => {
        inspectedRoot = consumerRoot;
        return fixture.status;
      },
    }),
    resolvePackageExport: (specifier) => {
      resolvedSpecifiers.push(specifier);
      return fixture.resolver(specifier);
    },
  });
  assert.equal(inspectedRoot, await realpath(fixture.consumerRoot));
  assert.deepEqual(
    resolvedSpecifiers.toSorted(),
    [packageCatalogSchemaSpecifier, packageManifestSpecifier].toSorted(),
  );
  assert.equal(authority.foundationVersion, foundationVersion);
  assert.equal(authority.schema.$id, packageCatalogSchemaId);
  assert.equal(authority.trustMode, "REGISTRY");
  assert.ok(authority.schemaPath.startsWith(`${fixture.packageRoot}${path.sep}`));
  const independentlyVerifiedDigest = `sha256:${createHash("sha256")
    .update(canonicalSchemaSource)
    .digest("hex")}`;
  assert.equal(
    independentlyVerifiedDigest,
    "sha256:92ad50dc438f438d8ae8ec328d28d8b03c9fb3d9235e0144fb740386dd3e3b60",
  );
  assert.equal(
    trustedRegistrySchemaDigests[foundationVersion],
    independentlyVerifiedDigest,
  );
});

test("requires exactly one trusted digest for the declared exact version", async (t) => {
  assert.deepEqual(Object.keys(trustedRegistrySchemaDigests).toSorted(), [
    "0.19.0",
    "0.20.0",
  ]);
  assert.equal(
    trustedRegistrySchemaDigests["0.19.0"],
    trustedRegistrySchemaDigests[foundationVersion],
  );

  const fixture = await createAuthorityFixture(t);
  const unsupportedVersion = "0.21.0";
  await Promise.all([
    writeFile(
      path.join(fixture.consumerRoot, "package.json"),
      JSON.stringify({
        devDependencies: {
          [engineeringFoundationPackage]: unsupportedVersion,
        },
      }),
    ),
    writeFile(
      fixture.manifestPath,
      JSON.stringify({
        name: engineeringFoundationPackage,
        version: unsupportedVersion,
      }),
    ),
  ]);
  fixture.status = {
    ...fixture.status,
    dependencySpec: unsupportedVersion,
    installedVersion: unsupportedVersion,
    lockfilePackageKey: `${engineeringFoundationPackage}@${unsupportedVersion}`,
  };
  await assert.rejects(fixture.load(), /authority\.trusted-digest-set/u);
});

test("validates LOCAL physical state without relabeling its trust", async (t) => {
  const fixture = await createAuthorityFixture(t, { mode: "LOCAL" });
  await writeFile(
    fixture.schemaPath,
    `${JSON.stringify({ $id: packageCatalogSchemaId })}\n`,
  );
  const authority = await fixture.load();
  assert.equal(authority.trustMode, "LOCAL");
  assert.deepEqual(authority.schema, { $id: packageCatalogSchemaId });
});

test("binds a physical symbolic-link registry backup in LOCAL state", async (t) => {
  const fixture = await createAuthorityFixture(t, { mode: "LOCAL" });
  const backupPath = fixture.status.linkState.registryBackupPath;
  const registryPackageRoot = path.join(
    fixture.consumerRoot,
    "node_modules/.pnpm/foundation/node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  await rm(backupPath, { recursive: true });
  await mkdir(registryPackageRoot, { recursive: true });
  await symlink(
    registryPackageRoot,
    backupPath,
    process.platform === "win32" ? "junction" : "dir",
  );
  fixture.status = {
    ...fixture.status,
    linkState: {
      ...fixture.status.linkState,
      registryEntryKind: "symbolic-link",
      registryPackageRoot,
    },
  };
  assert.equal((await fixture.load()).trustMode, "LOCAL");
});

test("derives LOCAL only from descriptor-checked physical state", async (t) => {
  const cases = [
    [
      "reported REGISTRY mode",
      async (fixture) => {
        fixture.status = { ...fixture.status, mode: "REGISTRY" };
      },
      /provenance\.mode-binding/u,
    ],
    [
      "different physical target",
      async (fixture) => {
        const otherTarget = path.join(
          path.dirname(fixture.packageRoot),
          "other-foundation-target",
        );
        const installedEntry = path.join(
          fixture.consumerRoot,
          "node_modules",
          ...engineeringFoundationPackage.split("/"),
        );
        await mkdir(otherTarget);
        await rm(installedEntry);
        await symlink(
          otherTarget,
          installedEntry,
          process.platform === "win32" ? "junction" : "dir",
        );
      },
      /provenance\.binding/u,
    ],
    [
      "different state target",
      async (fixture) => {
        const otherTarget = path.join(
          path.dirname(fixture.packageRoot),
          "reported-foundation-target",
        );
        await mkdir(otherTarget);
        fixture.status = {
          ...fixture.status,
          linkState: {
            ...fixture.status.linkState,
            targetPackageRoot: otherTarget,
          },
        };
      },
      /provenance\.local-binding/u,
    ],
    [
      "different state consumer",
      async (fixture) => {
        const otherConsumer = path.join(
          path.dirname(fixture.consumerRoot),
          "other-consumer",
        );
        await mkdir(otherConsumer);
        fixture.status = {
          ...fixture.status,
          linkState: {
            ...fixture.status.linkState,
            consumerRoot: otherConsumer,
          },
        };
      },
      /provenance\.local-binding/u,
    ],
    [
      "different backup path",
      async (fixture) => {
        const otherBackup = path.join(
          fixture.consumerRoot,
          ".agent-teams-local/other-backup",
        );
        await mkdir(otherBackup);
        fixture.status = {
          ...fixture.status,
          linkState: {
            ...fixture.status.linkState,
            registryBackupPath: otherBackup,
          },
        };
      },
      /provenance\.local-binding/u,
    ],
    [
      "registry root outside consumer",
      async (fixture) => {
        fixture.status = {
          ...fixture.status,
          linkState: {
            ...fixture.status.linkState,
            registryPackageRoot: fixture.packageRoot,
          },
        };
      },
      /provenance\.local-binding/u,
    ],
    [
      "entry-kind mismatch",
      async (fixture) => {
        fixture.status = {
          ...fixture.status,
          linkState: {
            ...fixture.status.linkState,
            registryEntryKind: "symbolic-link",
          },
        };
      },
      /provenance\.local-binding/u,
    ],
    [
      "missing backup",
      async (fixture) => {
        await rm(fixture.status.linkState.registryBackupPath, {
          force: true,
          recursive: true,
        });
      },
      /provenance\.local-binding/u,
    ],
  ];
  for (const [label, mutate, expected] of cases) {
    await t.test(label, async (caseContext) => {
      const fixture = await createAuthorityFixture(caseContext, {
        mode: "LOCAL",
      });
      await mutate(fixture);
      await assert.rejects(fixture.load(), expected);
    });
  }

  await t.test("reported LOCAL without physical local state", async (caseContext) => {
    const fixture = await createAuthorityFixture(caseContext);
    fixture.status = { ...fixture.status, mode: "LOCAL" };
    await assert.rejects(fixture.load(), /provenance\.mode-binding/u);
  });
});
