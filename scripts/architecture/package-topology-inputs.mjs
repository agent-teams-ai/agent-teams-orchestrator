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
  validateOrchestratorCatalogPolicy,
} from "./package-catalog-policy.mjs";
import {
  CatalogResourceError,
  catalogWithinValidationBudget,
  createCatalogDiagnosticCollector,
} from "./package-catalog-resource-guards.mjs";
import {
  CatalogAuthorityError,
  loadCanonicalPackageCatalogSchema,
} from "./package-catalog-schema.mjs";

function appendSchemaErrors(append, location, validationErrors) {
  for (const validationError of validationErrors ?? []) {
    append(
      catalogDiagnostic("orchestrator.catalog.schema.violation", {
        detail: validationError.message,
        keyword: validationError.keyword,
        location: `${location}${validationError.instancePath}`,
      }),
    );
  }
}

function validateSchema(ajv, location, value, schema, append) {
  let validate;
  try {
    validate = ajv.compile(
      typeof schema === "string" ? JSON.parse(schema) : schema,
    );
  } catch (error) {
    append(
      catalogDiagnostic("orchestrator.catalog.schema.compile", {
        detail: error instanceof Error ? error.message : error,
        location,
      }),
    );
    return false;
  }
  if (!validate(value)) {
    appendSchemaErrors(append, location, validate.errors);
    return false;
  }
  return true;
}

async function loadCatalog(repositoryRoot, append) {
  try {
    return await loadPackageCatalog(repositoryRoot);
  } catch (error) {
    append(
      error instanceof CatalogResourceError
        ? error.message
        : catalogDiagnostic("orchestrator.catalog.resource.failure", {
            detail: "package catalog cannot be loaded within resource guards",
          }),
    );
  }
}

async function loadCatalogAuthority(repositoryRoot, append, options) {
  try {
    return await (
      options.loadPackageCatalogSchema ?? loadCanonicalPackageCatalogSchema
    )({ consumerRoot: repositoryRoot });
  } catch (error) {
    append(
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
  const catalogDiagnostics = createCatalogDiagnosticCollector(errors);
  const catalog = await loadCatalog(
    repositoryRoot,
    catalogDiagnostics.append,
  );
  const catalogAuthority = await loadCatalogAuthority(
    repositoryRoot,
    catalogDiagnostics.append,
    options,
  );
  const [documents, materializationPolicy, materializationPolicySchema] =
    await Promise.all([
      loadDocuments(repositoryRoot),
      loadPackageMaterializationPolicy(repositoryRoot),
      readFile(
        path.join(
          architectureRoot,
          "package-materialization-policy.schema.json",
        ),
        "utf8",
      ),
    ]);
  const withinValidationBudget = catalogWithinValidationBudget(
    catalog,
    catalogDiagnostics.append,
  );
  let schemaAdmitted = false;
  if (
    catalog !== undefined &&
    catalogAuthority !== undefined &&
    withinValidationBudget
  ) {
    schemaAdmitted = validateSchema(
      new Ajv2020({ allErrors: false, strict: true }),
      "architecture/package-catalog.yaml",
      catalog,
      catalogAuthority.schema,
      catalogDiagnostics.append,
    );
  }
  if (schemaAdmitted) {
    validateOrchestratorCatalogPolicy(
      catalog.packages,
      catalogDiagnostics.append,
    );
  }
  catalogDiagnostics.flush();
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  validateSchema(
    ajv,
    "architecture/package-materialization-policy.yaml",
    materializationPolicy,
    materializationPolicySchema,
    (diagnostic) => errors.push(diagnostic),
  );
  return {
    catalog,
    catalogAuthority:
      catalogAuthority === undefined
        ? undefined
        : {
            foundationVersion: catalogAuthority.foundationVersion,
            trustMode: catalogAuthority.trustMode,
          },
    documents,
    materializationPolicy,
  };
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
    (diagnostic) => errors.push(diagnostic),
  );

  return { ...materializationInputs, dependencyPolicy };
}
