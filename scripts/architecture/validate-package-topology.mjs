import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  acceptedOwnerStatuses,
  exists,
  relative,
  walk,
} from "./package-catalog-lib.mjs";
import { validatePackageMaterializationPolicy } from "./package-materialization-validation.mjs";
import { loadPackageTopologyInputs } from "./package-topology-inputs.mjs";
import {
  isNormalizedBuiltExport,
  stringTargets,
  validateQualifiedLibraryExports,
} from "./package-topology-exports.mjs";
import {
  allowedInternalDependencyRoles,
  dependencyEdgeKey,
  engineeringFoundationPackage,
  validateFeatureDocumentation,
  validateInternalPackageImports,
  validateSourceDependencyPolicy,
} from "./package-topology-source.mjs";
import { validateFeatureDependencyPolicy } from "./package-topology-features.mjs";
import { validateRootTsconfig } from "./package-topology-tsconfig.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");
const forbiddenPackageRootDirectories = new Set([
  "common",
  "core",
  "infrastructure",
  "processes",
  "services",
  "shared",
  "utils",
]);
const ignoredProductionFileNames = new Set([".DS_Store", ".gitkeep"]);
const ignoredFoundationEvidenceDirectory = ".foundation-retired-evidence-";
const allowedPackageAssemblyPaths = [
  /^index\.[cm]?[jt]sx?$/,
  /^module\.[cm]?[jt]sx?$/,
  /^composition\//,
  /^features\/[^/]+\//,
  /^generated\//,
  /^migrations\//,
  /^published-language\//,
];
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

function validateCatalogSemantics(catalog, documents, errors) {
  const byId = new Map();
  const byPath = new Map();
  const byPackageName = new Map();

  for (const entry of catalog.packages ?? []) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    for (const [field, value, index] of [
      ["id", entry.id, byId],
      ["path", entry.path, byPath],
      ["package_name", entry.package_name, byPackageName],
    ]) {
      if (index.has(value)) {
        errors.push(
          `architecture/package-catalog.yaml: duplicate ${field} ${value}`,
        );
      } else {
        index.set(value, entry);
      }
    }

    const owner = documents.get(entry.owner_document);
    if (!owner) {
      errors.push(
        `architecture/package-catalog.yaml: ${entry.id} references unknown owner document ${entry.owner_document}`,
      );
      continue;
    }

    if (
      entry.role === "bounded-context" &&
      owner.metadata.type !== "bounded-context"
    ) {
      errors.push(
        `architecture/package-catalog.yaml: ${entry.id} must be owned by a bounded-context dossier`,
      );
    }

  }

  const catalogPaths = [...byPath.keys()].toSorted();
  for (let leftIndex = 0; leftIndex < catalogPaths.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < catalogPaths.length;
      rightIndex += 1
    ) {
      const left = catalogPaths[leftIndex];
      const right = catalogPaths[rightIndex];
      if (right.startsWith(`${left}/`)) {
        errors.push(
          `architecture/package-catalog.yaml: package paths overlap: ${left} and ${right}`,
        );
      }
    }
  }

  return {
    byPackageName,
    byPath,
  };
}

function validateLibraryManifest(entry, manifest, errors) {
  if (entry.role === "app") {
    return;
  }
  if (!manifest.exports) {
    errors.push(`${entry.path}/package.json: library package requires exports`);
  }
  if (manifest.type !== "module") {
    errors.push(
      `${entry.path}/package.json: materialized library requires type module`,
    );
  }
  for (const script of ["build", "check", "test", "typecheck"]) {
    if (typeof manifest.scripts?.[script] !== "string") {
      errors.push(
        `${entry.path}/package.json: materialized library requires a ${script} script`,
      );
    }
  }
  validateQualifiedLibraryExports(entry, manifest.exports, errors);
  for (const target of stringTargets(manifest.exports)) {
    if (!isNormalizedBuiltExport(target)) {
      errors.push(
        `${entry.path}/package.json: library exports must reference built artifacts, not ${target}`,
      );
    }
  }
  if (!Array.isArray(manifest.files) || !manifest.files.includes("dist")) {
    errors.push(
      `${entry.path}/package.json: materialized library files must include dist`,
    );
  }
}

async function validatePackageTsconfig(entry, tsconfigPath, errors) {
  if (!(await exists(tsconfigPath))) {
    errors.push(`${entry.path}: materialized package is missing tsconfig.json`);
    return;
  }
  try {
    const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));
    if (tsconfig.compilerOptions?.paths) {
      errors.push(
        `${entry.path}/tsconfig.json: compilerOptions.paths is prohibited in production packages; use package exports`,
      );
    }
  } catch (error) {
    errors.push(`${entry.path}/tsconfig.json: invalid JSON: ${error.message}`);
  }
}

