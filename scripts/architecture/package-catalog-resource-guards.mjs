import path from "node:path";

import YAML from "yaml";

import { readOpenedBoundedFile } from "./opened-bounded-file.mjs";
import { catalogDiagnostic } from "./package-catalog-policy.mjs";

export const catalogResourceBudgets = Object.freeze({
  bytes: 1024 * 1024,
  diagnostics: 32,
  validationEntries: 8192,
  yamlAliases: 100,
});

export class CatalogResourceError extends Error {
  constructor(ruleId, fields, options) {
    super(catalogDiagnostic(ruleId, fields), options);
    this.name = "CatalogResourceError";
    this.ruleId = ruleId;
  }
}

function resourceFailure(ruleId, fields, cause) {
  return new CatalogResourceError(
    ruleId,
    fields,
    cause === undefined ? undefined : { cause },
  );
}

export async function loadResourceBoundedPackageCatalog(repositoryRoot) {
  const catalogPath = path.join(
    repositoryRoot,
    "architecture/package-catalog.yaml",
  );
  let source;
  try {
    source = await readOpenedBoundedFile({
      filePath: catalogPath,
      maximumBytes: catalogResourceBudgets.bytes,
      rootPath: repositoryRoot,
    });
  } catch (error) {
    throw resourceFailure(
      "orchestrator.catalog.resource.bytes",
      {
        detail: "package catalog is unreadable or exceeds its operational byte budget",
        maximum: catalogResourceBudgets.bytes,
      },
      error,
    );
  }

  try {
    return YAML.parse(source.toString("utf8"), {
      maxAliasCount: catalogResourceBudgets.yamlAliases,
      strict: true,
      uniqueKeys: true,
    });
  } catch (error) {
    throw resourceFailure(
      "orchestrator.catalog.resource.yaml",
      { detail: "package catalog YAML cannot be parsed within resource guards" },
      error,
    );
  }
}

export function catalogWithinValidationBudget(catalog, append) {
  const packages =
    typeof catalog === "object" && catalog !== null && !Array.isArray(catalog)
      ? catalog.packages
      : undefined;
  if (
    Array.isArray(packages) &&
    packages.length > catalogResourceBudgets.validationEntries
  ) {
    append(
      catalogDiagnostic("orchestrator.catalog.resource.validation-entries", {
        count: packages.length,
        maximum: catalogResourceBudgets.validationEntries,
      }),
    );
    return false;
  }
  return true;
}

export function createCatalogDiagnosticCollector(errors) {
  const diagnostics = [];
  let omitted = 0;
  return {
    append(diagnostic) {
      if (omitted > 0) {
        omitted += 1;
      } else if (diagnostics.length < catalogResourceBudgets.diagnostics) {
        diagnostics.push(diagnostic);
      } else {
        diagnostics.pop();
        omitted = 2;
      }
    },
    flush() {
      if (omitted > 0) {
        diagnostics.push(
          catalogDiagnostic("orchestrator.catalog.resource.diagnostics-omitted", {
            count: omitted,
            maximum: catalogResourceBudgets.diagnostics,
          }),
        );
      }
      errors.push(...diagnostics);
    },
  };
}
