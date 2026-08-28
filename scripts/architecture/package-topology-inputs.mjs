import { readFile } from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import {
  loadDocuments,
  loadPackageCatalog,
  loadPackageMaterializationPolicy,
  loadSourceDependencyPolicy,
} from "./package-catalog-lib.mjs";
import {
  catalogDiagnostic,
  validateOrchestratorPackageCatalog,
} from "./package-catalog-policy.mjs";
import {
  CatalogAuthorityError,
  loadCanonicalPackageCatalogSchema,
} from "./package-catalog-schema.mjs";

function appendSchemaErrors(errors, location, validationErrors) {
  for (const validationError of validationErrors ?? []) {
    errors.push(
      catalogDiagnostic("orchestrator.catalog.schema.violation", {
        detail: validationError.message,
        keyword: validationError.keyword,
        location: `${location}${validationError.instancePath}`,
      }),
    );
  }
}

function validateSchema(ajv, location, value, schema, errors) {
  let validate;
  try {
    validate = ajv.compile(
      typeof schema === "string" ? JSON.parse(schema) : schema,
    );
  } catch (error) {
    errors.push(
      catalogDiagnostic("orchestrator.catalog.schema.compile", {
        detail: error instanceof Error ? error.message : error,
        location,
      }),
    );
    return false;
  }
  if (!validate(value)) {
    appendSchemaErrors(errors, location, validate.errors);
    return false;
  }
  return true;
}

async function loadCatalogAuthority(repositoryRoot, errors, options) {
  try {
    return await (
      options.loadPackageCatalogSchema ?? loadCanonicalPackageCatalogSchema
    )({ consumerRoot: repositoryRoot });
  } catch (error) {
    errors.push(
      error instanceof CatalogAuthorityError
        ? error.message
        : catalogDiagnostic("orchestrator.catalog.authority.failure", {
            detail: error instanceof Error ? error.message : error,
          }),
    );
  }
}

export async function loadPackageMaterializationInputs(
  repositoryRoot,
  errors,
  options = {},
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
    loadCatalogAuthority(repositoryRoot, errors, options),
    loadDocuments(repositoryRoot),
    loadPackageMaterializationPolicy(repositoryRoot),
    readFile(
      path.join(architectureRoot, "package-materialization-policy.schema.json"),
      "utf8",
    ),
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  if (catalogSchema !== undefined) {
    validateSchema(
      ajv,
      "architecture/package-catalog.yaml",
      catalog,
      catalogSchema.schema,
      errors,
    );
  }
  validateOrchestratorPackageCatalog(catalog, errors);
  validateSchema(
    ajv,
    "architecture/package-materialization-policy.yaml",
    materializationPolicy,
    materializationPolicySchema,
    errors,
  );
  return { catalog, documents, materializationPolicy };
}

export async function loadPackageTopologyInputs(
  repositoryRoot,
  errors,
  options = {},
) {
  const architectureRoot = path.join(repositoryRoot, "architecture");
  const [
    materializationInputs,
    dependencyPolicy,
    dependencyPolicySchema,
  ] = await Promise.all([
    loadPackageMaterializationInputs(repositoryRoot, errors, options),
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
