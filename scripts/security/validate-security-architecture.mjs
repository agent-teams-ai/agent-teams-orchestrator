import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function findSecurityManifests(repositoryRoot) {
  const manifests = [];

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entry of entries.toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.name === "security.manifest.json") {
        manifests.push(entryPath);
      }
    }
  }

  for (const root of ["apps", "packages", "tooling"]) {
    await walk(path.join(repositoryRoot, root));
  }
  return manifests;
}

function sorted(values) {
  return [...new Set(values)].toSorted();
}

function schemaErrors(validate) {
  return (validate.errors ?? []).map(
    (error) =>
      `SEC-SCHEMA-001 ${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
  );
}

export function validateClassificationSemantics(manifest) {
  const errors = [];
  const ids = new Set();

  for (const asset of manifest.assets ?? []) {
    if (ids.has(asset.id)) {
      errors.push(`SEC-DATA-001 ${asset.id}: duplicate asset id`);
    }
    ids.add(asset.id);

    if (
      asset.exportPolicy === "unrestricted" &&
      (asset.classification !== "public" ||
        asset.containsUserContent ||
        asset.containsAuthorityEvidence)
    ) {
      errors.push(
        `SEC-DATA-002 ${asset.id}: unrestricted export requires public data without user content or authority evidence`,
      );
    }

    if (
      asset.containsUserContent &&
      ["none", "authority-evidence"].includes(asset.redactionProfile)
    ) {
      errors.push(
        `SEC-DATA-003 ${asset.id}: user content requires an applicable redaction profile`,
      );
    }

    if (
      asset.containsAuthorityEvidence !==
      (asset.classification === "authority-evidence")
    ) {
      errors.push(
        `SEC-DATA-004 ${asset.id}: authority-evidence classification and flag must agree`,
      );
    }

    if (
      asset.classification === "authority-evidence" &&
      (!["restricted", "prohibited"].includes(asset.exportPolicy) ||
        !["authority-evidence", "metadata-only"].includes(
          asset.redactionProfile,
        ))
    ) {
      errors.push(
        `SEC-DATA-005 ${asset.id}: authority evidence requires restricted export and dedicated redaction`,
      );
    }

    if (
      asset.classification === "secret" &&
      (asset.surface !== "blob" ||
        asset.exportPolicy !== "prohibited" ||
        !["secret", "metadata-only"].includes(asset.redactionProfile))
    ) {
      errors.push(
        `SEC-DATA-006 ${asset.id}: raw secret material is confined to non-exportable secret-adapter blobs`,
      );
    }

    if (
      ["sensitive", "secret", "authority-evidence"].includes(
        asset.classification,
      ) &&
      asset.redactionProfile === "none"
    ) {
      errors.push(
        `SEC-DATA-007 ${asset.id}: protected data cannot use the no-redaction profile`,
      );
    }
  }

  return errors;
}

function evaluateCrossTenantSubstitution(input) {
  const ruleIds = [];
  if (
    input.resourceTenantId !== input.authenticatedTenantId &&
    (input.operationKind !== "cross-tenant-administration" ||
      input.authenticatedAuthorityScope !== "cross-tenant-administrator")
  ) {
    ruleIds.push("SEC-TENANT-001");
  }
  if (input.payloadTenantId !== input.resourceTenantId) {
    ruleIds.push("SEC-TENANT-002");
  }
  return ruleIds;
}

function evaluateMaliciousWorkspaceConfig(input) {
  const ruleIds = [];
  if (input.requestsEndpointOverride) {
    ruleIds.push("SEC-WORKSPACE-001");
  }
  if (input.requestsExecutableOverride) {
    ruleIds.push("SEC-WORKSPACE-002");
  }
  if (!input.workspaceTrusted && !input.validatedByWorkspacePolicy) {
    ruleIds.push("SEC-WORKSPACE-003");
  }
  return ruleIds;
}

function evaluatePromptAuthorityConfusion(input) {
  const ruleIds = [];
  const executesControlCommand = input.action === "execute-control-command";
  if (executesControlCommand && input.sourceChannel !== "control-api") {
    ruleIds.push("SEC-AUTHORITY-001");
  }
  if (
    executesControlCommand &&
    (!input.typedCommandEnvelope || !input.authenticatedAuthority)
  ) {
    ruleIds.push("SEC-AUTHORITY-002");
  }
  return ruleIds;
}

function evaluateSsrfEgressPolicy(input) {
  const ruleIds = [];
  if (!input.usesControlledEgress) {
    ruleIds.push("SEC-EGRESS-001");
  }
  if (!["http", "https"].includes(input.scheme)) {
    ruleIds.push("SEC-EGRESS-002");
  }
  if (
    ["loopback", "link-local", "metadata-service"].includes(
      input.destinationClass,
    )
  ) {
    ruleIds.push("SEC-EGRESS-003");
  }
  if (!input.policyAllowsDestination || !input.resolvedAddressesPinned) {
    ruleIds.push("SEC-EGRESS-004");
  }
  return ruleIds;
}

function evaluateReplayStaleAuthority(input) {
  const ruleIds = [];
  if (!input.idempotencyKey) {
    ruleIds.push("SEC-REPLAY-001");
  }
  if (input.expectedRevision !== input.currentRevision) {
    ruleIds.push("SEC-REPLAY-002");
  }
  if (Date.parse(input.authorityValidUntil) <= Date.parse(input.now)) {
    ruleIds.push("SEC-REPLAY-003");
  }
  if (input.expectedScopeHash !== input.authorityScopeHash) {
    ruleIds.push("SEC-REPLAY-004");
  }
  return ruleIds;
}

function evaluateCredentialLeakage(input) {
  const ruleIds = [];
  const containsRawSecret = input.valueKind === "raw-secret";
  if (containsRawSecret && input.location !== "secret-adapter") {
    ruleIds.push("SEC-SECRET-001");
  }
  if (
    containsRawSecret &&
    ["integration-event", "log", "public-contract", "telemetry"].includes(
      input.location,
    )
  ) {
    ruleIds.push("SEC-SECRET-002");
  }
  return ruleIds;
}

function evaluateUnredactedOutput(input) {
  const ruleIds = [];
  if (input.classification === "secret") {
    ruleIds.push("SEC-REDACTION-001");
  }
  if (
    input.containsAuthorityEvidence &&
    !["authority-evidence", "metadata-only"].includes(input.redactionProfile)
  ) {
    ruleIds.push("SEC-REDACTION-002");
  }
  if (
    input.containsUserContent &&
    ["none", "authority-evidence"].includes(input.redactionProfile)
  ) {
    ruleIds.push("SEC-REDACTION-003");
  }
  return ruleIds;
}

const threatEvaluators = new Map([
  ["credential-leakage", evaluateCredentialLeakage],
  ["cross-tenant-substitution", evaluateCrossTenantSubstitution],
  ["malicious-workspace-config", evaluateMaliciousWorkspaceConfig],
  ["prompt-authority-confusion", evaluatePromptAuthorityConfusion],
  ["replay-stale-authority", evaluateReplayStaleAuthority],
  ["ssrf-egress-policy", evaluateSsrfEgressPolicy],
  ["unredacted-output", evaluateUnredactedOutput],
]);

export function evaluateThreatScenario({ input, threat }) {
  const evaluate = threatEvaluators.get(threat);
  if (!evaluate) {
    throw new Error(`unsupported threat scenario ${String(threat)}`);
  }

  const normalizedRuleIds = sorted(evaluate(input));
  return {
    decision: normalizedRuleIds.length === 0 ? "allow" : "deny",
    ruleIds: normalizedRuleIds,
  };
}

function validateThreatCoverage(allowedThreats, deniedThreats) {
  const errors = [];
  const requiredThreats = threatEvaluators.keys();
  for (const threat of requiredThreats) {
    const hasAllowed = allowedThreats.some(
      (scenario) => scenario.threat === threat,
    );
    const hasDenied = deniedThreats.some(
      (scenario) => scenario.threat === threat,
    );
    if (!hasAllowed || !hasDenied) {
      errors.push(
        `SEC-FIXTURE-005 ${threat} requires both allow and deny fixtures`,
      );
    }
  }
  return errors;
}

export async function validateSecurityFoundation(repositoryRoot) {
  const securityRoot = path.join(repositoryRoot, "architecture/security");
  const fixturesRoot = path.join(
    repositoryRoot,
    "scripts/security/fixtures",
  );
  const [
    classificationSchema,
    threatSchema,
    validManifest,
    invalidManifestFixture,
    allowedThreats,
    deniedThreats,
    owners,
  ] = await Promise.all([
    readJson(path.join(securityRoot, "data-classification.schema.json")),
    readJson(path.join(securityRoot, "threat-scenario.schema.json")),
    readJson(path.join(fixturesRoot, "data-classification.valid.json")),
    readJson(path.join(fixturesRoot, "data-classification.invalid.json")),
    readJson(path.join(fixturesRoot, "threats.allowed.json")),
    readJson(path.join(fixturesRoot, "threats.denied.json")),
    readFile(path.join(repositoryRoot, "docs/owners.yaml"), "utf8").then(
      YAML.parse,
    ),
  ]);

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);
  const validateClassification = ajv.compile(classificationSchema);
  const validateThreat = ajv.compile(threatSchema);
  const errors = [];

  if (!validateClassification(validManifest)) {
    errors.push(...schemaErrors(validateClassification));
  } else {
    errors.push(...validateClassificationSemantics(validManifest));
  }

  const materializedManifestPaths =
    await findSecurityManifests(repositoryRoot);
  const materializedAssetIds = new Map();
  let materializedAssets = 0;
  for (const manifestPath of materializedManifestPaths) {
    const repositoryPath = path
      .relative(repositoryRoot, manifestPath)
      .split(path.sep)
      .join("/");
    const manifest = await readJson(manifestPath);

    if (!validateClassification(manifest)) {
      errors.push(
        ...schemaErrors(validateClassification).map(
          (error) => `${repositoryPath}: ${error}`,
        ),
      );
      continue;
    }
    if (!owners.owners?.[manifest.owner]) {
      errors.push(
        `SEC-MANIFEST-001 ${repositoryPath}: owner ${manifest.owner} is not registered in docs/owners.yaml`,
      );
    }
    errors.push(
      ...validateClassificationSemantics(manifest).map(
        (error) => `${repositoryPath}: ${error}`,
      ),
    );

    for (const asset of manifest.assets) {
      materializedAssets += 1;
      const previousPath = materializedAssetIds.get(asset.id);
      if (previousPath) {
        errors.push(
          `SEC-MANIFEST-002 ${repositoryPath}: asset ${asset.id} is already declared by ${previousPath}`,
        );
      } else {
        materializedAssetIds.set(asset.id, repositoryPath);
      }
    }
  }

  const invalidManifest = invalidManifestFixture.manifest;
  if (!validateClassification(invalidManifest)) {
    errors.push(
      "SEC-FIXTURE-001 invalid classification fixture must pass schema validation before semantic rejection",
    );
  } else {
    const actualRuleIds = sorted(
      validateClassificationSemantics(invalidManifest).map((error) =>
        error.slice(0, error.indexOf(" ")),
      ),
    );
    const expectedRuleIds = sorted(invalidManifestFixture.expectedRuleIds);
    if (JSON.stringify(actualRuleIds) !== JSON.stringify(expectedRuleIds)) {
      errors.push(
        `SEC-FIXTURE-002 invalid classification fixture expected ${expectedRuleIds.join(", ")} but received ${actualRuleIds.join(", ")}`,
      );
    }
  }

  const scenarios = [...allowedThreats, ...deniedThreats];
  const scenarioIds = new Set();
  for (const scenario of scenarios) {
    if (scenarioIds.has(scenario.id)) {
      errors.push(`SEC-FIXTURE-003 duplicate threat scenario ${scenario.id}`);
      continue;
    }
    scenarioIds.add(scenario.id);

    if (!validateThreat(scenario)) {
      errors.push(
        ...schemaErrors(validateThreat).map(
          (error) => `${scenario.id}: ${error}`,
        ),
      );
      continue;
    }

    const actual = evaluateThreatScenario(scenario);
    const expected = {
      decision: scenario.expected.decision,
      ruleIds: sorted(scenario.expected.ruleIds),
    };
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(
        `SEC-FIXTURE-004 ${scenario.id} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`,
      );
    }
  }

  errors.push(...validateThreatCoverage(allowedThreats, deniedThreats));

  return {
    errors,
    fixtureAssets: validManifest.assets.length,
    materializedAssets,
    materializedManifests: materializedManifestPaths.length,
    threatScenarios: scenarios.length,
  };
}

async function main() {
  let repositoryRoot;
  try {
    repositoryRoot = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  try {
    const result = await validateSecurityFoundation(repositoryRoot);
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(error);
      }
      process.exitCode = 1;
      return;
    }
    console.log(
      `Security architecture conformance passed (${String(result.materializedManifests)} materialized manifests, ${String(result.materializedAssets)} materialized assets, ${String(result.fixtureAssets)} fixture assets, ${String(result.threatScenarios)} threat scenarios)`,
    );
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
