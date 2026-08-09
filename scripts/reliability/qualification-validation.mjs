import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

const requiredDeploymentProfiles = new Set([
  "connected-self-hosted",
  "fully-local",
  "managed-saas",
  "standalone-self-hosted",
]);
const expectedProfileDefinitions = new Map([
  [
    "managed-saas",
    [
      "v1-target",
      "managed-platform",
      "optional-managed-platform",
      ["server-runtime-execution"],
      ["OD-003", "OD-012"],
    ],
  ],
  [
    "standalone-self-hosted",
    [
      "v1-target",
      "standalone",
      "none",
      ["server-runtime-execution"],
      ["OD-003", "OD-012"],
    ],
  ],
  [
    "connected-self-hosted",
    [
      "future",
      "standalone",
      "optional-managed-platform",
      ["server-runtime-execution"],
      ["OD-003", "OD-012"],
    ],
  ],
  [
    "fully-local",
    [
      "future",
      "local-standalone",
      "none",
      ["local-host-runtime-execution"],
      ["OD-001", "OD-003", "OD-009", "OD-021", "OD-035"],
    ],
  ],
]);
const expectedDeploymentCapabilities = new Map([
  [
    "server-runtime-execution",
    ["connected-self-hosted", "managed-saas", "standalone-self-hosted"],
  ],
  ["local-host-runtime-execution", ["fully-local"]],
  [
    "local-device-execution",
    ["connected-self-hosted", "managed-saas", "standalone-self-hosted"],
  ],
  [
    "managed-commercial-entitlements",
    ["connected-self-hosted", "managed-saas"],
  ],
]);

async function loadDecisionRegistry(repositoryRoot) {
  const registry = new Map();
  for (const directory of ["docs/decisions", "docs/open-decisions"]) {
    const absoluteDirectory = path.join(repositoryRoot, directory);
    for (const fileName of await readdir(absoluteDirectory)) {
      if (!fileName.endsWith(".md") || fileName === "README.md") {
        continue;
      }
      const source = await readFile(path.join(absoluteDirectory, fileName), "utf8");
      const closingFence = source.indexOf("\n---", 4);
      if (!source.startsWith("---\n") || closingFence === -1) {
        continue;
      }
      const metadata = YAML.parse(source.slice(4, closingFence));
      if (typeof metadata?.id === "string") {
        registry.set(metadata.id, metadata);
      }
    }
  }
  return registry;
}

function validateQualificationState(item, kind, errors) {
  const blockers = item.blockedBy ?? [];
  const evidence = item.qualificationEvidence ?? {};
  if (
    new Set(["blocked", "deferred"]).has(item.qualification) &&
    blockers.length === 0
  ) {
    errors.push(
      `REL-PROFILE-003 ${item.id}: ${item.qualification} ${kind} requires a blocking decision`,
    );
  }
  if (item.qualification === "qualified" && blockers.length > 0) {
    errors.push(
      `REL-PROFILE-004 ${item.id}: qualified ${kind} cannot retain blocking decisions`,
    );
  }
  if (
    item.qualification === "qualified" &&
    ((evidence.decisionRefs?.length ?? 0) === 0 ||
      (evidence.conformanceRefs?.length ?? 0) === 0)
  ) {
    errors.push(
      `REL-PROFILE-007 ${item.id}: qualified ${kind} requires decision and conformance evidence`,
    );
  }
}

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.toSorted().every((value, index) => value === expected[index])
  );
}

function validateQualificationFramework(catalog, errors) {
  const framework = catalog.qualificationFramework;
  validateQualificationState(framework, "framework", errors);
  if (framework.qualification === "qualified") {
    errors.push(
      "REL-PROFILE-017 qualification framework cannot be qualified before the OD-039 attestation verifier is implemented",
    );
  }
  if (
    framework.qualification !== "qualified" &&
    [...(catalog.profiles ?? []), ...(catalog.capabilities ?? [])].some(
      (item) => item.qualification === "qualified",
    )
  ) {
    errors.push(
      "REL-PROFILE-018 profile or capability cannot be qualified while the qualification framework is blocked",
    );
  }
}

function validateProfiles(catalog, errors) {
  const ids = new Set();
  for (const profile of catalog.profiles ?? []) {
    if (ids.has(profile.id)) {
      errors.push(`REL-PROFILE-002 ${profile.id}: duplicate deployment profile`);
    }
    ids.add(profile.id);
    validateQualificationState(profile, "profile", errors);
    if (
      profile.releaseScope === "v1-target" &&
      profile.qualification === "deferred"
    ) {
      errors.push(
        `REL-PROFILE-005 ${profile.id}: v1 target cannot be deferred`,
      );
    }
    const expected = expectedProfileDefinitions.get(profile.id);
    if (
      expected &&
      (profile.releaseScope !== expected[0] ||
        profile.productAuthorityAdapter !== expected[1] ||
        profile.commercialAuthorityAdapter !== expected[2] ||
        !sameMembers(profile.requiredCapabilities ?? [], expected[3]) ||
        !sameMembers(profile.blockedBy ?? [], expected[4]))
    ) {
      errors.push(
        `REL-PROFILE-008 ${profile.id}: release, authority, blocker, or mandatory capability binding does not match the accepted profile`,
      );
    }
  }
  for (const required of requiredDeploymentProfiles) {
    if (!ids.has(required)) {
      errors.push(
        `REL-PROFILE-006 ${required}: required deployment profile is missing`,
      );
    }
  }
}

