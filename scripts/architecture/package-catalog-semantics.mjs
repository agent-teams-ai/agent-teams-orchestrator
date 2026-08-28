import { createCatalogDiagnosticCollector } from "./package-catalog-resource-guards.mjs";

export function validateCatalogSemantics(catalog, documents, errors) {
  const diagnostics = createCatalogDiagnosticCollector(errors);
  const byId = new Map();
  const byPath = new Map();
  const byPackageName = new Map();

  entryLoop: for (const entry of catalog.packages ?? []) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    for (const [field, value, index] of [
      ["id", entry.id, byId],
      ["path", entry.path, byPath],
      ["package_name", entry.package_name, byPackageName],
    ]) {
      if (index.has(value)) {
        if (
          diagnostics.append(
            `architecture/package-catalog.yaml: duplicate ${field} ${value}`,
          ) === false
        ) {
          break entryLoop;
        }
      } else {
        index.set(value, entry);
      }
    }

    const owner = documents.get(entry.owner_document);
    if (!owner) {
      if (
        diagnostics.append(
          `architecture/package-catalog.yaml: ${entry.id} references unknown owner document ${entry.owner_document}`,
        ) === false
      ) {
        break;
      }
      continue;
    }

    if (
      entry.role === "bounded-context" &&
      owner.metadata.type !== "bounded-context" &&
      diagnostics.append(
        `architecture/package-catalog.yaml: ${entry.id} must be owned by a bounded-context dossier`,
      ) === false
    ) {
      break;
    }
  }

  if (!diagnostics.exhausted) {
    const activeAncestors = [];
    for (const current of [...byPath.keys()].toSorted()) {
      while (
        activeAncestors.length > 0 &&
        !current.startsWith(`${activeAncestors.at(-1)}/`)
      ) {
        activeAncestors.pop();
      }
      if (
        activeAncestors.length > 0 &&
        diagnostics.append(
          `architecture/package-catalog.yaml: package paths overlap: ${activeAncestors.at(-1)} and ${current}`,
        ) === false
      ) {
        break;
      }
      activeAncestors.push(current);
    }
  }

  diagnostics.flush();
  return { byPackageName, byPath };
}
