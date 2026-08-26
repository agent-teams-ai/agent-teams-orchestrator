import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { planScaffoldFromFile } from "@agent-teams/engineering-foundation/scaffolding";
import YAML from "yaml";

import { writeEmptyMaterializationPolicy } from "./topology-fixture-lib.mjs";
import {
  journalPath,
  operationBytes,
  operationSources,
  pathExists,
  writeJournal,
  writeOperationPostimage,
} from "./scaffolding-transaction-fixture.mjs";

const toolingRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(toolingRoot, "../..");
const wrapper = path.join(
  repositoryRoot,
  "scripts/architecture/scaffold-package.mjs",
);
const catalogSchema = path.join(repositoryRoot, "architecture/package-catalog.schema.json");
const dependencyPolicySchema = path.join(
  repositoryRoot,
  "architecture/source-dependency-policy.schema.json",
);
const materializationPolicySchema = path.join(repositoryRoot, "architecture/package-materialization-policy.schema.json");
const goldenRoot = path.join(
  toolingRoot,
  "fixtures/scaffolding/library-boundary-golden",
);
const temporaryRoots = [];

function output(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function runWrapper(root, arguments_) {
  return spawnSync(
    process.execPath,
    [wrapper, ...arguments_, "--root", root],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
}

function runPackageScript(root, arguments_) {
  const packageManagerEntrypoint = process.env.npm_execpath;
  const command = packageManagerEntrypoint
    ? process.execPath
    : process.platform === "win32"
      ? "pnpm.cmd"
      : "pnpm";
  const commandArguments = packageManagerEntrypoint
    ? [packageManagerEntrypoint, "architecture:scaffold-package"]
    : ["architecture:scaffold-package"];
  return spawnSync(
    command,
    [...commandArguments, "--", ...arguments_, "--root", root],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
}

function requireSuccess(label, result) {
  assert.equal(result.status, 0, `${label} failed:\n${output(result)}`);
  return result;
}

function requireFailure(label, result, expectedText) {
  assert.notEqual(result.status, 0, `${label} unexpectedly passed`);
  if (expectedText) {
    assert.match(output(result), expectedText, `${label} returned the wrong error`);
  }
  return result;
}

function parseJsonOutput(label, result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${label} did not emit JSON:\n${output(result)}`, {
      cause: error,
    });
  }
}

function requireFailureReceipt(label, result, expectedOutcome, expectedRuleId) {
  requireFailure(label, result);
  const receipt = parseJsonOutput(label, result);
  assert.equal(receipt.outcome, expectedOutcome, `${label} returned the wrong outcome`);
  assert.ok(
    receipt.diagnostics?.some(
      (diagnostic) => diagnostic.ruleId === expectedRuleId,
    ),
    `${label} did not report ${expectedRuleId}`,
  );
  return receipt;
}

function ownerType(entry) {
  return entry.role === "bounded-context" ? "bounded-context" : "architecture";
}

function ownerPath(ownerDocument) {
  return `docs/owners/${ownerDocument.replaceAll(".", "-")}.md`;
}

async function createFixture(entries) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-scaffolding-qualification-"),
  );
  temporaryRoots.push(root);
  const architectureRoot = path.join(root, "architecture");
  await Promise.all([
    mkdir(path.join(architectureRoot, "foundation"), { recursive: true }),
    mkdir(path.join(root, "docs/owners"), { recursive: true }),
  ]);
  await Promise.all([
    copyFile(
      catalogSchema,
      path.join(architectureRoot, "package-catalog.schema.json"),
    ),
    copyFile(
      dependencyPolicySchema,
      path.join(architectureRoot, "source-dependency-policy.schema.json"),
    ),
    writeEmptyMaterializationPolicy(root, materializationPolicySchema),
    copyFile(
      path.join(repositoryRoot, "architecture/foundation/scaffolding.yaml"),
      path.join(architectureRoot, "foundation/scaffolding.yaml"),
    ),
  ]);
  await writeFile(
    path.join(architectureRoot, "package-catalog.yaml"),
    YAML.stringify({
      version: 1,
      packages: entries.map(({ ownerStatus: _ownerStatus, ...entry }) => entry),
    }),
  );
  await writeFile(
    path.join(architectureRoot, "source-dependency-policy.yaml"),
    YAML.stringify({ version: 1, default: "deny", edges: [], feature_edges: [] }),
  );
  await writeFile(
    path.join(root, "tsconfig.json"),
    `${JSON.stringify(
      { compilerOptions: { noEmit: true }, files: [], references: [] },
      null,
      2,
    )}\n`,
  );
  for (const entry of entries) {
    await writeFile(
      path.join(root, ownerPath(entry.owner_document)),
      `---\nid: ${entry.owner_document}\ntype: ${ownerType(entry)}\nstatus: ${entry.ownerStatus ?? "accepted"}\nowner: architecture/testing\nsummary: Owns deterministic scaffolding qualification for ${entry.id}.\n---\n\n# ${entry.id}\n`,
    );
  }
  return root;
}

function planPath(id) {
  return `.agent-teams-local/scaffolding-plans/${id}.json`;
}

function planTarget(root, id) {
  const result = requireSuccess(
    `plan ${id}`,
    runWrapper(root, [
      "plan",
      "--id",
      id,
      "--plan",
      planPath(id),
      "--json",
    ]),
  );
  return parseJsonOutput(`plan ${id}`, result).plan;
}

function applyPlan(root, id) {
  const result = runWrapper(root, [
    "apply",
    "--plan",
    planPath(id),
    "--json",
  ]);
  return { result, receipt: parseJsonOutput(`apply ${id}`, result) };
}

async function addAcceptedFeature(root, entry) {
  const featureRoot = path.join(entry.path, "src/features/reference");
  await mkdir(path.join(root, featureRoot), { recursive: true });
  await writeFile(
    path.join(root, featureRoot, "index.ts"),
    "export const qualificationReference = true;\n",
  );
  await writeFile(
    path.join(root, featureRoot, "README.md"),
    `---\nid: feature.qualification.reference\ntype: feature\nstatus: accepted\nowner: architecture/testing\nsummary: Owns a real source slice for scaffolding qualification replay checks.\nrelated:\n  - ${entry.owner_document}\n---\n\n# Reference\n`,
  );
  await writeFile(
    path.join(root, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: { noEmit: true },
        files: [],
        references: [{ path: `./${entry.path}` }],
      },
      null,
      2,
    )}\n`,
  );
}

async function verifyQualificationRecord() {
  const schema = JSON.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "architecture/foundation/scaffolding-qualification.schema.json",
      ),
      "utf8",
    ),
  );
  const record = YAML.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "architecture/foundation/scaffolding-qualification.yaml",
      ),
      "utf8",
    ),
  );
  const config = YAML.parse(
    await readFile(
      path.join(repositoryRoot, "architecture/foundation/scaffolding.yaml"),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(record), true, JSON.stringify(validate.errors, null, 2));
  const versionCases = [
    ["0.16.0-rc.0+consumer.1", true], ["0.16.0+consumer.1", true],
    ["0.16", false], ["01.16.0", false], ["0.16.0-01", false],
    ["0.16.0-", false], ["0.16.0+", false], ["0.16.0_rc.0", false],
  ];
  for (const [foundationVersion, expected] of versionCases) {
    assert.equal(validate({ ...record, foundationVersion }), expected,
      `${foundationVersion} has an unexpected SemVer result`);
  }
  const manifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  assert.equal(
    record.foundationVersion,
    manifest.devDependencies["@agent-teams/engineering-foundation"],
  );
  const composition = config.compositions.find(
    (candidate) => candidate.id === record.composition.id,
  );
  assert.ok(composition, "qualified Composition is missing from canonical config");
  assert.equal(record.consumer, config.projectId);
  assert.equal(record.composition.targetCatalogPath, config.targetCatalogPath);
  assert.equal(record.recipe.id, composition.recipe.ref.id);
  assert.equal(
    record.recipe.contractVersion,
    composition.recipe.ref.contractVersion,
  );
  requireSuccess(
    "ignored local scaffolding state",
    spawnSync(
      "git",
      ["check-ignore", "-q", ".agent-teams-local/scaffolding-transaction.json"],
      { cwd: repositoryRoot, encoding: "utf8" },
    ),
  );
  const trackedLocalState = requireSuccess(
    "tracked local scaffolding state query",
    spawnSync("git", ["ls-files", "--", ".agent-teams-local"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
  );
  assert.equal(
    trackedLocalState.stdout.trim(),
    "",
    ".agent-teams-local must never contain tracked files",
  );
}

async function verifyDonorAndVariants() {
  const qualification = YAML.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "architecture/foundation/scaffolding-qualification.yaml",
      ),
      "utf8",
    ),
  );
  const canonicalCatalog = YAML.parse(
    await readFile(
      path.join(repositoryRoot, "architecture/package-catalog.yaml"),
      "utf8",
    ),
  );
  const donor = canonicalCatalog.packages.find(
    (candidate) => candidate.id === qualification.donorTarget,
  );
  assert.ok(donor, "qualified donor target is missing from the package catalog");
  const entries = [
    donor,
    {
      id: "context.synthetic-work",
      role: "bounded-context",
      path: "packages/contexts/synthetic-work",
      package_name: "@agent-teams/synthetic-work",
      owner_document: "domain.contexts.synthetic-work",
    },
    {
      id: "sdk.synthetic-client",
      role: "sdk",
      path: "packages/sdk/synthetic-client",
      package_name: "@agent-teams/synthetic-client",
      owner_document: "architecture.synthetic-client",
    },
    {
      id: "testing.synthetic-conformance",
      role: "testing",
      path: "packages/testing/synthetic-conformance",
      package_name: "@agent-teams/synthetic-conformance",
      owner_document: "architecture.synthetic-conformance",
    },
    {
      id: "app.synthetic",
      role: "app",
      path: "apps/synthetic",
      package_name: "@agent-teams/app-synthetic",
      owner_document: "architecture.synthetic-app",
    },
  ];
  const root = await createFixture(entries);
  const donorPlanResult = requireSuccess(
    "donor plan through package script",
    runPackageScript(root, [
      "plan",
      "--id",
      donor.id,
      "--plan",
      planPath(donor.id),
      "--json",
    ]),
  );
  const donorPlan = parseJsonOutput(
    "donor plan through package script",
    donorPlanResult,
  ).plan;
  const donorBytes = operationBytes(donorPlan);
  for (const relativePath of ["package.json", "src/index.ts", "tsconfig.json"]) {
    const expected = await readFile(path.join(goldenRoot, relativePath));
    assert.deepEqual(
      donorBytes.get(`${donor.path}/${relativePath}`),
      expected,
      `${relativePath} drifted from the qualified donor bytes`,
    );
  }

  for (const entry of entries.filter((candidate) =>
    ["bounded-context", "sdk", "testing"].includes(candidate.role),
  )) {
    const plan = planTarget(root, entry.id);
    assert.equal(plan.operations.length, 3);
    const manifest = JSON.parse(
      operationSources(plan).get(`${entry.path}/package.json`),
    );
    assert.equal(manifest.name, entry.package_name);
    assert.equal(manifest.agentTeamsArchitecture.role, entry.role);
    assert.equal(
      manifest.agentTeamsArchitecture.ownerDocument,
      entry.owner_document,
    );
  }

  requireFailure(
    "application target through library composition",
    runWrapper(root, [
      "plan",
      "--id",
      "app.synthetic",
      "--plan",
      planPath("app.synthetic"),
    ]),
    /is not admitted by composition/u,
  );
  requireFailure(
    "Plan output inside target",
    runWrapper(root, [
      "plan",
      "--id",
      donor.id,
      "--plan",
      `${donor.path}/plan.json`,
    ]),
    /directly under/u,
  );

  const danglingEntry = {
    id: "platform.dangling-target",
    role: "platform",
    path: "packages/platform/dangling-target",
    package_name: "@agent-teams/dangling-target",
    owner_document: "architecture.dangling-target",
  };
  const danglingRoot = await createFixture([danglingEntry]);
  await mkdir(path.join(danglingRoot, "packages/platform"), { recursive: true });
  await symlink(
    path.join(danglingRoot, "missing-target"),
    path.join(danglingRoot, danglingEntry.path),
    process.platform === "win32" ? "junction" : "dir",
  );
  requireFailure(
    "dangling target planning",
    runWrapper(danglingRoot, [
      "plan",
      "--id",
      danglingEntry.id,
      "--plan",
      planPath(danglingEntry.id),
    ]),
    /target already exists/u,
  );

  const firstApplyResult = requireSuccess(
    "first donor apply through package script",
    runPackageScript(root, [
      "apply",
      "--plan",
      planPath(donor.id),
      "--json",
    ]),
  );
  assert.equal(
    parseJsonOutput(
      "first donor apply through package script",
      firstApplyResult,
    ).outcome,
    "applied",
  );
  const replay = applyPlan(root, donor.id);
  requireSuccess("donor replay", replay.result);
  assert.equal(replay.receipt.outcome, "already-applied");

  await addAcceptedFeature(root, donor);
  requireFailure(
    "existing target planning",
    runWrapper(root, [
      "plan",
      "--id",
      donor.id,
      "--plan",
      ".agent-teams-local/scaffolding-plans/replanned.json",
    ]),
    /target already exists/u,
  );
}

async function verifyStaleAuthority() {
  for (const authority of ["owner", "catalog", "config"]) {
    const entry = {
      id: `platform.stale-${authority}`,
      role: "platform",
      path: `packages/platform/stale-${authority}`,
      package_name: `@agent-teams/stale-${authority}`,
      owner_document: `architecture.stale-${authority}`,
    };
    const root = await createFixture([entry]);
    planTarget(root, entry.id);
    const sourcePath =
      authority === "owner"
        ? ownerPath(entry.owner_document)
        : authority === "catalog"
          ? "architecture/package-catalog.yaml"
          : "architecture/foundation/scaffolding.yaml";
    const absolute = path.join(root, sourcePath);
    await writeFile(
      absolute,
      `${await readFile(absolute, "utf8")}# authority changed\n`,
    );
    const applied = applyPlan(root, entry.id);
    requireFailure(`stale ${authority}`, applied.result);
    assert.equal(applied.receipt.outcome, "authority-stale");
    assert.equal(await pathExists(path.join(root, entry.path)), false);
  }
}

