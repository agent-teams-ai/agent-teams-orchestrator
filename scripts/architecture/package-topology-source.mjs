import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  exists,
  parseFrontmatter,
  relative,
} from "./package-catalog-lib.mjs";
import {
  isExportedSubpath,
  packageNameFromSpecifier,
} from "./package-topology-exports.mjs";
import {
  validateCrossFeatureSpecifier,
  validateFeatureDependencyUsage,
} from "./package-topology-features.mjs";
import { analyzeModuleSpecifiers } from "./source-imports.mjs";

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
const testSourcePattern = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const documentIdPattern =
  /^(ADR-[0-9]{4}|OD-[0-9]{3}|[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)$/;
const documentOwnerPattern = /^[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)*$/;
export const engineeringFoundationPackage =
  "@agent-teams/engineering-foundation";
export const allowedInternalDependencyRoles = {
  app: new Set(["bounded-context", "integration", "platform", "sdk"]),
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
  return (
    productionSourceExtensions.has(path.extname(filePath)) &&
    !testSourcePattern.test(filePath)
  );
}

export function dependencyEdgeKey(fromId, toId) {
  return `${fromId}\0${toId}`;
}

function isWithin(parentPath, childPath) {
  const pathFromParent = path.relative(parentPath, childPath);
  return (
    pathFromParent === "" ||
    (!pathFromParent.startsWith(`..${path.sep}`) &&
      pathFromParent !== ".." &&
      !path.isAbsolute(pathFromParent))
  );
}

function isValidFeatureMetadata(metadata, ownerDocument) {
  return [
    metadata?.type === "feature",
    metadata?.status === "accepted",
    documentIdPattern.test(metadata?.id ?? ""),
    documentOwnerPattern.test(metadata?.owner ?? ""),
    typeof metadata?.summary === "string",
    (metadata?.summary?.length ?? 0) >= 20,
    Array.isArray(metadata?.related),
    metadata?.related?.includes(ownerDocument),
  ].every(Boolean);
}

export async function validateFeatureDocumentation(context) {
  const { entry, errors, repositoryRoot, sourceFiles, sourceRoot } = context;
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
    const readmePath = path.join(sourceRoot, "features", featureName, "README.md");
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
    if (!isValidFeatureMetadata(metadata, entry.owner_document)) {
      errors.push(
        `${readmeRelative}: feature metadata must declare a valid feature id, type feature, status accepted, owner, summary, and related ${entry.owner_document}`,
      );
    }
  }
}

function validateSpecifierLocation(context, specifier) {
  const { currentRoot, errors, filePath, repositoryRoot } = context;
  if (
    specifier.startsWith(".") &&
    !isWithin(currentRoot, path.resolve(path.dirname(filePath), specifier))
  ) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: cross-package relative import ${specifier} bypasses the source dependency policy`,
    );
    return false;
  }
  if (specifier.startsWith("/") || specifier.startsWith("file:")) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: absolute or file import ${specifier} is prohibited in production packages`,
    );
    return false;
  }
  return true;
}

function validateDependencyEdge(context) {
  const {
    current,
    dependency,
    dependencyEdges,
    dependencyName,
    errors,
    filePath,
    repositoryRoot,
    requestedExport,
    specifier,
  } = context;
  if (dependencyName === current.manifest.name) {
    return;
  }
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

function validateInternalSpecifier(context, specifier) {
  const {
    byPackageName,
    current,
    declaredDependencies,
    errors,
    filePath,
    materializedPackages,
    repositoryRoot,
  } = context;
  if (!validateSpecifierLocation(context, specifier)) {
    return;
  }
  const dependencyName = packageNameFromSpecifier(specifier);
  if (!dependencyName || dependencyName === engineeringFoundationPackage) {
    return;
  }
  if (dependencyName === current.manifest.name) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: production source cannot self-import package ${dependencyName}; use a local feature API and an exact feature edge`,
    );
    return;
  }
  const dependency = byPackageName.get(dependencyName);
  if (!dependency) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: internal package import ${dependencyName} is not registered in the package catalog`,
    );
    return;
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
    return;
  }
  const target = materializedPackages.get(dependencyName);
  if (!target) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: imported internal package ${dependencyName} is not materialized`,
    );
    return;
  }
  const requestedExport = subpath.length === 0 ? "." : `.${subpath}`;
  validateDependencyEdge({
    ...context,
    dependency,
    dependencyName,
    requestedExport,
    specifier,
  });
  if (!isExportedSubpath(target.manifest.exports, requestedExport)) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: internal package subpath ${specifier} is not exported by ${dependencyName}`,
    );
  }
}

export async function validateInternalPackageImports(context) {
  const {
    errors,
    materializedPackages,
    repositoryRoot,
  } = context;
  const usedFeatureSurfaces = new Set();
  for (const current of materializedPackages.values()) {
    const currentRoot = path.join(repositoryRoot, current.entry.path);
    const declaredDependencies = new Set(
      ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].flatMap(
        (section) => Object.keys(current.manifest[section] ?? {}),
      ),
    );
    for (const filePath of current.sourceFiles.filter(isProductionSourceFile)) {
      const source = await readFile(filePath, "utf8");
      const moduleSpecifiers = analyzeModuleSpecifiers(source, filePath);
      for (const parseError of moduleSpecifiers.parseErrors) {
        errors.push(
          `${relative(repositoryRoot, filePath)}: source parser error at offset ${parseError.offset}: ${parseError.message}`,
        );
      }
      for (const load of moduleSpecifiers.nonStaticModuleLoads) {
        errors.push(
          `${relative(repositoryRoot, filePath)}: non-literal ${load.kind} module specifier at source offset ${load.offset} bypasses the source dependency policy`,
        );
      }
      for (const specifier of moduleSpecifiers.specifiers) {
        validateCrossFeatureSpecifier(
          {
            ...context,
            current,
            filePath,
            sourceRoot: path.join(currentRoot, "src"),
            usedFeatureSurfaces,
          },
          specifier,
        );
        validateInternalSpecifier(
          { ...context, current, currentRoot, declaredDependencies, filePath },
          specifier,
        );
      }
    }
  }

  validateFeatureDependencyUsage({
    ...context,
    isProductionSourceFile,
    usedFeatureSurfaces,
  });
}

export function validateSourceDependencyPolicy(policy, catalog, errors) {
  const byId = new Map((catalog.packages ?? []).map((entry) => [entry.id, entry]));
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
      errors.push(`architecture/source-dependency-policy.yaml: unknown consumer package ${edge.from}`);
    }
    if (!to) {
      errors.push(`architecture/source-dependency-policy.yaml: unknown provider package ${edge.to}`);
    }
    if (edge.from === edge.to) {
      errors.push(`architecture/source-dependency-policy.yaml: self dependency ${edge.from} is prohibited`);
    }
    if (from && to && !allowedInternalDependencyRoles[from.role]?.has(to.role)) {
      errors.push(
        `architecture/source-dependency-policy.yaml: role ${from.role} cannot depend on ${to.role} package in edge ${edge.from} -> ${edge.to}`,
      );
    }
    const key = dependencyEdgeKey(edge.from, edge.to);
    if (dependencyEdges.has(key)) {
      errors.push(`architecture/source-dependency-policy.yaml: duplicate edge ${edge.from} -> ${edge.to}`);
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
