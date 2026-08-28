import { readFile } from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import {
  loadDocuments,
  loadPackageCatalog,
  loadPackageMaterializationPolicy,
  loadSourceDependencyPolicy,
} from "./package-catalog-lib.mjs";
import { loadCanonicalPackageCatalogSchema } from "./package-catalog-schema.mjs";

function appendSchemaErrors(errors, location, validationErrors) {
  for (const validationError of validationErrors ?? []) {
    errors.push(
      `${location}${validationError.instancePath}: ${validationError.message}`,
    );
  }
}

function validateSchema(ajv, location, value, schema, errors) {
  const validate = ajv.compile(
    typeof schema === "string" ? JSON.parse(schema) : schema,
  );
  if (!validate(value)) {
    appendSchemaErrors(errors, location, validate.errors);
  }
}

export async function loadPackageMaterializationInputs(
  repositoryRoot,
  errors,
) {
  const architectureRoot = path.join(repositoryRoot, "architecture");
  const [
    catalog,
    catalogSchema,
    documents,
    materializationPolicy,
    materializationPolicySchema,
  ] = await Promise.all([
    loadPackageCatalog(repositoryRoot),
    loadCanonicalPackageCatalogSchema(),
    loadDocuments(repositoryRoot),
    loadPackageMaterializationPolicy(repositoryRoot),
    readFile(
      path.join(architectureRoot, "package-materialization-policy.schema.json"),
      "utf8",
    ),
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  validateSchema(
    ajv,
    "architecture/package-catalog.yaml",
    catalog,
    catalogSchema.schema,
    errors,
  );
  validateSchema(
    ajv,
    "architecture/package-materialization-policy.yaml",
    materializationPolicy,
    materializationPolicySchema,
    errors,
  );
  return { catalog, documents, materializationPolicy };
}

export async function loadPackageTopologyInputs(repositoryRoot, errors) {
  const architectureRoot = path.join(repositoryRoot, "architecture");
  const [
    materializationInputs,
    dependencyPolicy,
    dependencyPolicySchema,
  ] = await Promise.all([
    loadPackageMaterializationInputs(repositoryRoot, errors),
    loadSourceDependencyPolicy(repositoryRoot),
    readFile(
      path.join(architectureRoot, "source-dependency-policy.schema.json"),
      "utf8",
    ),
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  validateSchema(
    ajv,
    "architecture/source-dependency-policy.yaml",
    dependencyPolicy,
    dependencyPolicySchema,
    errors,
  );

  return { ...materializationInputs, dependencyPolicy };
}
