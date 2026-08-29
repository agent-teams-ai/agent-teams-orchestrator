import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const PROFILE_PATH = "architecture/feature-module-standard-profile.json";
export const PROFILE_DOCUMENT_PATH = "docs/architecture/feature-module-standard.md";
export const AGENT_INSTRUCTIONS_PATH = "AGENTS.md";

const EXPECTED_STANDARD = Object.freeze({
  id: "agent-teams.feature-module-standard",
  version: "v1",
  repository: "agent-teams-ai/.github",
  path: "docs/architecture/feature-module-standard/v1.md",
  git_blob_sha: "d0bfff2033faf544fe65268c1dcdfd524d093015",
  sha256: "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa",
});

const EXPECTED_EXTENSIONS = Object.freeze([
  { id: "workspace-package-topology", authority: "architecture/package-catalog.yaml" },
  { id: "package-materialization", authority: "architecture/package-materialization-policy.yaml" },
  { id: "source-dependency-edges", authority: "architecture/source-dependency-policy.yaml" },
  { id: "typescript-dependency-direction", authority: "docs/architecture/dependency-rules.md" },
]);

const EXPECTED_ENFORCEMENT = Object.freeze([
  { command: "architecture:feature-module-profile", evidence: "profile-binding" },
  { command: "architecture:topology", evidence: "module-and-feature-topology" },
  { command: "architecture:dependencies", evidence: "dependency-specifiers" },
  { command: "architecture:conformance", evidence: "boundary-conformance" },
]);