function validateManifestDependencies(context) {
  const { byPackageName, dependencyEdges, entry, errors, manifest } = context;
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const [dependencyName, dependencyRange] of Object.entries(
      manifest[section] ?? {},
    ).toSorted(([left], [right]) => left.localeCompare(right))) {
      if (
        !dependencyName.startsWith("@agent-teams/") ||
        dependencyName === engineeringFoundationPackage
      ) {
        continue;
      }
      const dependency = byPackageName.get(dependencyName);
      if (!dependency) {
        errors.push(
          `${entry.path}/package.json: internal dependency ${dependencyName} is not registered in the package catalog`,
        );
        continue;
      }
      if (!String(dependencyRange).startsWith("workspace:")) {
        errors.push(
          `${entry.path}/package.json: internal dependency ${dependencyName} must use the workspace: protocol`,
        );
      }
      const isTestingDependency =
        section === "devDependencies" && dependency.role === "testing";
      if (
        !isTestingDependency &&
        !allowedInternalDependencyRoles[entry.role].has(dependency.role)
      ) {
        errors.push(
          `${entry.path}/package.json: role ${entry.role} cannot depend on ${dependency.role} package ${dependencyName} in ${section}`,
        );
      }
      if (
        dependencyName !== manifest.name &&
        !dependencyEdges.has(dependencyEdgeKey(entry.id, dependency.id))
      ) {
        errors.push(
          `${entry.path}/package.json: source dependency ${entry.id} -> ${dependency.id} is denied by default`,
        );
      }
    }
  }
}

