import assert from "node:assert/strict";
import {
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

import { catalogDiagnostic } from "./package-catalog-policy.mjs";
import {
  engineeringFoundationPackage,
  loadCanonicalPackageCatalogSchema,
  packageCatalogSchemaId,
  packageCatalogSchemaSpecifier,
  packageManifestSpecifier,
} from "./package-catalog-schema.mjs";

const foundationVersion = "0.19.0";
const oversized = "x".repeat(20_000);

async function createFixture(t, mode = "REGISTRY") {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-bounded-input-"),
  );
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const consumerRoot = path.join(temporaryRoot, "consumer");
  const installedEntry = path.join(
    consumerRoot,
    "node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  const packageRoot =
    mode === "LOCAL"
      ? path.join(temporaryRoot, "foundation-source")
      : installedEntry;
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
  const manifestPath = path.join(packageRoot, "package.json");
  const schemaPath = path.join(packageRoot, "v1.schema.json");
  await Promise.all([
    writeFile(
      path.join(consumerRoot, "package.json"),
      JSON.stringify({
        devDependencies: { [engineeringFoundationPackage]: foundationVersion },
      }),
    ),
    writeFile(path.join(consumerRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n"),
    writeFile(
      manifestPath,
      JSON.stringify({
        name: engineeringFoundationPackage,
        version: foundationVersion,
      }),
    ),
    writeFile(schemaPath, JSON.stringify({ $id: packageCatalogSchemaId })),
  ]);
  const canonicalConsumerRoot = await realpath(consumerRoot);
  const canonicalPackageRoot = await realpath(packageRoot);
  const commonStatus = {
    mode,
    consumerRoot: canonicalConsumerRoot,
    dependencySpec: foundationVersion,
    installedPackageRoot: canonicalPackageRoot,
    installedVersion: foundationVersion,
    issues: [],
  };
  const registryStatus = {
    ...commonStatus,
    lockfilePath: path.join(canonicalConsumerRoot, "pnpm-lock.yaml"),
    lockfilePackageKey: `${engineeringFoundationPackage}@${foundationVersion}`,
    registryIntegrity: "sha512-Zml4dHVyZQ==",
  };
  const localStatus = {
    ...commonStatus,
    linkState: {
      schemaVersion: 1,
      phase: "LOCAL",
      consumerRoot: canonicalConsumerRoot,
      targetPackageRoot: canonicalPackageRoot,
      registryBackupPath: path.join(canonicalConsumerRoot, "registry-backup"),
      registryEntryKind: "directory",
      registryPackageRoot: installedEntry,
      packageVersion: foundationVersion,
      gitCommit: "a".repeat(64),
      gitDirty: false,
      attachedAt: "2026-08-28T00:00:00.000Z",
    },
  };
  let status = mode === "LOCAL" ? localStatus : registryStatus;
  let resolver = (specifier) =>
    specifier === packageManifestSpecifier ? manifestPath : schemaPath;
  return {
    consumerRoot,
    manifestPath,
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
    load(overrides = {}) {
      return loadCanonicalPackageCatalogSchema({
        consumerRoot,
        loadFoundationLocalMode: async () => ({
          inspectFoundationMode: async () => status,
        }),
        resolvePackageExport: (specifier) => {
          assert.ok(
            [packageManifestSpecifier, packageCatalogSchemaSpecifier].includes(
              specifier,
            ),
          );
          return resolver(specifier);
        },
        ...overrides,
      });
    },
  };
}

async function assertBoundedRejection(promise, expected) {
  await assert.rejects(promise, (error) => {
    assert.match(error.message, expected);
    assert.equal(error.message.includes(oversized), false);
    assert.equal(error.message.includes("\n"), false);
    return true;
  });
}

test("unit-bounds registry status after Foundation inspection", async (t) => {
  const fixture = await createFixture(t);
  const baseline = fixture.status;
  const cases = [
    ["status issue", { issues: [oversized] }, /provenance\.issues/u],
    ["status mode", { mode: oversized }, /provenance\.mode/u],
    ["consumer root", { consumerRoot: oversized }, /provenance\.field/u],
    ["installed root", { installedPackageRoot: oversized }, /provenance\.field/u],
    ["dependency version", { dependencySpec: oversized }, /provenance\.field/u],
    ["installed version", { installedVersion: oversized }, /provenance\.field/u],
    ["lockfile path", { lockfilePath: oversized }, /registry-root/u],
    ["package key", { lockfilePackageKey: oversized }, /registry-binding/u],
    ["integrity", { registryIntegrity: oversized }, /registry-binding/u],
  ];
  for (const [label, mutation, expected] of cases) {
    await t.test(label, async () => {
      fixture.status = { ...baseline, ...mutation };
      await assertBoundedRejection(fixture.load(), expected);
    });
  }
});

test("unit-bounds LOCAL status before adapter filesystem use", async (t) => {
  const fixture = await createFixture(t, "LOCAL");
  const baseline = fixture.status;
  const fields = [
    "phase",
    "consumerRoot",
    "targetPackageRoot",
    "registryBackupPath",
    "registryEntryKind",
    "registryPackageRoot",
    "packageVersion",
    "gitCommit",
    "attachedAt",
  ];
  for (const field of fields) {
    await t.test(field, async () => {
      fixture.status = {
        ...baseline,
        linkState: { ...baseline.linkState, [field]: oversized },
      };
      await assertBoundedRejection(
        fixture.load(),
        /provenance\.local-state/u,
      );
    });
  }
});

test("rejects oversized consumer, resolver, and manifest version inputs", async (t) => {
  const cases = [
    [
      "consumer root",
      (fixture) => fixture.load({ consumerRoot: oversized }),
      /authority\.consumer-root/u,
    ],
    [
      "resolver path",
      (fixture) => {
        fixture.resolver = () => `/${oversized}`;
        return fixture.load();
      },
      /authority\.realpath/u,
    ],
    [
      "declared version",
      async (fixture) => {
        await writeFile(
          path.join(fixture.consumerRoot, "package.json"),
          JSON.stringify({
            devDependencies: { [engineeringFoundationPackage]: oversized },
          }),
        );
        return fixture.load();
      },
      /authority\.declared-version/u,
    ],
    [
      "manifest version",
      async (fixture) => {
        await writeFile(
          fixture.manifestPath,
          JSON.stringify({
            name: engineeringFoundationPackage,
            version: oversized,
          }),
        );
        return fixture.load();
      },
      /authority\.package-identity/u,
    ],
  ];
  for (const [label, mutateAndLoad, expected] of cases) {
    await t.test(label, async (caseContext) => {
      const fixture = await createFixture(caseContext, "LOCAL");
      await assertBoundedRejection(mutateAndLoad(fixture), expected);
    });
  }
});

test("formats oversized and cyclic diagnostics with bounded non-coercing work", () => {
  const oversizedDiagnostic = `line\n\u001b[31m${oversized}`;
  const cyclic = {};
  cyclic.self = cyclic;
  let coercionAttempted = false;
  const hostile = {
    toJSON() {
      coercionAttempted = true;
      throw new Error("must not stringify");
    },
    toString() {
      coercionAttempted = true;
      throw new Error("must not coerce");
    },
  };
  hostile.self = hostile;
  for (const value of [oversizedDiagnostic, cyclic, hostile, [cyclic]]) {
    const fields = { value };
    const first = catalogDiagnostic("orchestrator.catalog.diagnostic.test", fields);
    assert.equal(
      first,
      catalogDiagnostic("orchestrator.catalog.diagnostic.test", fields),
    );
    assert.match(first, /^\[orchestrator\.catalog\.diagnostic\.test\]/u);
    for (const control of ["\n", "\r", "\u001b", "\u2028", "\u2029"]) {
      assert.equal(first.includes(control), false);
    }
    assert.ok(first.length < 400, first.length);
  }
  assert.equal(coercionAttempted, false);
  assert.ok(
    catalogDiagnostic("orchestrator.catalog.diagnostic.test", {
      value: oversizedDiagnostic,
    }).includes("…"),
  );
  assert.match(
    catalogDiagnostic("unstable\nrule", { value: oversizedDiagnostic }),
    /^\[orchestrator\.catalog\.diagnostic\.invalid-rule\]/u,
  );
});
