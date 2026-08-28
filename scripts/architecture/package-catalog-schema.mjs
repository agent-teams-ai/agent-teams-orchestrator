import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  authorityFailure,
  boundedAuthorityPath as boundedPath,
  boundedAuthorityString as boundedString,
  catalogAuthorityInputLimits,
  engineeringFoundationPackage,
  packageCatalogSchemaId,
  packageCatalogSchemaSpecifier,
  packageManifestSpecifier,
  trustedRegistrySchemaDigestFor,
} from "./package-catalog-authority-contract.mjs";
import {
  assertRegistryStatus,
  derivePhysicalFoundationState,
  validateInspectionShape,
} from "./package-catalog-provenance.mjs";
import { readOpenedBoundedFile } from "./opened-bounded-file.mjs";

export {
  CatalogAuthorityError,
  engineeringFoundationPackage,
  packageCatalogSchemaId,
  packageCatalogSchemaSpecifier,
  packageManifestSpecifier,
  trustedRegistrySchemaDigests,
} from "./package-catalog-authority-contract.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultConsumerRoot = path.resolve(scriptDirectory, "../..");
const maximumManifestBytes = 64 * 1024;
const maximumSchemaBytes = 1024 * 1024;
const maximumResolverLocationLength =
  catalogAuthorityInputLimits.resolverLocation;
const maximumVersionLength = catalogAuthorityInputLimits.version;
const maximumPackageNameLength = catalogAuthorityInputLimits.packageName;
const exactVersionPattern =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

function plainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function resolvePackageExport(specifier, consumerRoot) {
  return createRequire(path.join(consumerRoot, "package.json")).resolve(
    specifier,
  );
}

function toFilePath(location) {
  let filePath;
  if (location instanceof URL) {
    if (!boundedString(location.href, maximumResolverLocationLength)) {
      throw new TypeError("package export resolver returned an unbounded URL");
    }
    filePath = fileURLToPath(location);
  } else if (boundedString(location, maximumResolverLocationLength)) {
    filePath = location.startsWith("file:")
      ? fileURLToPath(location)
      : location;
  } else {
    throw new TypeError("package export resolver returned a non-path value");
  }
  if (!boundedPath(filePath)) {
    throw new TypeError("package export resolver returned an unbounded path");
  }
  return filePath;
}

async function readBoundedFile(
  filePath,
  maximumBytes,
  rootPath,
  expectedRootIdentity,
) {
  return readOpenedBoundedFile({
    expectedRootIdentity,
    filePath,
    maximumBytes,
    rootPath,
  });
}

async function readConsumerVersion(consumerRoot) {
  let manifest;
  try {
    manifest = JSON.parse(
      (
        await readBoundedFile(
          path.join(consumerRoot, "package.json"),
          maximumManifestBytes,
          consumerRoot,
        )
      ).toString("utf8"),
    );
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.consumer-manifest",
      { detail: "consumer package.json is missing or invalid" },
      error,
    );
  }
  const version = plainObject(manifest?.devDependencies)
    ? manifest.devDependencies[engineeringFoundationPackage]
    : undefined;
  if (!boundedString(version, maximumVersionLength)) {
    throw authorityFailure(
      "orchestrator.catalog.authority.declared-version",
      { detail: "declared Foundation version must be a bounded exact version" },
    );
  }
  if (!exactVersionPattern.test(version)) {
    throw authorityFailure(
      "orchestrator.catalog.authority.declared-version",
      { value: version },
    );
  }
  return version;
}

async function resolveAuthorityFiles(consumerRoot, resolver, mode) {
  let manifestLocation;
  let schemaLocation;
  try {
    [manifestLocation, schemaLocation] = await Promise.all([
      resolver(packageManifestSpecifier, consumerRoot),
      resolver(packageCatalogSchemaSpecifier, consumerRoot),
    ]);
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.exports",
      { detail: "Foundation manifest or schema export cannot be resolved" },
      error,
      { mode },
    );
  }
  try {
    const requestedPaths = [
      toFilePath(manifestLocation),
      toFilePath(schemaLocation),
    ];
    const resolvedPaths = await Promise.all(
      requestedPaths.map((requestedPath) => realpath(requestedPath)),
    );
    if (!resolvedPaths.every(boundedPath)) {
      throw new Error("Foundation exports resolve beyond the supported path bound");
    }
    return requestedPaths.map((requestedPath, index) => ({
      canonicalPath: resolvedPaths[index],
      requestedPath,
    }));
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.realpath",
      { detail: "Foundation manifest or schema is missing or unreadable" },
      error,
      { mode },
    );
  }
}

function parseJson(source, ruleId, detail, mode) {
  try {
    return JSON.parse(source.toString("utf8"));
  } catch (error) {
    throw authorityFailure(ruleId, { detail }, error, { mode });
  }
}

async function inspectProvenance(consumerRoot, loader) {
  let localMode;
  try {
    localMode = await loader();
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.inspector-export",
      { detail: "Foundation local-mode export cannot be loaded" },
      error,
    );
  }
  if (typeof localMode?.inspectFoundationMode !== "function") {
    throw authorityFailure(
      "orchestrator.catalog.provenance.inspector-export",
      { detail: "inspectFoundationMode export is missing" },
    );
  }
  let status;
  try {
    status = await localMode.inspectFoundationMode(consumerRoot);
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.inspector-failure",
      { detail: "Foundation provenance inspection failed" },
      error,
    );
  }
  validateInspectionShape(status);
  return status;
}

