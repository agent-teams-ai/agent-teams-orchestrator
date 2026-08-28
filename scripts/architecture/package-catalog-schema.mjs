import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const engineeringFoundationPackage =
  "@agent-teams/engineering-foundation";
export const packageCatalogSchemaSpecifier =
  `${engineeringFoundationPackage}/schemas/scaffold-target-catalog/v1.schema.json`;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultConsumerRoot = path.resolve(scriptDirectory, "../..");

function isWithin(parent, candidate) {
  const relation = path.relative(parent, candidate);
  return (
    relation === "" ||
    (relation !== ".." &&
      !relation.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relation))
  );
}

async function loadFoundationLocalMode() {
  return import(`${engineeringFoundationPackage}/local-mode`);
}

function installationGuidance(message) {
  return `${message} Run pnpm install --frozen-lockfile and pnpm foundation:assert-registry.`;
}

export async function loadCanonicalPackageCatalogSchema(options = {}) {
  const consumerRoot = options.consumerRoot ?? defaultConsumerRoot;
  let localMode;
  try {
    localMode = await (
      options.loadFoundationLocalMode ?? loadFoundationLocalMode
    )();
  } catch (error) {
    throw new Error(
      installationGuidance(
        `Cannot load ${engineeringFoundationPackage}/local-mode from the installed development dependency.`,
      ),
      { cause: error },
    );
  }

  if (typeof localMode.inspectFoundationMode !== "function") {
    throw new Error(
      installationGuidance(
        `Installed ${engineeringFoundationPackage} does not export inspectFoundationMode.`,
      ),
    );
  }

  let status;
  try {
    status = await localMode.inspectFoundationMode(consumerRoot);
  } catch (error) {
    throw new Error(
      installationGuidance(
        `Cannot inspect ${engineeringFoundationPackage} registry provenance.`,
      ),
      { cause: error },
    );
  }

  if (
    status.mode !== "REGISTRY" ||
    typeof status.installedPackageRoot !== "string" ||
    typeof status.installedVersion !== "string"
  ) {
    const details =
      status.issues?.join(" ") || `Foundation reported ${status.mode} mode.`;
    throw new Error(
      installationGuidance(
        `Canonical package catalog validation requires ${engineeringFoundationPackage} in exact registry mode: ${details}`,
      ),
    );
  }

  let schemaLocation;
  try {
    schemaLocation = await (
      options.resolveSchema ?? ((specifier) => import.meta.resolve(specifier))
    )(packageCatalogSchemaSpecifier);
  } catch (error) {
    throw new Error(
      installationGuidance(
        `Installed ${engineeringFoundationPackage}@${status.installedVersion} does not export ${packageCatalogSchemaSpecifier}.`,
      ),
      { cause: error },
    );
  }

  let installedPackageRoot;
  let schemaPath;
  let schemaSource;
  try {
    [installedPackageRoot, schemaPath] = await Promise.all([
      realpath(status.installedPackageRoot),
      realpath(fileURLToPath(schemaLocation)),
    ]);
    if (!isWithin(installedPackageRoot, schemaPath)) {
      throw new Error("schema resolved outside the installed Foundation package");
    }
    schemaSource = await readFile(schemaPath, "utf8");
  } catch (error) {
    throw new Error(
      installationGuidance(
        `Canonical schema ${packageCatalogSchemaSpecifier} is missing or unreadable in ${engineeringFoundationPackage}@${status.installedVersion}.`,
      ),
      { cause: error },
    );
  }

  let schema;
  try {
    schema = JSON.parse(schemaSource);
  } catch (error) {
    throw new Error(
      `Canonical schema ${packageCatalogSchemaSpecifier} in ${engineeringFoundationPackage}@${status.installedVersion} is not valid JSON.`,
      { cause: error },
    );
  }

  return {
    foundationVersion: status.installedVersion,
    schema,
    schemaPath,
  };
}
