import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  acceptedOwnerStatuses,
  exists,
  loadDocuments,
  loadPackageCatalog,
  loadSourceDependencyPolicy,
  parseFrontmatter,
  relative,
  walk,
} from "./package-catalog-lib.mjs";
import { analyzeModuleSpecifiers } from "./source-imports.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");
const rolePathPatterns = {
  app: /^apps\/[^/]+$/,
  "bounded-context": /^packages\/contexts\/[^/]+$/,
  integration: /^packages\/integrations\/.+$/,
  platform: /^packages\/platform\/[^/]+$/,
  sdk: /^packages\/sdk\/[^/]+$/,
  testing: /^packages\/testing\/[^/]+$/,
};
const forbiddenPackageRootDirectories = new Set([
  "common",
  "core",
  "infrastructure",
  "processes",
  "services",
  "shared",
  "utils",
]);
const allowedPackageAssemblyPaths = [
  /^index\.[cm]?[jt]sx?$/,
  /^module\.[cm]?[jt]sx?$/,
  /^composition\//,
  /^features\/[^/]+\//,
  /^generated\//,
  /^migrations\//,
  /^published-language\//,
];
const productionSourceExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const documentIdPattern =
  /^(ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)$/;
const documentOwnerPattern =
  /^[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)*$/;
const engineeringFoundationPackage =
  "@agent-teams/engineering-foundation";
const allowedInternalDependencyRoles = {
  app: new Set([
    "bounded-context",
    "integration",
    "platform",
    "sdk",
  ]),
  "bounded-context": new Set([
    "bounded-context",
    "integration",
    "platform",
  ]),
  integration: new Set(["integration", "platform"]),
  platform: new Set(["platform"]),
  sdk: new Set(["sdk"]),
  testing: new Set([
    "app",
    "bounded-context",
    "integration",
    "platform",
    "sdk",
    "testing",
  ]),
};

function isProductionSourceFile(filePath) {
  return productionSourceExtensions.has(path.extname(filePath));
}

function dependencyEdgeKey(fromId, toId) {
  return `${fromId}\0${toId}`;
}

function isWithin(parentPath, childPath) {
  const pathFromParent = path.relative(parentPath, childPath);
  return (
    pathFromParent === "" ||
    (!pathFromParent.startsWith(`..${path.sep}`) && pathFromParent !== ".." &&
      !path.isAbsolute(pathFromParent))
  );
}

function stringTargets(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringTargets);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringTargets);
  }
  return [];
}

function packageNameFromSpecifier(specifier) {
  const match = specifier.match(/^(@agent-teams\/[^/]+)(?:\/.*)?$/);
  return match?.[1];
}

function exportKeyMatches(exportKey, requestedKey) {
  if (exportKey === requestedKey) {
    return true;
  }
  const wildcardIndex = exportKey.indexOf("*");
  if (wildcardIndex === -1) {
    return false;
  }
  return (
    requestedKey.startsWith(exportKey.slice(0, wildcardIndex)) &&
    requestedKey.endsWith(exportKey.slice(wildcardIndex + 1))
  );
}

function hasExportTarget(value) {
  if (typeof value === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(hasExportTarget);
  }
  if (value && typeof value === "object") {
    return Object.values(value).some(hasExportTarget);
  }
  return false;
}

function isExportedSubpath(exportsField, requestedKey) {
  if (typeof exportsField === "string" || Array.isArray(exportsField)) {
    return requestedKey === "." && hasExportTarget(exportsField);
  }
  if (!exportsField || typeof exportsField !== "object") {
    return false;
  }

  const exportKeys = Object.keys(exportsField);
  const subpathKeys = exportKeys.filter((key) => key.startsWith("."));
  if (subpathKeys.length === 0) {
    return requestedKey === "." && hasExportTarget(exportsField);
  }
  if (Object.hasOwn(exportsField, requestedKey)) {
    return hasExportTarget(exportsField[requestedKey]);
  }
  const matchingPatterns = subpathKeys
    .filter(
      (key) => key.includes("*") && exportKeyMatches(key, requestedKey),
    )
    .toSorted((left, right) => {
      const leftWildcard = left.indexOf("*");
      const rightWildcard = right.indexOf("*");
      return (
        rightWildcard - leftWildcard ||
        right.length - left.length ||
        left.localeCompare(right)
      );
    });
  return (
    matchingPatterns.length > 0 &&
    hasExportTarget(exportsField[matchingPatterns[0]])
  );
}

