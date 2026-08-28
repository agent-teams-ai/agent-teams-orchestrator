import { constants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
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

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function remediationContext(status) {
  const mode = plainObject(status?.linkState)
    ? "LOCAL"
    : status?.mode === "REGISTRY"
      ? "REGISTRY"
      : undefined;
  const recoveryRequired =
    plainObject(status?.transaction) && status.transaction.state !== "idle";
  return {
    ...(mode === undefined ? {} : { mode }),
    ...(recoveryRequired ? { recoveryRequired: true } : {}),
  };
}

function provenanceFailure(status, ruleId, fields, cause) {
  return authorityFailure(ruleId, fields, cause, remediationContext(status));
}

function directoryOpenFlags() {
  if (!Number.isInteger(constants.O_DIRECTORY) || constants.O_DIRECTORY === 0) {
    return undefined;
  }
  return (
    constants.O_RDONLY |
    constants.O_DIRECTORY |
    (constants.O_NOFOLLOW ?? 0) |
    (constants.O_NONBLOCK ?? 0)
  );
}

async function inspectPhysicalDirectory(requestedPath, allowSymbolicLink) {
  const entryBefore = await lstat(requestedPath, { bigint: true });
  const entryKind = entryBefore.isSymbolicLink()
    ? "symbolic-link"
    : entryBefore.isDirectory()
      ? "directory"
      : "other";
  if (
    entryKind === "other" ||
    (entryKind === "symbolic-link" && !allowSymbolicLink)
  ) {
    throw new Error("physical authority path is not an allowed directory entry");
  }
  const canonicalPath = await realpath(requestedPath);
  const targetBefore = await stat(canonicalPath, { bigint: true });
  if (!targetBefore.isDirectory()) {
    throw new Error("physical authority target is not a directory");
  }

  const flags = directoryOpenFlags();
  if (flags !== undefined) {
    const handle = await open(canonicalPath, flags);
    try {
      const descriptor = await handle.stat({ bigint: true });
      if (!descriptor.isDirectory() || !sameIdentity(descriptor, targetBefore)) {
        throw new Error("physical authority descriptor changed identity");
      }
    } finally {
      await handle.close();
    }
  }

  const [entryAfter, currentPath] = await Promise.all([
    lstat(requestedPath, { bigint: true }),
    realpath(requestedPath),
  ]);
  const targetAfter = await stat(currentPath, { bigint: true });
  const currentKind = entryAfter.isSymbolicLink()
    ? "symbolic-link"
    : entryAfter.isDirectory()
      ? "directory"
      : "other";
  if (
    currentKind !== entryKind ||
    currentPath !== canonicalPath ||
    !sameIdentity(entryBefore, entryAfter) ||
    !sameIdentity(targetBefore, targetAfter)
  ) {
    throw new Error("physical authority path changed during inspection");
  }
  return { canonicalPath, entryKind, targetIdentity: targetBefore };
}

export function validateInspectionShape(status) {
  if (!plainObject(status)) {
    throw provenanceFailure(
      status,
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
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.issues",
      { detail: "inspection issues must be a bounded string array" },
    );
  }
  if (status.issues.length > 0) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.issues",
      { count: status.issues.length, issue: status.issues[0] },
    );
  }
  if (!boundedAuthorityString(status.mode, catalogAuthorityInputLimits.mode)) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.mode",
      { detail: "inspection mode must be REGISTRY or LOCAL" },
    );
  }
  if (status.mode !== "REGISTRY" && status.mode !== "LOCAL") {
    throw provenanceFailure(
      status,
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
      throw provenanceFailure(
        status,
        "orchestrator.catalog.provenance.field",
        { field, value },
      );
    }
    const valid = pathField
      ? boundedAuthorityPath(value)
      : boundedAuthorityString(value, maximumLength);
    if (!valid) {
      throw provenanceFailure(
        status,
        "orchestrator.catalog.provenance.field",
        { field, maximum: maximumLength },
      );
    }
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
    !boundedAuthorityString(linkState.gitCommit, 64) ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(linkState.gitCommit) ||
    typeof linkState.gitDirty !== "boolean" ||
    !boundedAuthorityString(
      linkState.attachedAt,
      catalogAuthorityInputLimits.instant,
    ) ||
    !Number.isFinite(Date.parse(linkState.attachedAt))
  );
}

async function inspectCommonPhysicalBinding(
  status,
  consumerRoot,
  declaredVersion,
) {
  const activePath = path.join(
    consumerRoot,
    "node_modules",
    ...engineeringFoundationPackage.split("/"),
  );
  try {
    const [consumer, active, reportedConsumer, reportedPackage] =
      await Promise.all([
        inspectPhysicalDirectory(consumerRoot, false),
        inspectPhysicalDirectory(activePath, true),
        inspectPhysicalDirectory(status.consumerRoot, false),
        inspectPhysicalDirectory(status.installedPackageRoot, true),
      ]);
    if (
      consumer.canonicalPath !== consumerRoot ||
      reportedConsumer.canonicalPath !== consumerRoot ||
      reportedPackage.canonicalPath !== active.canonicalPath ||
      status.dependencySpec !== declaredVersion ||
      status.installedVersion !== declaredVersion
    ) {
      throw new Error("inspection status does not match physical binding");
    }
    return { activePath, active, consumer };
  } catch (error) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.binding",
      {
        detail:
          "inspection status does not match descriptor-checked roots and version",
      },
      error,
    );
  }
}