function validateCapabilityProfiles(capability, profileIds, errors) {
  const expectedProfiles = expectedDeploymentCapabilities.get(capability.id);
  if (!expectedProfiles) {
    errors.push(
      `REL-PROFILE-019 ${capability.id}: deployment capability is not in the closed registry`,
    );
  } else if (!sameMembers(capability.profiles ?? [], expectedProfiles)) {
    errors.push(
      `REL-PROFILE-020 ${capability.id}: deployment capability profile binding does not match the accepted registry`,
    );
  }
  for (const profile of capability.profiles ?? []) {
    if (!profileIds.has(profile)) {
      errors.push(
        `REL-PROFILE-010 ${capability.id}: unknown deployment profile ${profile}`,
      );
    }
  }
}

function validateRequiredCapabilities(catalog, capabilityIds, errors) {
  for (const required of expectedDeploymentCapabilities.keys()) {
    if (!capabilityIds.has(required)) {
      errors.push(
        `REL-PROFILE-021 ${required}: required deployment capability is missing`,
      );
    }
  }
  const capabilityById = new Map(
    (catalog.capabilities ?? []).map((capability) => [capability.id, capability]),
  );
  for (const profile of catalog.profiles ?? []) {
    if (profile.qualification !== "qualified") {
      continue;
    }
    for (const capabilityId of profile.requiredCapabilities ?? []) {
      if (capabilityById.get(capabilityId)?.qualification !== "qualified") {
        errors.push(
          `REL-PROFILE-022 ${profile.id}: mandatory capability ${capabilityId} is not qualified`,
        );
      }
    }
  }
}

function validateDeploymentCapabilities(catalog, errors) {
  const profileIds = new Set(
    (catalog.profiles ?? []).map((profile) => profile.id),
  );
  const capabilityIds = new Set();
  for (const capability of catalog.capabilities ?? []) {
    if (capabilityIds.has(capability.id)) {
      errors.push(
        `REL-PROFILE-009 ${capability.id}: duplicate deployment capability`,
      );
    }
    capabilityIds.add(capability.id);
    validateQualificationState(capability, "capability", errors);
    validateCapabilityProfiles(capability, profileIds, errors);
  }
  validateRequiredCapabilities(catalog, capabilityIds, errors);
}

export function validateQualificationSemantics(catalog, errors) {
  validateQualificationFramework(catalog, errors);
  validateProfiles(catalog, errors);
  validateDeploymentCapabilities(catalog, errors);
}

export async function validateQualificationReferences(catalog, repositoryRoot) {
  const errors = [];
  const decisions = await loadDecisionRegistry(repositoryRoot);
  const unresolvedStatuses = new Set(["deferred", "open", "proposed"]);
  const evidenceStatuses = new Set(["accepted", "active", "resolved"]);
  for (const item of [
    catalog.qualificationFramework,
    ...(catalog.profiles ?? []),
    ...(catalog.capabilities ?? []),
  ]) {
    for (const blocker of item.blockedBy ?? []) {
      const decision = decisions.get(blocker);
      if (!decision) {
        errors.push(`REL-PROFILE-011 ${item.id}: unknown blocker ${blocker}`);
      } else if (!unresolvedStatuses.has(decision.status)) {
        errors.push(
          `REL-PROFILE-012 ${item.id}: blocker ${blocker} has nonblocking status ${decision.status}`,
        );
      }
    }
    for (const reference of item.qualificationEvidence?.decisionRefs ?? []) {
      const decision = decisions.get(reference);
      if (!decision) {
        errors.push(
          `REL-PROFILE-013 ${item.id}: unknown qualification decision ${reference}`,
        );
      } else if (!evidenceStatuses.has(decision.status)) {
        errors.push(
          `REL-PROFILE-014 ${item.id}: qualification decision ${reference} has inadmissible status ${decision.status}`,
        );
      }
    }
    for (const reference of item.qualificationEvidence?.conformanceRefs ?? []) {
      const absolute = path.resolve(repositoryRoot, reference);
      const evidenceRoot = path.join(
        repositoryRoot,
        "architecture/qualification-evidence",
      );
      if (!absolute.startsWith(`${evidenceRoot}${path.sep}`)) {
        errors.push(
          `REL-PROFILE-015 ${item.id}: conformance evidence escapes the qualification directory`,
        );
        continue;
      }
      try {
        await readFile(absolute, "utf8");
      } catch {
        errors.push(
          `REL-PROFILE-016 ${item.id}: missing conformance evidence ${reference}`,
        );
      }
    }
  }
  return errors;
}
