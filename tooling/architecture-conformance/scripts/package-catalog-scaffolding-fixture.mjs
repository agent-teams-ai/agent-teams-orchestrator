import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import {
  journalPath,
  pathExists,
} from "./scaffolding-transaction-fixture.mjs";

export function ownerType(entry) {
  return entry.role === "bounded-context" ? "bounded-context" : "architecture";
}

export function ownerPath(ownerDocument) {
  return `docs/owners/${ownerDocument.replaceAll(".", "-")}.md`;
}

export function planPath(id) {
  return `.agent-teams-local/scaffolding-plans/${id}.json`;
}

export async function verifyCatalogAuthorityAtPlanApplyBoundary({
  createFixture,
  planTarget,
  requireFailure,
  runWrapper,
}) {
  const planEntry = {
    id: "platform.schema-plan",
    role: "platform",
    path: "packages/platform/schema-plan",
    package_name: "@agent-teams/schema-plan",
    owner_document: "architecture.schema-plan",
  };
  const planRoot = await createFixture([planEntry]);
  const planCatalogPath = path.join(
    planRoot,
    "architecture/package-catalog.yaml",
  );
  const planCatalog = YAML.parse(await readFile(planCatalogPath, "utf8"));
  planCatalog.packages[0].unexpected = true;
  await writeFile(planCatalogPath, YAML.stringify(planCatalog));
  requireFailure(
    "schema-only catalog violation before Plan",
    runWrapper(planRoot, [
      "plan",
      "--id",
      planEntry.id,
      "--plan",
      planPath(planEntry.id),
    ]),
    /orchestrator\.catalog\.schema\.violation.*additionalProperties/u,
  );

  const applyEntry = {
    id: "platform.schema-apply",
    role: "platform",
    path: "packages/platform/schema-apply",
    package_name: "@agent-teams/schema-apply",
    owner_document: "architecture.schema-apply",
  };
  const applyRoot = await createFixture([applyEntry]);
  planTarget(applyRoot, applyEntry.id);
  const applyCatalogPath = path.join(
    applyRoot,
    "architecture/package-catalog.yaml",
  );
  const applyCatalog = YAML.parse(await readFile(applyCatalogPath, "utf8"));
  applyCatalog.packages[0].unexpected = true;
  await writeFile(applyCatalogPath, YAML.stringify(applyCatalog));
  const schemaOnlyApply = requireFailure(
    "schema-only catalog violation before Apply",
    runWrapper(applyRoot, [
      "apply",
      "--plan",
      planPath(applyEntry.id),
      "--json",
    ]),
    /orchestrator\.catalog\.schema\.violation.*additionalProperties/u,
  );
  assert.doesNotMatch(
    `${schemaOnlyApply.stdout}\n${schemaOnlyApply.stderr}`,
    /authority-stale/u,
  );
  assert.equal(await pathExists(path.join(applyRoot, applyEntry.path)), false);
  assert.equal(await pathExists(journalPath(applyRoot)), false);

  const missingSchemaEntry = {
    id: "platform.schema-missing",
    role: "platform",
    path: "packages/platform/schema-missing",
    package_name: "@agent-teams/schema-missing",
    owner_document: "architecture.schema-missing",
  };
  const missingSchemaRoot = await createFixture([missingSchemaEntry]);
  planTarget(missingSchemaRoot, missingSchemaEntry.id);
  await rm(
    path.join(
      missingSchemaRoot,
      "node_modules/@agent-teams/engineering-foundation/schemas/scaffold-target-catalog/v1.schema.json",
    ),
  );
  requireFailure(
    "missing Foundation schema export before Apply",
    runWrapper(missingSchemaRoot, [
      "apply",
      "--plan",
      planPath(missingSchemaEntry.id),
      "--json",
    ]),
    /orchestrator\.catalog\.authority\.(?:exports|realpath)/u,
  );
  assert.equal(
    await pathExists(path.join(missingSchemaRoot, missingSchemaEntry.path)),
    false,
  );
  assert.equal(await pathExists(journalPath(missingSchemaRoot)), false);
}