async function resolveConsumerRoot(requestedConsumerRoot) {
  try {
    if (!boundedPath(requestedConsumerRoot)) {
      throw new Error("consumer root exceeds the supported path bound");
    }
    const consumerRoot = await realpath(requestedConsumerRoot);
    if (!boundedPath(consumerRoot)) {
      throw new Error("consumer root resolves beyond the supported path bound");
    }
    return consumerRoot;
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.consumer-root",
      { detail: "consumer root cannot be resolved" },
      error,
    );
  }
}

async function readAuthoritySources(
  manifestPath,
  schemaPath,
  packageRoot,
  packageRootIdentity,
  mode,
) {
  try {
    return await Promise.all([
      readBoundedFile(
        manifestPath,
        maximumManifestBytes,
        packageRoot,
        packageRootIdentity,
      ),
      readBoundedFile(
        schemaPath,
        maximumSchemaBytes,
        packageRoot,
        packageRootIdentity,
      ),
    ]);
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.read",
      { detail: "Foundation manifest or schema is unreadable or unbounded" },
      error,
      { mode },
    );
  }
}

function assertAuthorityIdentity(manifest, schema, declaredVersion, mode) {
  if (!plainObject(manifest)) {
    throw authorityFailure(
      "orchestrator.catalog.authority.package-identity",
      { detail: "Foundation manifest must be a plain object" },
      undefined,
      { mode },
    );
  }
  if (
    !boundedString(manifest.name, maximumPackageNameLength) ||
    !boundedString(manifest.version, maximumVersionLength)
  ) {
    throw authorityFailure(
      "orchestrator.catalog.authority.package-identity",
      { detail: "Foundation package identity fields must be bounded strings" },
      undefined,
      { mode },
    );
  }
  if (
    manifest.name !== engineeringFoundationPackage ||
    manifest.version !== declaredVersion
  ) {
    throw authorityFailure(
      "orchestrator.catalog.authority.package-identity",
      { name: manifest.name, version: manifest.version },
      undefined,
      { mode },
    );
  }
  if (!plainObject(schema) || schema.$id !== packageCatalogSchemaId) {
    throw authorityFailure(
      "orchestrator.catalog.authority.schema-identity",
      { id: schema?.$id, type: Array.isArray(schema) ? "array" : typeof schema },
      undefined,
      { mode },
    );
  }
}

async function assertTrustStatus(
  status,
  roots,
  declaredVersion,
  schemaSource,
  mode,
) {
  if (mode !== "REGISTRY") {
    return;
  }
  await assertRegistryStatus(status, roots, declaredVersion);
  const digest = `sha256:${createHash("sha256")
    .update(schemaSource)
    .digest("hex")}`;
  if (trustedRegistrySchemaDigestFor(declaredVersion) !== digest) {
    throw authorityFailure(
      "orchestrator.catalog.authority.registry-digest",
      { actual: digest, version: declaredVersion },
      undefined,
      { mode: "REGISTRY" },
    );
  }
}

export async function loadCanonicalPackageCatalogSchema(options = {}) {
  const consumerRoot = await resolveConsumerRoot(
    options.consumerRoot ?? defaultConsumerRoot,
  );
  const declaredVersion = await readConsumerVersion(consumerRoot);
  const status = await inspectProvenance(
    consumerRoot,
    options.loadFoundationLocalMode ?? loadFoundationLocalMode,
  );
  const physicalState = await derivePhysicalFoundationState(
    status,
    consumerRoot,
    declaredVersion,
  );
  const [manifestFile, schemaFile] = await resolveAuthorityFiles(
    consumerRoot,
    options.resolvePackageExport ?? resolvePackageExport,
    physicalState.mode,
  );
  const packageRoot = path.dirname(manifestFile.canonicalPath);
  if (packageRoot !== physicalState.packageRoot) {
    throw authorityFailure(
      "orchestrator.catalog.authority.export-binding",
      { detail: "Foundation exports do not belong to the active physical package" },
      undefined,
      { mode: physicalState.mode },
    );
  }
  if (!isWithin(packageRoot, schemaFile.canonicalPath)) {
    throw authorityFailure(
      "orchestrator.catalog.authority.schema-containment",
      { detail: "schema resolves outside the active Foundation package root" },
      undefined,
      { mode: physicalState.mode },
    );
  }
  const [manifestSource, schemaSource] = await readAuthoritySources(
    manifestFile.requestedPath,
    schemaFile.requestedPath,
    packageRoot,
    physicalState.packageRootIdentity,
    physicalState.mode,
  );
  const manifest = parseJson(
    manifestSource,
    "orchestrator.catalog.authority.manifest-json",
    "Foundation manifest is not valid JSON",
    physicalState.mode,
  );
  const schema = parseJson(
    schemaSource,
    "orchestrator.catalog.authority.schema-json",
    "Foundation schema is not valid JSON",
    physicalState.mode,
  );
  assertAuthorityIdentity(
    manifest,
    schema,
    declaredVersion,
    physicalState.mode,
  );
  const roots = { consumerRoot, packageRoot };
  await assertTrustStatus(
    status,
    roots,
    declaredVersion,
    schemaSource,
    physicalState.mode,
  );

  return {
    foundationVersion: declaredVersion,
    schema,
    schemaPath: schemaFile.canonicalPath,
    trustMode: physicalState.mode,
  };
}
