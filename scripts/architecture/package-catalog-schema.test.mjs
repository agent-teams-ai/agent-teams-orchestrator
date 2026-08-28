import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import YAML from "yaml";

import { validateOrchestratorCatalogEntry } from "./package-catalog-policy.mjs";
import {
  engineeringFoundationPackage,
  loadCanonicalPackageCatalogSchema,
  packageCatalogSchemaSpecifier,
} from "./package-catalog-schema.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const retiredOwnerDocumentPattern =
  /^(ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)$/u;

function catalogWith(entry) {
  return { version: 1, packages: [entry] };
}

test("uses the exact installed Foundation target-catalog contract", async () => {
  const authority = await loadCanonicalPackageCatalogSchema();
  const manifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.equal(
    authority.foundationVersion,
    manifest.devDependencies[engineeringFoundationPackage],
  );
  assert.equal(
    authority.schema.$id,
    "https://agent-teams.ai/schemas/scaffold-target-catalog/v1",
  );

  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
    authority.schema,
  );
  const canonicalCatalog = YAML.parse(
    await readFile(
      path.join(repositoryRoot, "architecture/package-catalog.yaml"),
      "utf8",
    ),
  );
  assert.equal(validate(canonicalCatalog), true, JSON.stringify(validate.errors));

  const overlongOwner = `architecture.${"a".repeat(160)}`;
  assert.match(overlongOwner, retiredOwnerDocumentPattern);
  assert.equal(
    validate(
      catalogWith({
        id: "platform.schema-regression",
        role: "platform",
        path: "packages/platform/schema-regression",
        package_name: "@agent-teams/schema-regression",
        owner_document: overlongOwner,
      }),
    ),
    false,
    "a catalog admitted by the retired unbounded local pattern passed Foundation",
  );
  assert.ok(
    validate.errors?.some(
      (error) =>
        error.instancePath.endsWith("/owner_document") &&
        error.keyword === "maxLength",
    ),
    JSON.stringify(validate.errors),
  );

  const foundationOnlyEntry = {
    id: "opaque",
    role: "opaque",
    path: "somewhere",
    package_name: "package",
    owner_document: "Owner",
  };
  assert.equal(validate(catalogWith(foundationOnlyEntry)), true);
  const policyErrors = [];
  validateOrchestratorCatalogEntry(foundationOnlyEntry, policyErrors);
  assert.match(policyErrors.join("\n"), /not a valid Orchestrator package ID/u);
  assert.match(policyErrors.join("\n"), /does not match role/u);
  assert.match(policyErrors.join("\n"), /not a valid Orchestrator package name/u);
  assert.match(policyErrors.join("\n"), /not a valid Orchestrator document ID/u);
});

test("fails clearly when the installed Foundation package is missing", async () => {
  await assert.rejects(
    loadCanonicalPackageCatalogSchema({
      loadFoundationLocalMode: async () => {
        throw new Error("fixture package missing");
      },
    }),
    /Cannot load @agent-teams\/engineering-foundation\/local-mode.*pnpm install/u,
  );
});

test("fails clearly when Foundation is not in exact registry mode", async () => {
  await assert.rejects(
    loadCanonicalPackageCatalogSchema({
      loadFoundationLocalMode: async () => ({
        inspectFoundationMode: async () => ({ mode: "LOCAL", issues: [] }),
      }),
    }),
    /requires @agent-teams\/engineering-foundation in exact registry mode: Foundation reported LOCAL mode/u,
  );
});

test("fails clearly when the canonical schema is missing", async () => {
  const missingSchema = path.join(
    os.tmpdir(),
    "missing-foundation-scaffold-target-catalog.schema.json",
  );
  await assert.rejects(
    loadCanonicalPackageCatalogSchema({
      loadFoundationLocalMode: async () => ({
        inspectFoundationMode: async () => ({
          mode: "REGISTRY",
          installedPackageRoot: os.tmpdir(),
          installedVersion: "0.19.0",
          issues: [],
        }),
      }),
      resolveSchema: async (specifier) => {
        assert.equal(specifier, packageCatalogSchemaSpecifier);
        return pathToFileURL(missingSchema).href;
      },
    }),
    /Canonical schema .* is missing or unreadable/u,
  );
});