async function validateFeatureDocumentation(
  repositoryRoot,
  entry,
  sourceRoot,
  sourceFiles,
  errors,
) {
  const featureNames = new Set(
    sourceFiles
      .filter(isProductionSourceFile)
      .map((filePath) =>
        relative(sourceRoot, filePath).match(/^features\/([^/]+)\//)?.[1],
      )
      .filter(Boolean),
  );

  if (featureNames.size === 0) {
    errors.push(
      `${entry.path}: package requires at least one real source file in an accepted feature slice; package-only scaffolding cannot pass CI`,
    );
    return;
  }

  for (const featureName of [...featureNames].toSorted()) {
    const readmePath = path.join(
      sourceRoot,
      "features",
      featureName,
      "README.md",
    );
    const readmeRelative = relative(repositoryRoot, readmePath);
    if (!(await exists(readmePath))) {
      errors.push(
        `${entry.path}: feature ${featureName} requires colocated ${readmeRelative}`,
      );
      continue;
    }

    let metadata;
    try {
      metadata = parseFrontmatter(
        await readFile(readmePath, "utf8"),
        readmeRelative,
      );
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    if (
      metadata?.type !== "feature" ||
      metadata?.status !== "accepted" ||
      !documentIdPattern.test(metadata?.id ?? "") ||
      !documentOwnerPattern.test(metadata?.owner ?? "") ||
      typeof metadata?.summary !== "string" ||
      metadata.summary.length < 20 ||
      !Array.isArray(metadata?.related) ||
      !metadata.related.includes(entry.owner_document)
    ) {
      errors.push(
        `${readmeRelative}: feature metadata must declare a valid feature id, type feature, status accepted, owner, summary, and related ${entry.owner_document}`,
      );
    }
  }
}

async function validateInternalPackageImports(
  repositoryRoot,
  materializedPackages,
  byPackageName,
  dependencyEdges,
  errors,
) {
  for (const current of materializedPackages.values()) {
    const currentRoot = path.join(repositoryRoot, current.entry.path);
    const declaredDependencies = new Set(
      [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ].flatMap((section) =>
        Object.keys(current.manifest[section] ?? {}),
      ),
    );

    for (const filePath of current.sourceFiles.filter(isProductionSourceFile)) {
      const source = await readFile(filePath, "utf8");
      const moduleSpecifiers = analyzeModuleSpecifiers(source);
      for (const load of moduleSpecifiers.nonStaticModuleLoads) {
        errors.push(
          `${relative(repositoryRoot, filePath)}: non-static ${load.kind}() at source offset ${load.offset} bypasses the source dependency policy`,
        );
      }
      for (const specifier of moduleSpecifiers.specifiers) {
        if (specifier.startsWith(".") && !isWithin(
          currentRoot,
          path.resolve(path.dirname(filePath), specifier),
        )) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: cross-package relative import ${specifier} bypasses the source dependency policy`,
          );
          continue;
        }
        if (specifier.startsWith("/") || specifier.startsWith("file:")) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: absolute or file import ${specifier} is prohibited in production packages`,
          );
          continue;
        }

        const dependencyName = packageNameFromSpecifier(specifier);
        if (
          !dependencyName ||
          dependencyName === engineeringFoundationPackage
        ) {
          continue;
        }

        const dependency = byPackageName.get(dependencyName);
        if (!dependency) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: internal package import ${dependencyName} is not registered in the package catalog`,
          );
          continue;
        }

        if (
          dependencyName !== current.manifest.name &&
          !declaredDependencies.has(dependencyName)
        ) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: internal package import ${dependencyName} is not declared in ${current.entry.path}/package.json`,
          );
        }

        const subpath = specifier.slice(dependencyName.length);
        if (subpath === "/src" || subpath.startsWith("/src/")) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: deep src import ${specifier} bypasses package exports`,
          );
          continue;
        }

        const target = materializedPackages.get(dependencyName);
        if (!target) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: imported internal package ${dependencyName} is not materialized`,
          );
          continue;
        }

        const requestedExport = subpath.length === 0 ? "." : `.${subpath}`;
        if (dependencyName !== current.manifest.name) {
          const edge = dependencyEdges.get(
            dependencyEdgeKey(current.entry.id, dependency.id),
          );
          if (!edge) {
            errors.push(
              `${relative(repositoryRoot, filePath)}: source dependency ${current.entry.id} -> ${dependency.id} is denied by default`,
            );
          } else if (!(edge.imports ?? []).includes(requestedExport)) {
            errors.push(
              `${relative(repositoryRoot, filePath)}: import ${specifier} is not an allowed surface for source dependency ${current.entry.id} -> ${dependency.id}`,
            );
          }
        }
        if (!isExportedSubpath(target.manifest.exports, requestedExport)) {
          errors.push(
            `${relative(repositoryRoot, filePath)}: internal package subpath ${specifier} is not exported by ${dependencyName}`,
          );
        }
      }
    }
  }
}