async function inspectLocalPhysicalBinding(status, common, consumerRoot) {
  const linkState = status.linkState;
  if (invalidLocalLinkState(linkState, status.dependencySpec)) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.local-state",
      { detail: "LOCAL status must contain explicit valid link state" },
    );
  }
  const stateRoot = path.join(consumerRoot, ".agent-teams-local");
  const expectedBackupPath = path.join(
    stateRoot,
    "foundation-registry-backup",
  );
  const nodeModulesRoot = path.join(consumerRoot, "node_modules");
  try {
    const [stateConsumer, stateTarget, backup, nodeModules, stateDirectory] =
      await Promise.all([
        inspectPhysicalDirectory(linkState.consumerRoot, false),
        inspectPhysicalDirectory(linkState.targetPackageRoot, false),
        inspectPhysicalDirectory(linkState.registryBackupPath, true),
        inspectPhysicalDirectory(nodeModulesRoot, false),
        inspectPhysicalDirectory(stateRoot, false),
      ]);
    if (
      common.active.entryKind !== "symbolic-link" ||
      stateConsumer.canonicalPath !== consumerRoot ||
      stateTarget.canonicalPath !== common.active.canonicalPath ||
      path.resolve(linkState.consumerRoot) !== consumerRoot ||
      path.resolve(linkState.targetPackageRoot) !== stateTarget.canonicalPath ||
      path.resolve(linkState.registryBackupPath) !== expectedBackupPath ||
      stateDirectory.canonicalPath !== stateRoot ||
      !isWithin(consumerRoot, expectedBackupPath) ||
      !isWithin(nodeModules.canonicalPath, path.resolve(linkState.registryPackageRoot)) ||
      backup.entryKind !== linkState.registryEntryKind
    ) {
      throw new Error("LOCAL state paths do not match the active physical binding");
    }
    if (linkState.registryEntryKind === "directory") {
      if (
        path.resolve(linkState.registryPackageRoot) !== common.activePath ||
        backup.canonicalPath !== expectedBackupPath
      ) {
        throw new Error("LOCAL directory backup does not bind the registry entry");
      }
    } else {
      const registryRoot = await inspectPhysicalDirectory(
        linkState.registryPackageRoot,
        false,
      );
      if (backup.canonicalPath !== registryRoot.canonicalPath) {
        throw new Error("LOCAL symbolic-link backup does not bind the registry root");
      }
    }
  } catch (error) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.local-binding",
      {
        detail:
          "LOCAL state does not bind the descriptor-checked active path, target, consumer, backup, and registry entry",
      },
      error,
    );
  }
}

async function inspectRegistryPhysicalBinding(status, common, consumerRoot) {
  if (status.linkState !== undefined) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.registry-state",
      { detail: "REGISTRY physical state must not contain local link state" },
    );
  }
  try {
    const nodeModules = await inspectPhysicalDirectory(
      path.join(consumerRoot, "node_modules"),
      false,
    );
    if (!isWithin(nodeModules.canonicalPath, common.active.canonicalPath)) {
      throw new Error("registry package root is outside consumer node_modules");
    }
  } catch (error) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.registry-root",
      { detail: "registry package root is not consumer-owned physical state" },
      error,
    );
  }
}

export async function derivePhysicalFoundationState(
  status,
  consumerRoot,
  declaredVersion,
) {
  const common = await inspectCommonPhysicalBinding(
    status,
    consumerRoot,
    declaredVersion,
  );
  const mode = status.linkState === undefined ? "REGISTRY" : "LOCAL";
  if (mode === "LOCAL") {
    await inspectLocalPhysicalBinding(status, common, consumerRoot);
  } else {
    await inspectRegistryPhysicalBinding(status, common, consumerRoot);
  }
  if (status.mode !== mode) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.mode-binding",
      { derived: mode, reported: status.mode },
    );
  }
  return {
    mode,
    packageRoot: common.active.canonicalPath,
    packageRootIdentity: common.active.targetIdentity,
  };
}

export async function assertRegistryStatus(status, roots, declaredVersion) {
  if (!boundedAuthorityPath(status.lockfilePath)) {
    throw provenanceFailure(
      status,
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
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.registry-binding",
      { detail: "registry provenance fields are missing or unbounded" },
    );
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(status.registryIntegrity)) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.registry-binding",
      { detail: "registry provenance does not bind the active package" },
    );
  }
  let lockfilePath;
  try {
    lockfilePath = await realpath(status.lockfilePath);
    if (!boundedAuthorityPath(lockfilePath)) {
      throw new Error("registry lockfile resolves beyond the supported path bound");
    }
  } catch (error) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.registry-root",
      { detail: "registry paths cannot be resolved" },
      error,
    );
  }
  if (
    lockfilePath !== path.join(roots.consumerRoot, "pnpm-lock.yaml") ||
    status.lockfilePackageKey !==
      `${engineeringFoundationPackage}@${declaredVersion}`
  ) {
    throw provenanceFailure(
      status,
      "orchestrator.catalog.provenance.registry-binding",
      { detail: "registry provenance does not bind the active package" },
    );
  }
}
