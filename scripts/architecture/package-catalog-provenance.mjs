import { realpath } from "node:fs/promises";
import path from "node:path";

import {
  authorityFailure,
  boundedAuthorityPath,
  boundedAuthorityString,
  catalogAuthorityInputLimits,
  engineeringFoundationPackage,
} from "./package-catalog-authority-contract.mjs";

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

export function validateInspectionShape(status) {
  if (!plainObject(status)) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.status",
      { detail: "inspection status must be a plain object" },
    );
  }
  if (
    !Array.isArray(status.issues) ||
    status.issues.length > 64 ||
    !status.issues.every(
      (issue) =>
        typeof issue === "string" &&
        issue.length <= catalogAuthorityInputLimits.issue,
    )
  ) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.issues",
      { detail: "inspection issues must be a bounded string array" },
    );
  }
  if (status.issues.length > 0) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.issues",
      { count: status.issues.length, issue: status.issues[0] },
    );
  }
  if (!boundedAuthorityString(status.mode, catalogAuthorityInputLimits.mode)) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.mode",
      { detail: "inspection mode must be REGISTRY or LOCAL" },
    );
  }
  if (status.mode !== "REGISTRY" && status.mode !== "LOCAL") {
    throw authorityFailure(
      "orchestrator.catalog.provenance.mode",
      { value: status.mode },
    );
  }
  for (const [field, maximumLength, pathField] of [
    ["consumerRoot", catalogAuthorityInputLimits.path, true],
    ["dependencySpec", catalogAuthorityInputLimits.version, false],
    ["installedPackageRoot", catalogAuthorityInputLimits.path, true],
    ["installedVersion", catalogAuthorityInputLimits.version, false],
  ]) {
    const value = status[field];
    if (typeof value !== "string" || value.length === 0) {
      throw authorityFailure(
        "orchestrator.catalog.provenance.field",
        { field, value },
      );
    }
    const valid = pathField
      ? boundedAuthorityPath(value)
      : boundedAuthorityString(value, maximumLength);
    if (!valid) {
      throw authorityFailure(
        "orchestrator.catalog.provenance.field",
        { field, maximum: maximumLength },
      );
    }
  }
}

export async function assertStatusRoots(status, roots, declaredVersion) {
  let reportedConsumerRoot;
  let reportedPackageRoot;
  try {
    [reportedConsumerRoot, reportedPackageRoot] = await Promise.all([
      realpath(status.consumerRoot),
      realpath(status.installedPackageRoot),
    ]);
    if (
      !boundedAuthorityPath(reportedConsumerRoot) ||
      !boundedAuthorityPath(reportedPackageRoot)
    ) {
      throw new Error("inspection roots resolve beyond the supported path bound");
    }
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.root",
      { detail: "inspection roots cannot be resolved" },
      error,
    );
  }
  if (
    reportedConsumerRoot !== roots.consumerRoot ||
    reportedPackageRoot !== roots.packageRoot ||
    status.dependencySpec !== declaredVersion ||
    status.installedVersion !== declaredVersion
  ) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.binding",
      {
        detail:
          "inspection status does not match independently resolved roots and version",
      },
    );
  }
}