const REQUIRED_LOCAL_EQUIVALENCE_MARKERS = Object.freeze([
  "`tests/unit/` tree is prohibited",
  "Neither schema is generated from the other.",
  "integration-event JSON Schema MUST have an event manifest",
  "Every dynamic dependency declares exactly one",
  "`application/process-managers/`",
  "`packages/integrations/**`",
  "Context-owned repository adapters",
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function exactKeys(value, expected, label) {
  assert(value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`);
  assert(
    JSON.stringify(Object.keys(value).toSorted()) === JSON.stringify([...expected].toSorted()),
    `${label} must contain exactly: ${expected.join(", ")}.`,
  );
}

function equalJson(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} does not match.`);
}

export function validateFeatureModuleStandardProfile({
  profile,
  document,
  agentInstructions,
  packageJson,
}) {
  exactKeys(profile, ["schema_version", "standard", "adoption"], "profile");
  assert(profile.schema_version === 1, "Profile schema_version must be 1.");
  exactKeys(profile.standard, Object.keys(EXPECTED_STANDARD), "standard binding");
  equalJson(profile.standard, EXPECTED_STANDARD, "Standard binding");

  const adoption = profile.adoption;
  exactKeys(adoption, [
    "status", "owner", "profile_document", "decision", "scope",
    "extensions", "deviations", "enforcement",
  ], "adoption");
  assert(adoption.status === "adopted", "Adoption status must be adopted.");
  assert(adoption.owner === "architecture", "Adoption owner must be architecture.");
  assert(adoption.profile_document === "architecture.feature-module-standard",
    "Adoption must reference the local profile document ID.");
  assert(adoption.decision === "ADR-0098", "Adoption must reference ADR-0098.");

  exactKeys(adoption.scope, [
    "production_roots", "module_roots", "application_roots", "excluded_roots",
  ], "scope");
  equalJson(adoption.scope.production_roots, ["apps", "packages"], "Production roots");
  equalJson(adoption.scope.module_roots, ["packages"], "Module roots");
  equalJson(adoption.scope.application_roots, ["apps"], "Application roots");
  equalJson(adoption.scope.excluded_roots, ["scripts", "tooling"], "Excluded roots");

  assert(Array.isArray(adoption.extensions) && adoption.extensions.length > 0,
    "Adoption extensions must be non-empty.");
  equalJson(adoption.extensions, EXPECTED_EXTENSIONS, "Adoption extensions");
  const extensionIds = new Set();
  for (const extension of adoption.extensions) {
    exactKeys(extension, ["id", "authority"], `extension ${extension?.id ?? "<unknown>"}`);
    assert(/^[a-z][a-z0-9-]+$/u.test(extension.id), `Invalid extension ID: ${extension.id}.`);
    assert(!extensionIds.has(extension.id), `Duplicate extension ID: ${extension.id}.`);
    extensionIds.add(extension.id);
    assert(typeof extension.authority === "string" && extension.authority.length > 0,
      `${extension.id} must name a repository authority.`);
  }

  assert(Array.isArray(adoption.deviations), "Adoption deviations must be an array.");
  for (const deviation of adoption.deviations) {
    exactKeys(deviation, [
      "clause", "scope", "rationale", "owner", "decision", "review_trigger",
    ],
      `deviation ${deviation?.clause ?? "<unknown>"}`);
    for (const key of [
      "clause", "scope", "rationale", "owner", "decision", "review_trigger",
    ]) {
      assert(typeof deviation[key] === "string" && deviation[key].length > 0,
        `Deviation ${key} must be non-empty.`);
    }
    assert(/^ADR-[0-9]{4}$/u.test(deviation.decision),
      "Deviation decision must reference an ADR ID.");
  }

  assert(Array.isArray(adoption.enforcement) && adoption.enforcement.length > 0,
    "Adoption enforcement must be non-empty.");
  equalJson(adoption.enforcement, EXPECTED_ENFORCEMENT, "Adoption enforcement");
  const commands = new Set();
  for (const gate of adoption.enforcement) {
    exactKeys(gate, ["command", "evidence"], `enforcement ${gate?.command ?? "<unknown>"}`);
    assert(typeof packageJson.scripts?.[gate.command] === "string",
      `Declared enforcement command is missing from package.json: ${gate.command}.`);
    assert(packageJson.scripts["architecture:check"].includes(gate.command),
      `architecture:check must include ${gate.command}.`);
    assert(!commands.has(gate.command), `Duplicate enforcement command: ${gate.command}.`);
    commands.add(gate.command);
    assert(/^[a-z][a-z0-9-]+$/u.test(gate.evidence),
      `Invalid enforcement evidence ID: ${gate.evidence}.`);
  }

  for (const command of [
    "architecture:feature-module-profile",
    "architecture:feature-module-profile:test",
  ]) {
    assert(packageJson.scripts["architecture:check"].includes(command),
      `architecture:check must include ${command}.`);
  }
  assert(packageJson.scripts["check:fast"].includes("architecture:feature-module-profile"),
    "check:fast must include architecture:feature-module-profile.");

  const canonicalUrl = `https://github.com/${EXPECTED_STANDARD.repository}/blob/main/${EXPECTED_STANDARD.path}`;
  for (const marker of [
    "id: architecture.feature-module-standard",
    "# Orchestrator Feature Module Profile",
    "## Adoption",
    "## Scope mapping",
    "## Local extensions",
    "## Enforcement",
    EXPECTED_STANDARD.id,
    EXPECTED_STANDARD.version,
    EXPECTED_STANDARD.sha256,
    canonicalUrl,
    "ADR-0098",
    ...REQUIRED_LOCAL_EQUIVALENCE_MARKERS,
  ]) {
    assert(document.includes(marker), `Profile document is missing required marker: ${marker}`);
  }

  for (const marker of [
    "docs/architecture/feature-module-standard.md",
    "organization Feature Module Standard v1",
  ]) {
    assert(agentInstructions.includes(marker),
      `Agent instructions are missing the local profile route: ${marker}`);
  }

  return adoption.extensions.map(({ authority }) => authority);
}

export async function checkFeatureModuleStandardProfile(repositoryRoot = process.cwd()) {
  const [profileSource, document, agentInstructions, packageSource] = await Promise.all([
    readFile(resolve(repositoryRoot, PROFILE_PATH), "utf8"),
    readFile(resolve(repositoryRoot, PROFILE_DOCUMENT_PATH), "utf8"),
    readFile(resolve(repositoryRoot, AGENT_INSTRUCTIONS_PATH), "utf8"),
    readFile(resolve(repositoryRoot, "package.json"), "utf8"),
  ]);
  const profile = JSON.parse(profileSource);
  const authorities = validateFeatureModuleStandardProfile({
    profile,
    document,
    agentInstructions,
    packageJson: JSON.parse(packageSource),
  });
  await Promise.all(authorities.map((authority) => access(resolve(repositoryRoot, authority))));
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkFeatureModuleStandardProfile();
  console.log("Orchestrator Feature Module Standard v1 profile is valid.");
}
