import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  acceptedOwnerStatuses,
  exists,
  loadDocuments,
  loadPackageCatalog,
  relative,
  walk,
} from "./package-catalog-lib.mjs";

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
  /^features\/[^/]+\//,
  /^generated\//,
  /^migrations\//,
  /^published-language\//,
];
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
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
  } catch (error) {
    errors.push(`${entry.path}/package.json: invalid JSON: ${error.message}`);
    return;
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
    }
  }

  const sourceRoot = path.join(packageRoot, "src");
  const sourceFiles = await walk(sourceRoot, () => true, {
    skipDirectories: ["node_modules", "dist", "coverage"],
  });
  if (
    entry.role !== "app" &&
    !sourceFiles.some((filePath) =>
      /^features\/[^/]+\//.test(relative(sourceRoot, filePath)),
    )
  ) {
    errors.push(
      `${entry.path}: library package requires at least one accepted feature slice; package-only scaffolding cannot pass CI`,
    );
  }

  for (const filePath of sourceFiles) {
    const sourceRelative = relative(sourceRoot, filePath);
    const [firstSegment] = sourceRelative.split("/");
    if (forbiddenPackageRootDirectories.has(firstSegment)) {
      errors.push(
        `${relative(repositoryRoot, filePath)}: source root ${firstSegment} is prohibited; assign code to a feature or accepted package assembly surface`,
      );
    }

    if (
      entry.role !== "app" &&
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
}

async function main() {
  const repositoryRoot = parseArguments(process.argv.slice(2));
  const schemaPath = path.join(
    repositoryRoot,
    "architecture/package-catalog.schema.json",
  );
  const errors = [];

  const [catalog, schemaSource, documents] = await Promise.all([
    loadPackageCatalog(repositoryRoot),
    readFile(schemaPath, "utf8"),
    loadDocuments(repositoryRoot),
  ]);
  const schema = JSON.parse(schemaSource);
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  const validateCatalog = ajv.compile(schema);

  if (!validateCatalog(catalog)) {
    for (const validationError of validateCatalog.errors ?? []) {
      errors.push(
        `architecture/package-catalog.yaml${validationError.instancePath}: ${validationError.message}`,
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
      await validateMaterializedPackage(
        repositoryRoot,
        entry,
        owner,
        byPackageName,
        errors,
      );
    }
  }

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
