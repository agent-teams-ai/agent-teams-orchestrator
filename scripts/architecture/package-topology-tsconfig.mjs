import { readFile } from "node:fs/promises";
import path from "node:path";

import { exists } from "./package-catalog-lib.mjs";
import { normalizedRootReference } from "./package-topology-exports.mjs";

export async function validateRootTsconfig(
  repositoryRoot,
  byPath,
  materializedPaths,
  errors,
) {
  const rootTsconfigPath = path.join(repositoryRoot, "tsconfig.json");
  if (!(await exists(rootTsconfigPath))) {
    if (materializedPaths.size > 0) {
      errors.push(
        "tsconfig.json: materialized packages require root project references",
      );
    }
    return;
  }
  try {
    const rootTsconfig = JSON.parse(await readFile(rootTsconfigPath, "utf8"));
    const referenceCounts = new Map();
    const references = rootTsconfig.references ?? [];
    if (!Array.isArray(references)) {
      errors.push("tsconfig.json: references must be an array");
    } else {
      for (const reference of references) {
        const normalized = normalizedRootReference(reference?.path);
        if (!normalized) {
          errors.push(
            "tsconfig.json: every project reference requires a relative in-repository path",
          );
          continue;
        }
        referenceCounts.set(
          normalized,
          (referenceCounts.get(normalized) ?? 0) + 1,
        );
      }
    }
    for (const materializedPath of [...materializedPaths].toSorted()) {
      const count = referenceCounts.get(materializedPath) ?? 0;
      if (count !== 1) {
        errors.push(
          `tsconfig.json: materialized package ${materializedPath} must appear exactly once in project references (found ${count})`,
        );
      }
    }
    for (const [referencePath] of referenceCounts) {
      if (byPath.has(referencePath) && !materializedPaths.has(referencePath)) {
        errors.push(
          `tsconfig.json: project reference ${referencePath} points to an unmaterialized catalog package`,
        );
      }
    }
  } catch (error) {
    errors.push(`tsconfig.json: invalid JSON: ${error.message}`);
  }
}