export async function assertRegistryStatus(status, roots, declaredVersion) {
  if (status.linkState !== undefined) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.registry-state",
      { detail: "REGISTRY status must not contain local link state" },
    );
  }
  if (!boundedAuthorityPath(status.lockfilePath)) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.registry-root",
      { detail: "registry paths cannot be resolved" },
    );
  }
  if (
    !boundedAuthorityString(
      status.lockfilePackageKey,
      catalogAuthorityInputLimits.packageKey,
    ) ||
    !boundedAuthorityString(
      status.registryIntegrity,
      catalogAuthorityInputLimits.integrity,
    )
  ) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.registry-binding",
      { detail: "registry provenance fields are missing or unbounded" },
    );
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(status.registryIntegrity)) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.registry-binding",
      { detail: "registry provenance does not bind the active package" },
    );
  }
  const expectedPackageEntry = path.join(
    roots.consumerRoot,
    "node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  let installedEntry;
  let nodeModulesRoot;
  let lockfilePath;
  try {
    [installedEntry, nodeModulesRoot, lockfilePath] = await Promise.all([
      realpath(expectedPackageEntry),
      realpath(path.join(roots.consumerRoot, "node_modules")),
      realpath(status.lockfilePath),
    ]);
    if (
      !boundedAuthorityPath(installedEntry) ||
      !boundedAuthorityPath(nodeModulesRoot) ||
      !boundedAuthorityPath(lockfilePath)
    ) {
      throw new Error("registry paths resolve beyond the supported path bound");
    }
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.registry-root",
      { detail: "registry paths cannot be resolved" },
      error,
    );
  }
  if (
    installedEntry !== roots.packageRoot ||
    !isWithin(nodeModulesRoot, roots.packageRoot) ||
    lockfilePath !== path.join(roots.consumerRoot, "pnpm-lock.yaml") ||
    status.lockfilePackageKey !==
      `${engineeringFoundationPackage}@${declaredVersion}`
  ) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.registry-binding",
      { detail: "registry provenance does not bind the active package" },
    );
  }
}

function invalidLocalLinkState(linkState, declaredVersion) {
  return (
    !plainObject(linkState) ||
    linkState.schemaVersion !== 1 ||
    !boundedAuthorityString(linkState.phase, catalogAuthorityInputLimits.mode) ||
    linkState.phase !== "LOCAL" ||
    !boundedAuthorityString(
      linkState.packageVersion,
      catalogAuthorityInputLimits.version,
    ) ||
    linkState.packageVersion !== declaredVersion ||
    !boundedAuthorityPath(linkState.consumerRoot) ||
    !boundedAuthorityPath(linkState.targetPackageRoot) ||
    !boundedAuthorityPath(linkState.registryBackupPath) ||
    !boundedAuthorityString(
      linkState.registryEntryKind,
      catalogAuthorityInputLimits.registryEntryKind,
    ) ||
    !["directory", "symbolic-link"].includes(linkState.registryEntryKind) ||
    !boundedAuthorityPath(linkState.registryPackageRoot) ||
    !boundedAuthorityString(linkState.gitCommit, 40) ||
    !/^[0-9a-f]{40}$/u.test(linkState.gitCommit) ||
    typeof linkState.gitDirty !== "boolean" ||
    !boundedAuthorityString(
      linkState.attachedAt,
      catalogAuthorityInputLimits.instant,
    ) ||
    !Number.isFinite(Date.parse(linkState.attachedAt))
  );
}

export async function assertLocalStatus(status, roots, declaredVersion) {
  const linkState = status.linkState;
  if (invalidLocalLinkState(linkState, declaredVersion)) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.local-state",
      { detail: "LOCAL status must contain explicit valid link state" },
    );
  }
  let linkedEntry;
  let stateConsumerRoot;
  let stateTargetRoot;
  try {
    [linkedEntry, stateConsumerRoot, stateTargetRoot] = await Promise.all([
      realpath(
        path.join(
          roots.consumerRoot,
          "node_modules",
          ...engineeringFoundationPackage.split("/"),
        ),
      ),
      realpath(linkState.consumerRoot),
      realpath(linkState.targetPackageRoot),
    ]);
    if (
      !boundedAuthorityPath(linkedEntry) ||
      !boundedAuthorityPath(stateConsumerRoot) ||
      !boundedAuthorityPath(stateTargetRoot)
    ) {
      throw new Error("LOCAL roots resolve beyond the supported path bound");
    }
  } catch (error) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.local-root",
      { detail: "LOCAL roots cannot be resolved" },
      error,
    );
  }
  if (
    linkedEntry !== roots.packageRoot ||
    stateConsumerRoot !== roots.consumerRoot ||
    stateTargetRoot !== roots.packageRoot
  ) {
    throw authorityFailure(
      "orchestrator.catalog.provenance.local-binding",
      { detail: "LOCAL link state does not bind the active package" },
    );
  }
}
