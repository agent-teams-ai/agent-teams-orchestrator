import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { relative, walk } from "./package-catalog-lib.mjs";

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const ignoredDirectories = [
  ".git",
  ".nx",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
];
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

function parseArguments(argv) {
  const rootIndex = argv.indexOf("--root");
  if (rootIndex === -1) {
    return defaultRepositoryRoot;
  }

  const root = argv[rootIndex + 1];
  if (!root) {
    throw new Error("--root requires a path");
  }
  return path.resolve(root);
}

function isExactRegistryVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    value,
  );
}

function matchesWorkspace(relativeDirectory, patterns) {
  const included = patterns
    .filter((pattern) => !pattern.startsWith("!"))
    .some((pattern) => path.matchesGlob(relativeDirectory, pattern));
  const excluded = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .some((pattern) =>
      path.matchesGlob(relativeDirectory, pattern.slice(1)),
    );
  return included && !excluded;
}

function loadCatalogs(workspace, errors) {
  const configuredCatalogs = new Map([
    ["default", workspace.catalog ?? {}],
    ...Object.entries(workspace.catalogs ?? {}),
  ]);
  const catalogs = new Map();

  for (const [catalogName, catalog] of configuredCatalogs) {
    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
      errors.push(
        `pnpm-workspace.yaml: catalog ${catalogName} must be an object`,
      );
      catalogs.set(catalogName, {});
      continue;
    }

    catalogs.set(catalogName, catalog);

    for (const [dependencyName, version] of Object.entries(catalog)) {
      if (
        typeof version !== "string" ||
        !isExactRegistryVersion(version)
      ) {
        errors.push(
          `pnpm-workspace.yaml: catalog ${catalogName} dependency ${dependencyName} must use an exact registry version`,
        );
      }
    }
  }

  return catalogs;
}

function selectedCatalogName(specifier) {
  if (specifier === "catalog:") {
    return "default";
  }
  if (specifier.startsWith("catalog:") && specifier.length > 8) {
    return specifier.slice(8);
  }
  return;
}

async function loadWorkspaceManifests(repositoryRoot, workspace, errors) {
  const patterns = workspace.packages;
  if (
    !Array.isArray(patterns) ||
    patterns.length === 0 ||
    patterns.some((pattern) => typeof pattern !== "string")
  ) {
    errors.push(
      "pnpm-workspace.yaml: packages must be a non-empty string array",
    );
    return [];
  }

  const packageJsonFiles = await walk(
    repositoryRoot,
    (filePath) => path.basename(filePath) === "package.json",
    { skipDirectories: ignoredDirectories },
  );
  const rootManifestPath = path.join(repositoryRoot, "package.json");
  const selectedPaths = packageJsonFiles.filter((filePath) => {
    if (filePath === rootManifestPath) {
      return true;
    }
    const directory = relative(repositoryRoot, path.dirname(filePath));
    return matchesWorkspace(directory, patterns);
  });
  const manifests = [];

  for (const filePath of selectedPaths.toSorted()) {
    try {
      manifests.push({
        filePath,
        relativePath: relative(repositoryRoot, filePath),
        manifest: JSON.parse(await readFile(filePath, "utf8")),
      });
    } catch (error) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: invalid JSON: ${error.message}`,
      );
    }
  }

  return manifests;
}

function validateManifestNames(manifests, errors) {
  const names = new Map();
  for (const entry of manifests) {
    const name = entry.manifest.name;
    if (typeof name !== "string" || name.length === 0) {
      errors.push(`${entry.relativePath}: package name is required`);
      continue;
    }
    const existing = names.get(name);
    if (existing) {
      errors.push(
        `${entry.relativePath}: duplicate workspace package name ${name}; first declared by ${existing}`,
      );
    } else {
      names.set(name, entry.relativePath);
    }
  }
  return names;
}

function validateDependency(
  entry,
  section,
  dependencyName,
  dependencySpecifier,
  workspaceNames,
  catalogs,
  errors,
) {
  const location = `${entry.relativePath}: ${section}.${dependencyName}`;
  if (typeof dependencySpecifier !== "string") {
    errors.push(`${location} must be a string specifier`);
    return;
  }

  if (workspaceNames.has(dependencyName)) {
    if (!dependencySpecifier.startsWith("workspace:")) {
      errors.push(
        `${location} is internal and must use the workspace: protocol`,
      );
    }
    return;
  }

  if (dependencyName.startsWith("@agent-teams/")) {
    errors.push(
      `${location} uses the reserved internal scope but is not a workspace package`,
    );
    return;
  }

  const catalogName = selectedCatalogName(dependencySpecifier);
  if (!catalogName) {
    errors.push(
      `${location} is external and must use catalog: instead of ${dependencySpecifier}`,
    );
    return;
  }

  const catalog = catalogs.get(catalogName);
  if (!catalog) {
    errors.push(`${location} references unknown catalog ${catalogName}`);
    return;
  }
  if (!Object.hasOwn(catalog, dependencyName)) {
    errors.push(`${location} is missing from catalog ${catalogName}`);
  }
}

async function main() {
  const repositoryRoot = parseArguments(process.argv.slice(2));
  const errors = [];
  let workspace;

  try {
    workspace = YAML.parse(
      await readFile(
        path.join(repositoryRoot, "pnpm-workspace.yaml"),
        "utf8",
      ),
    );
  } catch (error) {
    console.error(`ERROR pnpm-workspace.yaml: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) {
    console.error("ERROR pnpm-workspace.yaml: root must be an object");
    process.exitCode = 1;
    return;
  }

  if (workspace.catalogMode !== "strict") {
    errors.push("pnpm-workspace.yaml: catalogMode must be strict");
  }

  const catalogs = loadCatalogs(workspace, errors);
  const manifests = await loadWorkspaceManifests(
    repositoryRoot,
    workspace,
    errors,
  );
  const workspaceNames = validateManifestNames(manifests, errors);

  for (const entry of manifests) {
    for (const section of dependencySections) {
      for (const [dependencyName, dependencySpecifier] of Object.entries(
        entry.manifest[section] ?? {},
      ).toSorted(([left], [right]) => left.localeCompare(right))) {
        validateDependency(
          entry,
          section,
          dependencyName,
          dependencySpecifier,
          workspaceNames,
          catalogs,
          errors,
        );
      }
    }
  }

  if (errors.length > 0) {
    for (const error of [...new Set(errors)].toSorted()) {
      console.error(`ERROR ${error}`);
    }
    console.error(
      `\nDependency specifier validation failed with ${new Set(errors).size} error(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Dependency specifier validation passed: ${manifests.length} workspace manifests, ${catalogs.size} catalogs.`,
  );
}

await main();
