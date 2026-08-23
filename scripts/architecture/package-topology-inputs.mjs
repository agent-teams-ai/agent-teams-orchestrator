import { readFile } from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import {
  loadDocuments,
  loadPackageCatalog,
  loadPackageMaterializationPolicy,
  loadSourceDependencyPolicy,
} from "./package-catalog-lib.mjs";

function appendSchemaErrors(errors, location, validationErrors) {
  for (const validationError of validationErrors ?? []) {
    errors.push(
      `${location}${validationError.instancePath}: ${validationError.message}`,
    );
  }
}

export async function loadPackageTopologyInputs(repositoryRoot, errors) {
  const architectureRoot = path.join(repositoryRoot, "architecture");
  const [
    catalog,
    catalogSchema,
    documents,
    materializationPolicy,
    materializationPolicySchema,
    dependencyPolicy,
    dependencyPolicySchema,
  ] = await Promise.all([
    loadPackageCatalog(repositoryRoot),
    readFile(path.join(architectureRoot, "package-catalog.schema.json"), "utf8"),
    loadDocuments(repositoryRoot),
    loadPackageMaterializationPolicy(repositoryRoot),
    readFile(
      path.join(architectureRoot, "package-materialization-policy.schema.json"),
      "utf8",
    ),
    loadSourceDependencyPolicy(repositoryRoot),
    readFile(
      path.join(architectureRoot, "source-dependency-policy.schema.json"),
      "utf8",
    ),
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const schemas = [
    ["architecture/package-catalog.yaml", catalog, catalogSchema],
    [
      "architecture/package-materialization-policy.yaml",
      materializationPolicy,
      materializationPolicySchema,
    ],
    [
      "architecture/source-dependency-policy.yaml",
      dependencyPolicy,
      dependencyPolicySchema,
    ],
  ];

  for (const [location, value, schemaSource] of schemas) {
    const validate = ajv.compile(JSON.parse(schemaSource));
    if (!validate(value)) {
      appendSchemaErrors(errors, location, validate.errors);
    }
  }

  return { catalog, dependencyPolicy, documents, materializationPolicy };
}
