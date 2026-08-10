import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { foundationConfigPath, repositoryRoot } from "./paths.mjs";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readYaml = (filePath) => parse(fs.readFileSync(filePath, "utf8"));
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const resolveRepositoryPath = (repositoryPath) =>
  path.join(repositoryRoot, repositoryPath);

const loadCatalogDescriptor = () => {
  const foundation = readYaml(foundationConfigPath);
  const capabilityPath =
    foundation.capabilities["quality.executable-specifications"].configPath;
  const capability = readYaml(resolveRepositoryPath(capabilityPath));
  return {
    catalog: readJson(resolveRepositoryPath(capability.catalogPath)),
    catalogPath: capability.catalogPath,
  };
};

export const loadCatalog = () => loadCatalogDescriptor().catalog;

const jsonFilesUnder = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return jsonFilesUnder(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".json") ? [entryPath] : [];
  });

export const loadCatalogBundle = (catalog = loadCatalog()) => {
  if (catalog.specifications.length !== 1) {
    throw new Error("Orchestrator executable specs must remain one catalog bundle");
  }
  const specification = catalog.specifications[0];
  const { catalogPath } = loadCatalogDescriptor();
  const expectedJsonPaths = new Set(
    [
      catalogPath,
      ...specification.schemaPaths,
      ...specification.documents.map((document) => document.path),
      ...specification.generatedTypes.map((generatedType) => generatedType.outputPath),
      specification.stateModel.modelPath,
      specification.stateModel.adapterPath,
      specification.stateModel.tracesPath,
      specification.stateModel.diagramPath,
    ].filter((repositoryPath) => repositoryPath.endsWith(".json")),
  );
  const actualJsonPaths = new Set(
    jsonFilesUnder(path.join(repositoryRoot, "architecture/executable-specs")).map(
      (filePath) => path.relative(repositoryRoot, filePath),
    ),
  );
  if (
    JSON.stringify([...actualJsonPaths].toSorted()) !==
    JSON.stringify([...expectedJsonPaths].toSorted())
  ) {
    throw new Error("Executable-spec JSON filesystem inventory differs from the catalog");
  }
  const schemas = specification.schemaPaths.map((schemaPath) =>
    readJson(resolveRepositoryPath(schemaPath)),
  );
  const schemaIds = new Set(schemas.map((schema) => schema.$id));
  const documents = specification.documents.map((document) => {
    if (!schemaIds.has(document.schemaId)) {
      throw new Error(`Document schema is not cataloged: ${document.schemaId}`);
    }
    return readJson(resolveRepositoryPath(document.path));
  });
  const expectedHarnessPaths = {
    modelPath: path.join(scriptDirectory, "state-model.mjs"),
    adapterPath: path.join(scriptDirectory, "derive-machine.mjs"),
  };
  for (const [field, expectedPath] of Object.entries(expectedHarnessPaths)) {
    if (resolveRepositoryPath(specification.stateModel[field]) !== expectedPath) {
      throw new Error(`Catalog ${field} does not identify the active harness`);
    }
  }
  const expectedGates = {
    property: "specs:property",
    mutation: "specs:mutation",
    model: "specs:model",
  };
  const actualGates = {
    ...specification.gateBindings,
    model: specification.stateModel.gateBinding,
  };
  for (const [role, expectedScript] of Object.entries(expectedGates)) {
    const binding = actualGates[role];
    if (
      binding.packageName !== "@agent-teams/orchestrator-repository" ||
      binding.script !== expectedScript
    ) {
      throw new Error(`Catalog ${role} gate does not identify ${expectedScript}`);
    }
  }
  const modeledAxes = documents
    .flatMap((document) => document.axes.filter((axis) => axis.modeled))
    .map((axis) => axis.id)
    .toSorted();
  if (
    JSON.stringify(modeledAxes) !==
    JSON.stringify(specification.stateModel.axes.toSorted())
  ) {
    throw new Error("Catalog XState axes differ from the modeled document axes");
  }
  return { catalog, documents, schemas, specification };
};

export const loadSchema = () => {
  const { schemas } = loadCatalogBundle();
  if (schemas.length !== 1) {
    throw new Error("The shared Orchestrator spec schema inventory must contain one schema");
  }
  return schemas[0];
};

export const loadSpecs = () => loadCatalogBundle().documents;