function validateSourceDependencyPolicy(policy, catalog, errors) {
  const byId = new Map(
    (catalog.packages ?? []).map((entry) => [entry.id, entry]),
  );
  const dependencyEdges = new Map();
  const adjacency = new Map();

  for (const edge of policy.edges ?? []) {
    if (
      !edge ||
      typeof edge.from !== "string" ||
      typeof edge.to !== "string" ||
      !Array.isArray(edge.imports)
    ) {
      continue;
    }
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from) {
      errors.push(
        `architecture/source-dependency-policy.yaml: unknown consumer package ${edge.from}`,
      );
    }
    if (!to) {
      errors.push(
        `architecture/source-dependency-policy.yaml: unknown provider package ${edge.to}`,
      );
    }
    if (edge.from === edge.to) {
      errors.push(
        `architecture/source-dependency-policy.yaml: self dependency ${edge.from} is prohibited`,
      );
    }
    if (from && to && !allowedInternalDependencyRoles[from.role]?.has(to.role)) {
      errors.push(
        `architecture/source-dependency-policy.yaml: role ${from.role} cannot depend on ${to.role} package in edge ${edge.from} -> ${edge.to}`,
      );
    }

    const key = dependencyEdgeKey(edge.from, edge.to);
    if (dependencyEdges.has(key)) {
      errors.push(
        `architecture/source-dependency-policy.yaml: duplicate edge ${edge.from} -> ${edge.to}`,
      );
    } else {
      dependencyEdges.set(key, edge);
    }
    if (from && to) {
      const targets = adjacency.get(edge.from) ?? new Set();
      targets.add(edge.to);
      adjacency.set(edge.from, targets);
    }
  }

  const visited = new Set();
  const visiting = new Set();
  const pathStack = [];
  function visit(packageId) {
    if (visiting.has(packageId)) {
      const cycleStart = pathStack.indexOf(packageId);
      const cycle = [...pathStack.slice(cycleStart), packageId];
      errors.push(
        `architecture/source-dependency-policy.yaml: source dependency cycle ${cycle.join(" -> ")}`,
      );
      return;
    }
    if (visited.has(packageId)) {
      return;
    }
    visiting.add(packageId);
    pathStack.push(packageId);
    for (const target of adjacency.get(packageId) ?? []) {
      visit(target);
    }
    pathStack.pop();
    visiting.delete(packageId);
    visited.add(packageId);
  }
  for (const packageId of byId.keys()) {
    visit(packageId);
  }

  return dependencyEdges;
}

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

    const expectedPath = rolePathPatterns[entry.role];
    if (!expectedPath?.test(entry.path)) {
      errors.push(
        `architecture/package-catalog.yaml: ${entry.id} path ${entry.path} does not match role ${entry.role}`,
      );
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

async function validateMaterializedPackage(
  repositoryRoot,
  entry,
  owner,
  byPackageName,
  dependencyEdges,
  errors,
) {
  const packageRoot = path.join(repositoryRoot, entry.path);
  const packageJsonPath = path.join(packageRoot, "package.json");
  const tsconfigPath = path.join(packageRoot, "tsconfig.json");

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

  if (entry.role !== "app" && !manifest.exports) {
    errors.push(`${entry.path}/package.json: library package requires exports`);
  }

  if (!(await exists(tsconfigPath))) {
    errors.push(`${entry.path}: materialized package is missing tsconfig.json`);
  } else {
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

  for (const target of stringTargets(manifest.imports)) {
    if (!target.startsWith("./")) {
      errors.push(
        `${entry.path}/package.json: package imports aliases must remain package-local and cannot target ${target}`,
      );
    }
  }

  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const [dependencyName, dependencyRange] of Object.entries(
      manifest[section] ?? {},
    ).toSorted(([left], [right]) => left.localeCompare(right))) {
      if (!dependencyName.startsWith("@agent-teams/")) {
        continue;
      }
      if (dependencyName === engineeringFoundationPackage) {
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

  const sourceRoot = path.join(packageRoot, "src");
  const sourceFiles = await walk(sourceRoot, () => true, {
    skipDirectories: ["node_modules", "dist", "coverage"],
  });
  await validateFeatureDocumentation(
    repositoryRoot,
    entry,
    sourceRoot,
    sourceFiles,
    errors,
  );

  for (const filePath of sourceFiles) {
    const sourceRelative = relative(sourceRoot, filePath);
    const [firstSegment] = sourceRelative.split("/");
    if (forbiddenPackageRootDirectories.has(firstSegment)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: source root ${firstSegment} is prohibited; assign code to a feature or accepted package assembly surface`,
      );
    }

    if (
      !allowedPackageAssemblyPaths.some((pattern) =>
        pattern.test(sourceRelative),
      )
    ) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: production source must belong to src/features/** or an accepted package assembly surface`,
      );
    }

    if (/^features\/[^/]+\/projections\//.test(sourceRelative)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: feature-level projections is not a universal layer; place projection policy in application and persistence in adapters`,
      );
    }
  }

  return { entry, manifest, sourceFiles };
}

async function main() {
  const repositoryRoot = parseArguments(process.argv.slice(2));
  const schemaPath = path.join(
    repositoryRoot,
    "architecture/package-catalog.schema.json",
  );
  const dependencyPolicySchemaPath = path.join(
    repositoryRoot,
    "architecture/source-dependency-policy.schema.json",
  );
  const errors = [];

  const [
    catalog,
    schemaSource,
    documents,
    dependencyPolicy,
    dependencyPolicySchemaSource,
  ] = await Promise.all([
    loadPackageCatalog(repositoryRoot),
    readFile(schemaPath, "utf8"),
    loadDocuments(repositoryRoot),
    loadSourceDependencyPolicy(repositoryRoot),
    readFile(dependencyPolicySchemaPath, "utf8"),
  ]);
  const schema = JSON.parse(schemaSource);
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  const validateCatalog = ajv.compile(schema);
  const validateDependencyPolicy = ajv.compile(
    JSON.parse(dependencyPolicySchemaSource),
  );

  if (!validateCatalog(catalog)) {
    for (const validationError of validateCatalog.errors ?? []) {
      errors.push(
        `architecture/package-catalog.yaml${validationError.instancePath}: ${validationError.message}`,
      );
    }
  }
  if (!validateDependencyPolicy(dependencyPolicy)) {
    for (const validationError of validateDependencyPolicy.errors ?? []) {
      errors.push(
        `architecture/source-dependency-policy.yaml${validationError.instancePath}: ${validationError.message}`,
      );
    }
  }

  const { byPackageName, byPath } = validateCatalogSemantics(
    catalog && Array.isArray(catalog.packages)
      ? catalog
      : { packages: [] },
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
  const productionFiles = (
    await Promise.all(
      ["apps", "packages"].map((directory) =>
        walk(
          path.join(repositoryRoot, directory),
          (filePath) => path.basename(filePath) !== ".DS_Store",
          {
            skipDirectories: ["node_modules", "dist", "coverage"],
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
      const materializedPackage = await validateMaterializedPackage(
        repositoryRoot,
        entry,
        owner,
        byPackageName,
        dependencyEdges,
        errors,
      );
      if (materializedPackage) {
        materializedPackages.set(entry.package_name, materializedPackage);
      }
    }
  }
  await validateInternalPackageImports(
    repositoryRoot,
    materializedPackages,
    byPackageName,
    dependencyEdges,
    errors,
  );

  if (errors.length > 0) {
    for (const error of [...new Set(errors)].toSorted()) {
      console.error(`ERROR ${error}`);
    }
    console.error(
      `\nPackage topology validation failed with ${new Set(errors).size} error(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Package topology validation passed: ${catalog.packages.length} reserved paths, ${materializedPaths.size} materialized packages.`,
  );
}

await main();