function validateSourceLayout(repositoryRoot, sourceRoot, sourceFiles, errors) {
  for (const filePath of sourceFiles) {
    const sourceRelative = relative(sourceRoot, filePath);
    const [firstSegment] = sourceRelative.split("/");
    if (forbiddenPackageRootDirectories.has(firstSegment)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: source root ${firstSegment} is prohibited; assign code to a feature or accepted package assembly surface`,
      );
    }
    if (!allowedPackageAssemblyPaths.some((pattern) => pattern.test(sourceRelative))) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: production source must belong to src/features/** or an accepted package assembly surface`,
      );
    }
    if (/^features\/[^/]+\/projections\//.test(sourceRelative)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: feature-level projections is not a universal layer; place projection policy in application and persistence in adapters`,
      );
    }
    if (/^features\/[^/]+\/tests\//.test(sourceRelative)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: feature integration and contract tests belong under package-level tests/features/<feature>; colocated unit tests use *.test.ts or *.spec.ts beside source`,
      );
    }
    if (/^features\/[^/]+\/module\.[cm]?[jt]sx?$/.test(sourceRelative)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: generic feature module.ts is prohibited; use composition/feature-module-factory.ts for static composition`,
      );
    }
  }
}

async function validateMaterializedPackage(context) {
  const {
    byPackageName,
    dependencyEdges,
    entry,
    errors,
    owner,
    materialization,
    repositoryRoot,
  } = context;
  const packageRoot = path.join(repositoryRoot, entry.path);
  const packageJsonPath = path.join(packageRoot, "package.json");
  const tsconfigPath = path.join(packageRoot, "tsconfig.json");

  if (materialization?.state === "deferred") {
    errors.push(
      `${entry.path}: package materialization is deferred by the materialization policy`,
    );
  }

  if (!acceptedOwnerStatuses.has(owner.metadata.status)) {
    errors.push(
      `${entry.path}: owner document ${entry.owner_document} is ${owner.metadata.status}; code package requires accepted or active ownership`,
    );
  }

  if (!(await exists(packageJsonPath))) {
    errors.push(`${entry.path}: materialized package is missing package.json`);
    return null;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
  } catch (error) {
    errors.push(`${entry.path}/package.json: invalid JSON: ${error.message}`);
    return null;
  }

  if (manifest.name !== entry.package_name) {
    errors.push(
      `${entry.path}/package.json: name must be ${entry.package_name}`,
    );
  }

  if (manifest.private !== true) {
    errors.push(
      `${entry.path}/package.json: packages remain private until their release-readiness gate explicitly enables publication`,
    );
  }

  const architecture = manifest.agentTeamsArchitecture;
  if (
    architecture?.role !== entry.role ||
    architecture?.ownerDocument !== entry.owner_document
  ) {
    errors.push(
      `${entry.path}/package.json: agentTeamsArchitecture must declare role ${entry.role} and ownerDocument ${entry.owner_document}`,
    );
  }

  validateLibraryManifest(entry, manifest, errors);
  await validatePackageTsconfig(entry, tsconfigPath, errors);

  for (const target of stringTargets(manifest.imports)) {
    if (!target.startsWith("./")) {
      errors.push(
        `${entry.path}/package.json: package imports aliases must remain package-local and cannot target ${target}`,
      );
    }
  }

  validateManifestDependencies({
    byPackageName,
    dependencyEdges,
    entry,
    errors,
    manifest,
  });

  const sourceRoot = path.join(packageRoot, "src");
  const sourceFiles = await walk(sourceRoot, () => true, {
    skipDirectories: [
      "node_modules", "dist", "coverage", ignoredFoundationEvidenceDirectory,
    ],
  });
  await validateFeatureDocumentation({
    entry,
    errors,
    repositoryRoot,
    sourceFiles,
    sourceRoot,
  });

  validateSourceLayout(repositoryRoot, sourceRoot, sourceFiles, errors);

  return { entry, manifest, sourceFiles };
}

async function main() {
  const repositoryRoot = parseArguments(process.argv.slice(2));
  const errors = [];
  const {
    catalog,
    catalogAuthority,
    dependencyPolicy,
    documents,
    materializationPolicy,
  } = await loadPackageTopologyInputs(repositoryRoot, errors);
  if (errors.length > 0) {
    reportErrors(errors);
    return;
  }

  const { byPackageName, byPath } = validateCatalogSemantics(
    catalog && Array.isArray(catalog.packages)
      ? catalog
      : { packages: [] },
    documents,
    errors,
  );
  const materializationByPackageId = validatePackageMaterializationPolicy(
    materializationPolicy && Array.isArray(materializationPolicy.entries)
      ? materializationPolicy
      : { entries: [] },
    catalog && Array.isArray(catalog.packages) ? catalog.packages : [],
    documents,
    errors,
  );
  const dependencyEdges = validateSourceDependencyPolicy(
    dependencyPolicy && Array.isArray(dependencyPolicy.edges)
      ? dependencyPolicy
      : { edges: [] },
    catalog && Array.isArray(catalog.packages)
      ? catalog
      : { packages: [] },
    errors,
  );
  const featureDependencyEdges = validateFeatureDependencyPolicy(
    dependencyPolicy,
    catalog,
    errors,
  );
  const productionFiles = (
    await Promise.all(
      ["apps", "packages"].map((directory) =>
        walk(
          path.join(repositoryRoot, directory),
          (filePath) => !ignoredProductionFileNames.has(path.basename(filePath)),
          {
            skipDirectories: [
              "node_modules", "dist", "coverage", ignoredFoundationEvidenceDirectory,
            ],
          },
        ),
      ),
    )
  ).flat();
  const materializedPaths = new Set();
  const materializedPackages = new Map();

  for (const filePath of productionFiles) {
    const fileRelative = relative(repositoryRoot, filePath);
    const owner = [...byPath.entries()].find(
      ([catalogPath]) =>
        fileRelative === catalogPath ||
        fileRelative.startsWith(`${catalogPath}/`),
    );
    if (!owner) {
      errors.push(
        `${fileRelative}: production file is outside the package catalog`,
      );
      continue;
    }
    materializedPaths.add(owner[0]);
  }

  for (const materializedPath of [...materializedPaths].toSorted()) {
    const entry = byPath.get(materializedPath);
    const owner = documents.get(entry.owner_document);
    if (owner) {
      const materializedPackage = await validateMaterializedPackage({
        byPackageName,
        dependencyEdges,
        entry,
        errors,
        materialization: materializationByPackageId.get(entry.id),
        owner,
        repositoryRoot,
      });
      if (materializedPackage) {
        materializedPackages.set(entry.package_name, materializedPackage);
      }
    }
  }

  await validateRootTsconfig(
    repositoryRoot,
    byPath,
    materializedPaths,
    errors,
  );
  await validateInternalPackageImports({
    byPackageName,
    dependencyEdges,
    errors,
    featureDependencyEdges,
    materializedPackages,
    repositoryRoot,
  });

  if (errors.length > 0) {
    reportErrors(errors);
    return;
  }

  if (catalogAuthority?.trustMode === "LOCAL") {
    console.warn(
      `[orchestrator.catalog.authority.local] Foundation ${catalogAuthority.foundationVersion} LOCAL schema authority is active; these contract bytes are unpublished.`,
    );
  }

  console.log(
    `Package topology validation passed: ${catalog.packages.length} reserved paths, ${materializedPaths.size} materialized packages.`,
  );
}

function reportErrors(errors) {
  for (const error of [...new Set(errors)].toSorted()) {
    console.error(`ERROR ${error}`);
  }
  console.error(
    `\nPackage topology validation failed with ${new Set(errors).size} error(s).`,
  );
  process.exitCode = 1;
}

await main();