async function verifyRecoveryWithoutTopologyGate() {
  const entry = {
    id: "platform.recovery-probe",
    role: "platform",
    path: "packages/platform/recovery-probe",
    package_name: "@agent-teams/recovery-probe",
    owner_document: "architecture.recovery-probe",
  };
  const root = await createFixture([entry]);
  const plan = planTarget(root, entry.id);
  await writeJournal(root, plan);
  await mkdir(path.join(root, "packages/shared"), { recursive: true });
  await writeFile(
    path.join(root, "packages/shared/rogue.ts"),
    "export const invalidTopology = true;\n",
  );

  const recovered = requireSuccess(
    "journal recovery with unrelated invalid topology",
    runWrapper(root, ["recover", "--json"]),
  );
  const receipt = parseJsonOutput("journal recovery", recovered);
  assert.equal(receipt.outcome, "failed-recovered");
  for (const operation of plan.operations) {
    assert.equal(await pathExists(path.join(root, operation.path)), true);
  }
  const empty = requireSuccess(
    "recovery after journal finalization",
    runWrapper(root, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("empty recovery", empty).outcome,
    "no-pending-transaction",
  );

  const partialEntry = {
    id: "platform.partial-recovery",
    role: "platform",
    path: "packages/platform/partial-recovery",
    package_name: "@agent-teams/partial-recovery",
    owner_document: "architecture.partial-recovery",
  };
  const partialRoot = await createFixture([partialEntry]);
  const partialPlan = planTarget(partialRoot, partialEntry.id);
  await writeOperationPostimage(partialRoot, partialPlan.operations[0]);
  await writeJournal(partialRoot, partialPlan, (_operation, index) =>
    index === 0 ? "published" : index === 1 ? "publishing" : "pending",
  );
  const partialRecovery = requireSuccess(
    "partial publication recovery",
    runWrapper(partialRoot, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("partial publication recovery", partialRecovery).outcome,
    "failed-recovered",
  );
  for (const operation of partialPlan.operations) {
    assert.equal(await pathExists(path.join(partialRoot, operation.path)), true);
  }

  const conflictEntry = {
    id: "platform.recovery-conflict",
    role: "platform",
    path: "packages/platform/recovery-conflict",
    package_name: "@agent-teams/recovery-conflict",
    owner_document: "architecture.recovery-conflict",
  };
  const conflictRoot = await createFixture([conflictEntry]);
  const conflictPlan = planTarget(conflictRoot, conflictEntry.id);
  await writeJournal(conflictRoot, conflictPlan);
  await writeOperationPostimage(
    conflictRoot,
    conflictPlan.operations[0],
    "conflicting third-party bytes\n",
  );
  const conflictRecovery = requireFailure(
    "recovery with conflicting output",
    runWrapper(conflictRoot, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("conflicting recovery", conflictRecovery).outcome,
    "recovery-required",
  );
  assert.equal(await pathExists(journalPath(conflictRoot)), true);

  const staleEntry = {
    id: "platform.stale-recovery",
    role: "platform",
    path: "packages/platform/stale-recovery",
    package_name: "@agent-teams/stale-recovery",
    owner_document: "architecture.stale-recovery",
  };
  const staleRoot = await createFixture([staleEntry]);
  const stalePlan = planTarget(staleRoot, staleEntry.id);
  await writeOperationPostimage(staleRoot, stalePlan.operations[0]);
  await writeJournal(staleRoot, stalePlan, (_operation, index) =>
    index === 0 ? "published" : "pending",
  );
  const staleOwner = path.join(staleRoot, ownerPath(staleEntry.owner_document));
  await writeFile(
    staleOwner,
    `${await readFile(staleOwner, "utf8")}# changed after publication\n`,
  );
  const staleRecovery = requireFailure(
    "stale authority after partial publication",
    runWrapper(staleRoot, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("stale recovery", staleRecovery).outcome,
    "recovery-required",
  );
  assert.equal(await pathExists(journalPath(staleRoot)), true);
  assert.equal(
    await pathExists(path.join(staleRoot, stalePlan.operations[1].path)),
    false,
  );

  const pendingEntries = [
    {
      id: "platform.pending-a",
      role: "platform",
      path: "packages/platform/pending-a",
      package_name: "@agent-teams/pending-a",
      owner_document: "architecture.pending-a",
    },
    {
      id: "platform.pending-b",
      role: "platform",
      path: "packages/platform/pending-b",
      package_name: "@agent-teams/pending-b",
      owner_document: "architecture.pending-b",
    },
  ];
  const pendingRoot = await createFixture(pendingEntries);
  const pendingPlanA = planTarget(pendingRoot, pendingEntries[0].id);
  planTarget(pendingRoot, pendingEntries[1].id);
  await writeJournal(pendingRoot, pendingPlanA);
  requireFailure(
    "different Plan while recovery is pending",
    runWrapper(pendingRoot, [
      "apply",
      "--plan",
      planPath(pendingEntries[1].id),
      "--json",
    ]),
    /requires recovery/u,
  );
  assert.equal(
    await pathExists(path.join(pendingRoot, pendingEntries[1].path)),
    false,
  );

  const temporaryEntry = {
    id: "platform.journal-temporary",
    role: "platform",
    path: "packages/platform/journal-temporary",
    package_name: "@agent-teams/journal-temporary",
    owner_document: "architecture.journal-temporary",
  };
  const temporaryRoot = await createFixture([temporaryEntry]);
  planTarget(temporaryRoot, temporaryEntry.id);
  const journalTemporary = `${journalPath(temporaryRoot)}.tmp`;
  await writeFile(journalTemporary, "unresolved journal temporary\n");
  requireFailure(
    "unresolved journal temporary",
    runWrapper(temporaryRoot, ["recover", "--json"]),
    /temporary/u,
  );
  await rm(journalTemporary);
}

async function verifyTamperingAndFilesystemBoundaries() {
  const tamperEntry = {
    id: "platform.tamper-probe",
    role: "platform",
    path: "packages/platform/tamper-probe",
    package_name: "@agent-teams/tamper-probe",
    owner_document: "architecture.tamper-probe",
  };
  const tamperRoot = await createFixture([tamperEntry]);
  const plan = planTarget(tamperRoot, tamperEntry.id);
  plan.operations[0].after.contentBase64 = Buffer.from("tampered\n").toString(
    "base64",
  );
  const tamperedPath = ".agent-teams-local/scaffolding-plans/tampered.json";
  await writeFile(
    path.join(tamperRoot, tamperedPath),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  requireFailure(
    "tampered Plan",
    runWrapper(tamperRoot, ["apply", "--plan", tamperedPath, "--json"]),
    /digest|invalid/iu,
  );
  assert.equal(await pathExists(path.join(tamperRoot, tamperEntry.path)), false);

  const alternateConfigPath = "architecture/foundation/alternate.yaml";
  const alternateConfig = YAML.parse(
    await readFile(
      path.join(tamperRoot, "architecture/foundation/scaffolding.yaml"),
      "utf8",
    ),
  );
  alternateConfig.projectId = "alternate-scaffolding-authority";
  alternateConfig.compositions[0].id = "alternate-library-boundary";
  await writeFile(
    path.join(tamperRoot, alternateConfigPath),
    YAML.stringify(alternateConfig),
  );
  const alternateIntentPath = ".agent-teams-local/alternate-intent.json";
  await writeFile(
    path.join(tamperRoot, alternateIntentPath),
    `${JSON.stringify({
      schemaVersion: 1,
      compositionId: "alternate-library-boundary",
      targetRef: tamperEntry.id,
    })}\n`,
  );
  const alternatePlan = await planScaffoldFromFile({
    consumerRoot: tamperRoot,
    intentPath: alternateIntentPath,
    configPath: alternateConfigPath,
  });
  const alternatePlanPath =
    ".agent-teams-local/scaffolding-plans/alternate-authority.json";
  await writeFile(
    path.join(tamperRoot, alternatePlanPath),
    `${JSON.stringify(alternatePlan, null, 2)}\n`,
  );
  requireFailure(
    "valid Plan from alternate authority",
    runWrapper(tamperRoot, [
      "apply",
      "--plan",
      alternatePlanPath,
      "--json",
    ]),
    /canonical Orchestrator Composition/u,
  );
  assert.equal(await pathExists(path.join(tamperRoot, tamperEntry.path)), false);
  await writeJournal(tamperRoot, alternatePlan);
  requireFailure(
    "recovery journal from alternate authority",
    runWrapper(tamperRoot, ["recover", "--json"]),
    /canonical Orchestrator Composition/u,
  );
  assert.equal(await pathExists(path.join(tamperRoot, tamperEntry.path)), false);

  const caseEntry = {
    id: "platform.case-probe",
    role: "platform",
    path: "packages/platform/case-probe",
    package_name: "@agent-teams/case-probe",
    owner_document: "architecture.case-probe",
  };
  const caseRoot = await createFixture([caseEntry]);
  planTarget(caseRoot, caseEntry.id);
  await mkdir(path.join(caseRoot, "packages/Platform"), { recursive: true });
  requireFailureReceipt(
    "case-folding ancestor conflict",
    runWrapper(caseRoot, [
      "apply",
      "--plan",
      planPath(caseEntry.id),
      "--json",
    ]),
    "recovery-required",
    "scaffolding.apply.unverifiable-workspace",
  );
  assert.equal(await pathExists(path.join(caseRoot, caseEntry.path)), false);

  const symlinkEntry = {
    id: "platform.symlink-probe",
    role: "platform",
    path: "packages/platform/symlink-probe",
    package_name: "@agent-teams/symlink-probe",
    owner_document: "architecture.symlink-probe",
  };
  const symlinkRoot = await createFixture([symlinkEntry]);
  planTarget(symlinkRoot, symlinkEntry.id);
  const external = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-scaffolding-external-"),
  );
  temporaryRoots.push(external);
  await symlink(
    external,
    path.join(symlinkRoot, "packages"),
    process.platform === "win32" ? "junction" : "dir",
  );
  requireFailureReceipt(
    "symlinked output ancestor",
    runWrapper(symlinkRoot, [
      "apply",
      "--plan",
      planPath(symlinkEntry.id),
      "--json",
    ]),
    "recovery-required",
    "scaffolding.apply.unverifiable-workspace",
  );
  assert.equal(
    await pathExists(path.join(external, "platform/symlink-probe")),
    false,
  );
}

try {
  await verifyQualificationRecord();
  await verifyDonorAndVariants();
  await verifyStaleAuthority();
  await verifyRecoveryWithoutTopologyGate();
  await verifyTamperingAndFilesystemBoundaries();
  console.log("Package scaffolding qualification passed.");
} finally {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
}
