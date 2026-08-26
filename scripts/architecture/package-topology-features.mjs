import path from "node:path";

import { relative } from "./package-catalog-lib.mjs";

const featurePathPattern = /^features\/([^/]+)\/([^/]+)(?:\/|$)/u;
const internalApiPattern =
  /^features\/([^/]+)\/(domain|application)\/internal-api(?:\.[cm]?[jt]sx?)?$/u;

export function featureDependencyEdgeKey(packageId, fromFeature, toFeature) {
  return `${packageId}\0${fromFeature}\0${toFeature}`;
}

function sourceLocation(sourceRoot, filePath) {
  const match = relative(sourceRoot, filePath).match(featurePathPattern);
  return match ? { feature: match[1], layer: match[2] } : null;
}

function relativeSourceTarget(sourceRoot, filePath, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const target = relative(
    sourceRoot,
    path.resolve(path.dirname(filePath), specifier),
  );
  return target.replace(/\.[cm]?[jt]sx?$/u, "");
}

export function validateCrossFeatureSpecifier(context, specifier) {
  const {
    current,
    errors,
    featureDependencyEdges,
    filePath,
    repositoryRoot,
    sourceRoot,
    usedFeatureSurfaces,
  } = context;
  const source = sourceLocation(sourceRoot, filePath);
  const targetPath = relativeSourceTarget(sourceRoot, filePath, specifier);
  const targetFeature = targetPath?.match(/^features\/([^/]+)(?:\/|$)/u)?.[1];
  if (!source || !targetFeature || source.feature === targetFeature) {
    return;
  }

  const target = targetPath.match(internalApiPattern);
  if (!target) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: cross-feature import ${specifier} must target domain/internal-api.ts or application/internal-api.ts`,
    );
    return;
  }
  const [, providerFeature, surface] = target;
  if (source.layer !== "domain" && source.layer !== "application") {
    errors.push(
      `${relative(repositoryRoot, filePath)}: ${source.layer} cannot import sibling feature ${providerFeature}; route collaboration through the owning application core and composition`,
    );
    return;
  }
  if (source.layer === "domain" && surface !== "domain") {
    errors.push(
      `${relative(repositoryRoot, filePath)}: domain code may import only a sibling domain/internal-api.ts surface`,
    );
    return;
  }

  const edgeKey = featureDependencyEdgeKey(
    current.entry.id,
    source.feature,
    providerFeature,
  );
  const edge = featureDependencyEdges.get(edgeKey);
  if (!edge) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: feature dependency ${current.entry.id}:${source.feature} -> ${providerFeature} is denied by default`,
    );
    return;
  }
  if (!edge.imports.includes(surface)) {
    errors.push(
      `${relative(repositoryRoot, filePath)}: ${surface} is not an allowed internal surface for feature dependency ${current.entry.id}:${source.feature} -> ${providerFeature}`,
    );
    return;
  }
  usedFeatureSurfaces.add(`${edgeKey}\0${surface}`);
}

export function validateFeatureDependencyUsage(context) {
  const {
    errors,
    featureDependencyEdges,
    isProductionSourceFile,
    materializedPackages,
    repositoryRoot,
    usedFeatureSurfaces,
  } = context;
  const materializedById = new Map(
    [...materializedPackages.values()].map((entry) => [entry.entry.id, entry]),
  );
  for (const [edgeKey, edge] of featureDependencyEdges) {
    const materialized = materializedById.get(edge.package);
    if (!materialized) {
      errors.push(
        `architecture/source-dependency-policy.yaml: feature edge ${edge.package}:${edge.from} -> ${edge.to} requires a materialized package`,
      );
      continue;
    }
    const sourceRoot = path.join(repositoryRoot, materialized.entry.path, "src");
    const featureNames = new Set(
      materialized.sourceFiles
        .filter(isProductionSourceFile)
        .map((filePath) => sourceLocation(sourceRoot, filePath)?.feature)
        .filter(Boolean),
    );
    for (const feature of [edge.from, edge.to]) {
      if (!featureNames.has(feature)) {
        errors.push(
          `architecture/source-dependency-policy.yaml: feature edge ${edge.package}:${edge.from} -> ${edge.to} references unknown feature ${feature}`,
        );
      }
    }
    for (const surface of edge.imports) {
      if (!usedFeatureSurfaces.has(`${edgeKey}\0${surface}`)) {
        errors.push(
          `architecture/source-dependency-policy.yaml: feature edge ${edge.package}:${edge.from} -> ${edge.to} declares unused ${surface} surface`,
        );
      }
    }
  }
}

export function validateFeatureDependencyPolicy(policy, catalog, errors) {
  const byId = new Map((catalog?.packages ?? []).map((entry) => [entry.id, entry]));
  const featureDependencyEdges = new Map();
  const adjacencyByPackage = new Map();
  for (const edge of policy?.feature_edges ?? []) {
    if (
      !edge ||
      typeof edge.package !== "string" ||
      typeof edge.from !== "string" ||
      typeof edge.to !== "string" ||
      !Array.isArray(edge.imports)
    ) {
      continue;
    }
    if (!byId.has(edge.package)) {
      errors.push(
        `architecture/source-dependency-policy.yaml: unknown feature-edge package ${edge.package}`,
      );
    }
    if (edge.from === edge.to) {
      errors.push(
        `architecture/source-dependency-policy.yaml: self feature dependency ${edge.package}:${edge.from} is prohibited`,
      );
    }
    const edgeKey = featureDependencyEdgeKey(edge.package, edge.from, edge.to);
    if (featureDependencyEdges.has(edgeKey)) {
      errors.push(
        `architecture/source-dependency-policy.yaml: duplicate feature edge ${edge.package}:${edge.from} -> ${edge.to}`,
      );
    } else {
      featureDependencyEdges.set(edgeKey, edge);
    }
    const adjacency = adjacencyByPackage.get(edge.package) ?? new Map();
    const targets = adjacency.get(edge.from) ?? new Set();
    targets.add(edge.to);
    adjacency.set(edge.from, targets);
    adjacencyByPackage.set(edge.package, adjacency);
  }

  for (const [packageId, adjacency] of adjacencyByPackage) {
    const visited = new Set();
    const visiting = new Set();
    const pathStack = [];
    function visit(feature) {
      if (visiting.has(feature)) {
        const cycleStart = pathStack.indexOf(feature);
        const cycle = [...pathStack.slice(cycleStart), feature];
        errors.push(
          `architecture/source-dependency-policy.yaml: feature dependency cycle ${packageId}:${cycle.join(" -> ")}`,
        );
        return;
      }
      if (visited.has(feature)) {
        return;
      }
      visiting.add(feature);
      pathStack.push(feature);
      for (const target of adjacency.get(feature) ?? []) {
        visit(target);
      }
      pathStack.pop();
      visiting.delete(feature);
      visited.add(feature);
    }
    for (const feature of adjacency.keys()) {
      visit(feature);
    }
  }
  return featureDependencyEdges;
}
