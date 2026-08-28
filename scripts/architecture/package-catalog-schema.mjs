import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
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
  trustedRegistrySchemaDigests,
} from "./package-catalog-authority-contract.mjs";
import {
  assertLocalStatus,
  assertRegistryStatus,
  assertStatusRoots,
  validateInspectionShape,
} from "./package-catalog-provenance.mjs";

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

async function readBoundedFile(filePath, maximumBytes, label) {
  const metadata = await stat(filePath);
  if (!metadata.isFile() || metadata.size > maximumBytes) {
    throw new Error(`${label} must be a bounded regular file`);
  }
  return readFile(filePath);
}

async function readConsumerVersion(consumerRoot) {
  let manifest;
  try {
    manifest = JSON.parse(
      (
        await readBoundedFile(
          path.join(consumerRoot, "package.json"),
          maximumManifestBytes,
          "consumer manifest",
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

async function resolveAuthorityFiles(consumerRoot, resolver) {
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
    );
  }
  try {
    const resolvedPaths = await Promise.all([
      realpath(toFilePath(manifestLocation)),
      realpath(toFilePath(schemaLocation)),
    ]);
    if (!resolvedPaths.every(boundedPath)) {
      throw new Error("Foundation exports resolve beyond the supported path bound");
    }
    return resolvedPaths;
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.realpath",
      { detail: "Foundation manifest or schema is missing or unreadable" },
      error,
    );
  }
}

function parseJson(source, ruleId, detail) {
  try {
    return JSON.parse(source.toString("utf8"));
  } catch (error) {
    throw authorityFailure(ruleId, { detail }, error);
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

async function readAuthoritySources(manifestPath, schemaPath) {
  try {
    return await Promise.all([
      readBoundedFile(manifestPath, maximumManifestBytes, "Foundation manifest"),
      readBoundedFile(schemaPath, maximumSchemaBytes, "Foundation schema"),
    ]);
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.authority.read",
      { detail: "Foundation manifest or schema is unreadable or unbounded" },
      error,
    );
  }
}

function assertAuthorityIdentity(manifest, schema, declaredVersion) {
  if (!plainObject(manifest)) {
    throw authorityFailure(
      "orchestrator.catalog.authority.package-identity",
      { detail: "Foundation manifest must be a plain object" },
    );
  }
  if (
    !boundedString(manifest.name, maximumPackageNameLength) ||
    !boundedString(manifest.version, maximumVersionLength)
  ) {
    throw authorityFailure(
      "orchestrator.catalog.authority.package-identity",
      { detail: "Foundation package identity fields must be bounded strings" },
    );
  }
  if (
    manifest.name !== engineeringFoundationPackage ||
    manifest.version !== declaredVersion
  ) {
    throw authorityFailure(
      "orchestrator.catalog.authority.package-identity",
      { name: manifest.name, version: manifest.version },
    );
  }
  if (!plainObject(schema) || schema.$id !== packageCatalogSchemaId) {
    throw authorityFailure(
      "orchestrator.catalog.authority.schema-identity",
      { id: schema?.$id, type: Array.isArray(schema) ? "array" : typeof schema },
    );
  }
}

async function assertTrustStatus(status, roots, declaredVersion, schemaSource) {
  await assertStatusRoots(status, roots, declaredVersion);
  if (status.mode !== "REGISTRY") {
    await assertLocalStatus(status, roots, declaredVersion);
    return;
  }
  await assertRegistryStatus(status, roots, declaredVersion);
  const digest = `sha256:${createHash("sha256")
    .update(schemaSource)
    .digest("hex")}`;
  if (trustedRegistrySchemaDigests[declaredVersion] !== digest) {
    throw authorityFailure(
      "orchestrator.catalog.authority.registry-digest",
      { actual: digest, version: declaredVersion },
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
  const [manifestPath, schemaPath] = await resolveAuthorityFiles(
    consumerRoot,
    options.resolvePackageExport ?? resolvePackageExport,
  );
  const packageRoot = path.dirname(manifestPath);
  if (!isWithin(packageRoot, schemaPath)) {
    throw authorityFailure(
      "orchestrator.catalog.authority.schema-containment",
      { detail: "schema resolves outside the active Foundation package root" },
    );
  }
  const [manifestSource, schemaSource] = await readAuthoritySources(
    manifestPath,
    schemaPath,
  );
  const manifest = parseJson(
    manifestSource,
    "orchestrator.catalog.authority.manifest-json",
    "Foundation manifest is not valid JSON",
  );
  const schema = parseJson(
    schemaSource,
    "orchestrator.catalog.authority.schema-json",
    "Foundation schema is not valid JSON",
  );
  assertAuthorityIdentity(manifest, schema, declaredVersion);
  const roots = { consumerRoot, packageRoot };
  await assertTrustStatus(status, roots, declaredVersion, schemaSource);

  return {
    foundationVersion: declaredVersion,
    schema,
    schemaPath,
    trustMode: status.mode,
  };
}
