import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import {
  applyFilesystemScaffold,
  planScaffoldFromFile,
  readScaffoldPlanFile,
  recoverFilesystemScaffold,
} from "@agent-teams/engineering-foundation/scaffolding";

import {
  loadPackageCatalog,
  loadPackageMaterializationPolicy,
  relative,
} from "./package-catalog-lib.mjs";
import { validatePackageMaterializationPolicy } from "./package-materialization-validation.mjs";
import { loadPackageMaterializationInputs } from "./package-topology-inputs.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");
const validatorPath = path.join(
  scriptDirectory,
  "validate-package-topology.mjs",
);
const localStateDirectory = ".agent-teams-local";
const defaultCompositionId = "orchestrator-library-boundary";
const canonicalScaffoldingConfigPath =
  "architecture/foundation/scaffolding.yaml";
const scaffoldingJournalPath =
  `${localStateDirectory}/scaffolding-transaction.json`;
const maximumScaffoldingJournalBytes = 32 * 1024 * 1024;
const successfulOutcomes = new Set([
  "applied",
  "already-applied",
  "failed-recovered",
]);

function requiredValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseArguments(argv) {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const command = normalizedArgv[0];
  if (!new Set(["plan", "apply", "recover"]).has(command)) {
    throw new Error("expected one command: plan, apply, or recover");
  }

  const values = {
    command,
    id: undefined,
    json: false,
    planPath: undefined,
    repositoryRoot: defaultRepositoryRoot,
  };

  for (let index = 1; index < normalizedArgv.length; index += 1) {
    const argument = normalizedArgv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--id") {
      values.id = requiredValue(normalizedArgv, index, argument);
      index += 1;
    } else if (argument === "--json") {
      values.json = true;
    } else if (argument === "--plan") {
      values.planPath = requiredValue(normalizedArgv, index, argument);
      index += 1;
    } else if (argument === "--root") {
      values.repositoryRoot = path.resolve(
        requiredValue(normalizedArgv, index, argument),
      );
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  if (command === "plan" && !values.id) {
    throw new Error("plan requires --id <catalog-id>");
  }
  if (command === "apply" && !values.planPath) {
    throw new Error("apply requires --plan <repository-relative-path>");
  }
  if (command !== "plan" && values.id) {
    throw new Error(`--id is not valid for ${command}`);
  }
  if (command === "recover" && values.planPath) {
    throw new Error("--plan is not valid for recover");
  }

  return values;
}

function validateRepository(repositoryRoot) {
  const result = spawnSync(
    process.execPath,
    [validatorPath, "--root", repositoryRoot],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `package topology must be valid before planning:\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
}

async function validateMaterializationPolicy(repositoryRoot) {
  const errors = [];
  const { catalog, documents, materializationPolicy } =
    await loadPackageMaterializationInputs(repositoryRoot, errors);
  validatePackageMaterializationPolicy(
    materializationPolicy && Array.isArray(materializationPolicy.entries)
      ? materializationPolicy
      : { entries: [] },
    catalog && Array.isArray(catalog.packages) ? catalog.packages : [],
    documents,
    errors,
  );
  if (errors.length > 0) {
    throw new Error(
      `package materialization policy must be valid before apply:\n${[
        ...new Set(errors),
      ]
        .toSorted()
        .map((error) => `ERROR ${error}`)
        .join("\n")}`,
    );
  }
}

async function ensureLocalStateDirectory(repositoryRoot, child) {
  let current = repositoryRoot;
  for (const segment of [localStateDirectory, child]) {
    current = path.join(current, segment);
    try {
      await mkdir(current, { mode: 0o700 });
    } catch (error) {
      if (!(error instanceof Error) || error.code !== "EEXIST") {
        throw error;
      }
    }
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`${relative(repositoryRoot, current)} must be a real directory`);
    }
    const resolved = await realpath(current);
    const relation = path.relative(repositoryRoot, resolved);
    if (relation === ".." || relation.startsWith(`..${path.sep}`)) {
      throw new Error(`${relative(repositoryRoot, current)} escapes the repository`);
    }
  }
  return current;
}

function normalizePlanStoragePath(candidate) {
  const normalized = candidate.replaceAll("\\", "/");
  const directory = `${localStateDirectory}/scaffolding-plans`;
  if (
    candidate !== normalized ||
    path.posix.normalize(normalized) !== normalized ||
    path.posix.dirname(normalized) !== directory ||
    !/^[A-Za-z0-9._-]+\.json$/u.test(path.posix.basename(normalized))
  ) {
    throw new Error(`Plan output must be a JSON file directly under ${directory}`);
  }
  return normalized;
}

async function writeExclusive(pathname, source) {
  await mkdir(path.dirname(pathname), { recursive: true });
  try {
    await writeFile(pathname, source, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    return "created";
  } catch (error) {
    if (!(error instanceof Error) || error.code !== "EEXIST") {
      throw error;
    }
    if ((await readFile(pathname, "utf8")) !== source) {
      throw new Error(`${pathname}: existing Plan has different content`, {
        cause: error,
      });
    }
    return "existing";
  }
}

async function canonicalRepositoryRoot(repositoryRoot) {
  const metadata = await stat(repositoryRoot);
  if (!metadata.isDirectory()) {
    throw new Error(`${repositoryRoot}: repository root is not a directory`);
  }
  return realpath(repositoryRoot);
}

async function pathEntryExists(pathname) {
  try {
    await lstat(pathname);
    return true;
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function sameDefinitionRef(actual, expected) {
  return (
    actual?.id === expected?.id &&
    actual?.contractVersion === expected?.contractVersion
  );
}

function matchesCanonicalAuthority(config, plan) {
  return [
    plan.projectId === config.projectId,
    plan.authorityEvidence?.projectId === config.projectId,
    plan.authority?.configPath === canonicalScaffoldingConfigPath,
    plan.authority?.targetCatalogPath === config.targetCatalogPath,
  ].every(Boolean);
}

function matchesCanonicalComposition(composition, plan) {
  return [
    plan.composition?.id === composition.id,
    sameDefinitionRef(
      plan.composition?.scaffoldProfile,
      composition.scaffoldProfile?.ref,
    ),
    sameDefinitionRef(plan.composition?.recipe, composition.recipe?.ref),
    Array.isArray(plan.composition?.facets),
    plan.composition?.facets.length === 0,
    Array.isArray(plan.composition?.policies),
    plan.composition?.policies.length === 0,
  ].every(Boolean);
}

function matchesCanonicalTarget(composition, target, plan) {
  return [
    composition.targetRoles?.includes(plan.target.role),
    plan.target.path === target.path,
    plan.target.packageName === target.package_name,
    plan.target.ownerDocument?.id === target.owner_document,
  ].every(Boolean);
}

function materializationFor(policy, packageId) {
  return policy.entries?.find((entry) => entry.package_id === packageId);
}

async function assertCanonicalOrchestratorPlan(repositoryRoot, plan) {
  const config = YAML.parse(
    await readFile(
      path.join(repositoryRoot, canonicalScaffoldingConfigPath),
      "utf8",
    ),
  );
  const composition = config.compositions?.find(
    (candidate) => candidate.id === defaultCompositionId,
  );
  const [catalog, materializationPolicy] = await Promise.all([
    loadPackageCatalog(repositoryRoot),
    loadPackageMaterializationPolicy(repositoryRoot),
  ]);
  const target = catalog.packages?.find(
    (candidate) => candidate.id === plan.target?.id,
  );
  if (materializationFor(materializationPolicy, target?.id)?.state === "deferred") {
    throw new Error(`${target.id}: package materialization is deferred`);
  }
  if (
    !composition ||
    !target ||
    !matchesCanonicalAuthority(config, plan) ||
    !matchesCanonicalComposition(composition, plan) ||
    !matchesCanonicalTarget(composition, target, plan)
  ) {
    throw new Error(
      "Plan is not bound to the canonical Orchestrator Composition and package catalog",
    );
  }
}

async function planCommand(options) {
  const repositoryRoot = await canonicalRepositoryRoot(
    options.repositoryRoot,
  );
  const authorityErrors = [];
  const { catalog, materializationPolicy } =
    await loadPackageMaterializationInputs(repositoryRoot, authorityErrors);
  if (authorityErrors.length > 0) {
    throw new Error([...new Set(authorityErrors)].toSorted().join("\n"));
  }
  const entry = catalog.packages?.find(
    (candidate) => candidate.id === options.id,
  );
  if (!entry) {
    throw new Error(`${options.id}: package ID is not registered in the catalog`);
  }
  if (materializationFor(materializationPolicy, entry.id)?.state === "deferred") {
    throw new Error(`${options.id}: package materialization is deferred`);
  }
  if (await pathEntryExists(path.join(repositoryRoot, entry.path))) {
    throw new Error(`${entry.path}: target already exists`);
  }
  validateRepository(repositoryRoot);
  const intentDirectory = await ensureLocalStateDirectory(
    repositoryRoot,
    "scaffolding-intents",
  );
  const intentRelative = path.posix.join(
    localStateDirectory,
    "scaffolding-intents",
    `${randomUUID()}.json`,
  );
  const intentAbsolute = path.join(intentDirectory, path.basename(intentRelative));
  await writeFile(
    intentAbsolute,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        compositionId: defaultCompositionId,
        targetRef: options.id,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );

  let plan;
  try {
    plan = await planScaffoldFromFile({
      consumerRoot: repositoryRoot,
      intentPath: intentRelative,
    });
  } finally {
    await rm(intentAbsolute, { force: true });
  }

  await assertCanonicalOrchestratorPlan(repositoryRoot, plan);

  if (
    plan.target.id !== options.id ||
    (await pathEntryExists(path.join(repositoryRoot, plan.target.path)))
  ) {
    throw new Error(`${plan.target.path}: target already exists or identity changed`);
  }

  const digestSuffix = plan.planDigest.slice("sha256:".length, "sha256:".length + 16);
  const planRelative = normalizePlanStoragePath(
    options.planPath ??
      path.posix.join(
        localStateDirectory,
        "scaffolding-plans",
        `${options.id}.${digestSuffix}.json`,
      ),
  );
  const planDirectory = await ensureLocalStateDirectory(
    repositoryRoot,
    "scaffolding-plans",
  );
  const planAbsolute = path.join(planDirectory, path.basename(planRelative));
  const source = `${JSON.stringify(plan, null, 2)}\n`;
  const writeOutcome = await writeExclusive(planAbsolute, source);
  const normalizedPlanPath = relative(repositoryRoot, planAbsolute);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        { plan, planPath: normalizedPlanPath, writeOutcome },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(
    `Scaffold Plan: ${plan.planDigest}\nTarget: ${plan.target.id} -> ${plan.target.path}\nOperations: ${plan.operations.length}\nSaved: ${normalizedPlanPath} (${writeOutcome})\nReview the saved Plan, then run architecture:scaffold-package apply --plan ${normalizedPlanPath}.\n`,
  );
}

function renderReceipt(receipt, phase) {
  return `${phase} result for Scaffold Plan: ${receipt.planDigest}\nOutcome: ${receipt.outcome}\nOperations: ${receipt.operations.length}\n`;
}

async function applyCommand(options) {
  const repositoryRoot = await canonicalRepositoryRoot(
    options.repositoryRoot,
  );
  const pendingPlan = await readPendingCanonicalPlan(repositoryRoot);
  if (!pendingPlan) {
    await validateMaterializationPolicy(repositoryRoot);
  }
  const plan = await readScaffoldPlanFile(
    repositoryRoot,
    options.planPath,
  );
  await assertCanonicalOrchestratorPlan(repositoryRoot, plan);
  const receipt = await applyFilesystemScaffold(repositoryRoot, plan);
  process.stdout.write(
    options.json
      ? `${JSON.stringify(receipt, null, 2)}\n`
      : renderReceipt(receipt, "Apply"),
  );
  if (!successfulOutcomes.has(receipt.outcome)) {
    process.exitCode = 1;
  }
}

async function readPendingCanonicalPlan(repositoryRoot) {
  const pathname = path.join(repositoryRoot, scaffoldingJournalPath);
  let metadata;
  try {
    metadata = await lstat(pathname);
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.size > maximumScaffoldingJournalBytes
  ) {
    throw new Error("Pending scaffolding journal is not a bounded regular file");
  }

  let journal;
  try {
    journal = JSON.parse(await readFile(pathname, "utf8"));
  } catch (error) {
    throw new Error("Pending scaffolding journal is not valid JSON", {
      cause: error,
    });
  }
  if (!journal?.plan) {
    throw new Error("Pending scaffolding journal does not contain a Plan");
  }
  await assertCanonicalOrchestratorPlan(repositoryRoot, journal.plan);
  return journal.plan;
}

async function recoverCommand(options) {
  const repositoryRoot = await canonicalRepositoryRoot(
    options.repositoryRoot,
  );
  const pendingPlan = await readPendingCanonicalPlan(repositoryRoot);
  if (!pendingPlan) {
    await validateMaterializationPolicy(repositoryRoot);
  }
  const receipt = pendingPlan
    ? await applyFilesystemScaffold(repositoryRoot, pendingPlan)
    : await recoverFilesystemScaffold(repositoryRoot);
  if (!receipt) {
    process.stdout.write(
      options.json
        ? `${JSON.stringify({ outcome: "no-pending-transaction" }, null, 2)}\n`
        : "No pending scaffolding transaction.\n",
    );
    return;
  }
  process.stdout.write(
    options.json
      ? `${JSON.stringify(receipt, null, 2)}\n`
      : renderReceipt(receipt, "Recovery"),
  );
  if (!successfulOutcomes.has(receipt.outcome)) {
    process.exitCode = 1;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.command === "plan") {
    await planCommand(options);
  } else if (options.command === "apply") {
    await applyCommand(options);
  } else {
    await recoverCommand(options);
  }
}

await main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
