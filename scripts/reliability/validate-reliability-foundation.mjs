import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

import {
  validateQualificationReferences,
  validateQualificationSemantics,
} from "./qualification-validation.mjs";

export { validateQualificationReferences } from "./qualification-validation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");
const maximumSeriesCombinations = 512;
const requiredProhibitedAttributes = new Set([
  "agent.id",
  "operation.id",
  "project.id",
  "run.id",
  "runtime.session.id",
  "span.id",
  "team.id",
  "tenant.id",
  "trace.id",
  "url.full",
  "url.path",
  "user.id",
  "workspace.path",
]);

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

async function readYaml(filePath) {
  return YAML.parse(await readFile(filePath, "utf8"));
}


function schemaErrors(validate) {
  return (validate.errors ?? []).map(
    (error) =>
      `REL-SCHEMA-001 ${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
  );
}

function addUniqueIds(items, kind, ids, errors) {
  for (const item of items ?? []) {
    if (ids.has(item.id)) {
      errors.push(`REL-ID-001 ${item.id}: duplicate reliability id`);
    }
    ids.add(item.id);
    if (!item.id.startsWith("orchestrator.")) {
      errors.push(
        `REL-ID-002 ${item.id}: ${kind} id must use the orchestrator namespace`,
      );
    }
  }
}

function validateOwner(owner, ownerIds, subject, errors) {
  if (!ownerIds.has(owner)) {
    errors.push(`REL-OWNER-001 ${subject}: unknown owner ${owner}`);
  }
}

function validateAttributes(
  subject,
  allowedAttributes,
  attributeById,
  prohibitedAttributes,
  errors,
) {
  let combinations = 1;
  for (const attribute of allowedAttributes ?? []) {
    if (prohibitedAttributes.has(attribute)) {
      errors.push(
        `REL-CARDINALITY-001 ${subject}: prohibited metric attribute ${attribute}`,
      );
      continue;
    }
    const registered = attributeById.get(attribute);
    if (!registered) {
      errors.push(
        `REL-CARDINALITY-002 ${subject}: unregistered metric attribute ${attribute}`,
      );
      continue;
    }
    combinations *= registered.maxDistinct;
  }

  if (combinations > maximumSeriesCombinations) {
    errors.push(
      `REL-CARDINALITY-003 ${subject}: declared attributes permit ${combinations} series, maximum is ${maximumSeriesCombinations}`,
    );
  }
}

function validateObjective(item, errors) {
  const objectiveStatuses = new Set(["active", "aspirational"]);
  if (objectiveStatuses.has(item.status) && !item.objective) {
    errors.push(
      `REL-SLO-001 ${item.id}: ${item.status} indicator requires an approved objective`,
    );
  }
  if (!objectiveStatuses.has(item.status) && item.objective) {
    errors.push(
      `REL-SLO-002 ${item.id}: ${item.status} indicator cannot publish an objective`,
    );
  }
  if (item.objective) {
    const target = Number(item.objective.targetRatio);
    if (!(target > 0 && target < 1)) {
      errors.push(
        `REL-SLO-003 ${item.id}: target ratio must be greater than zero and lower than one`,
      );
    }
    if (
      Date.parse(item.objective.reviewAfter) <=
      Date.parse(item.objective.approvedAt)
    ) {
      errors.push(
        `REL-SLO-004 ${item.id}: review date must follow approval date`,
      );
    }
  }
}

function buildAttributeRegistry(catalog, errors) {
  const prohibitedAttributes = new Set(
    catalog.prohibitedMetricAttributes ?? [],
  );
  const attributeById = new Map();

  for (const attribute of catalog.metricAttributes ?? []) {
    if (attributeById.has(attribute.id)) {
      errors.push(
        `REL-CARDINALITY-004 ${attribute.id}: duplicate metric attribute`,
      );
    }
    attributeById.set(attribute.id, attribute);
    if (prohibitedAttributes.has(attribute.id)) {
      errors.push(
        `REL-CARDINALITY-005 ${attribute.id}: attribute is both registered and prohibited`,
      );
    }
  }

  for (const required of requiredProhibitedAttributes) {
    if (!prohibitedAttributes.has(required)) {
      errors.push(
        `REL-CARDINALITY-006 ${required}: required high-cardinality prohibition is missing`,
      );
    }
  }

  return {
    attributeById,
    prohibitedAttributes,
  };
}

function validateOwnedItems(catalog, ownerIds, errors) {
  const ids = new Set();
  for (const [kind, items] of [
    ["indicator", catalog.indicators],
    ["invariant", catalog.invariants],
    ["resource budget", catalog.resourceBudgets],
  ]) {
    addUniqueIds(items, kind, ids, errors);
    for (const item of items ?? []) {
      validateOwner(item.owner, ownerIds, item.id, errors);
    }
  }
}

function validateMetricSubjects(
  catalog,
  attributeById,
  prohibitedAttributes,
  errors,
) {
  const profileIds = new Set(
    (catalog.profiles ?? []).map((profile) => profile.id),
  );
  for (const item of [
    ...(catalog.indicators ?? []),
    ...(catalog.resourceBudgets ?? []),
  ]) {
    for (const profile of item.profiles ?? []) {
      if (!profileIds.has(profile)) {
        errors.push(
          `REL-PROFILE-001 ${item.id}: unknown deployment profile ${profile}`,
        );
      }
    }
    validateAttributes(
      item.id,
      item.allowedAttributes,
      attributeById,
      prohibitedAttributes,
      errors,
    );
  }
}

function validateIndicatorPolicies(catalog, errors) {
  for (const indicator of catalog.indicators ?? []) {
    validateObjective(indicator, errors);
  }
}

function validateResourceBudgetPolicies(catalog, errors) {
  for (const budget of catalog.resourceBudgets ?? []) {
    if (budget.status === "active" && budget.limit === undefined) {
      errors.push(
        `REL-BUDGET-001 ${budget.id}: active resource budget requires a limit`,
      );
    }
    if (budget.status !== "active" && budget.limit !== undefined) {
      errors.push(
        `REL-BUDGET-002 ${budget.id}: ${budget.status} resource budget cannot publish a limit`,
      );
    }
  }
}

export function validateReliabilitySemantics(catalog, ownerIds) {
  const errors = [];
  validateQualificationSemantics(catalog, errors);
  const { attributeById, prohibitedAttributes } = buildAttributeRegistry(
    catalog,
    errors,
  );

  validateOwnedItems(catalog, ownerIds, errors);
  validateMetricSubjects(
    catalog,
    attributeById,
    prohibitedAttributes,
    errors,
  );
  validateIndicatorPolicies(catalog, errors);
  validateResourceBudgetPolicies(catalog, errors);

  return errors;
}

export async function validateReliabilityFoundation(repositoryRoot) {
  const schema = await readJson(
    path.join(
      repositoryRoot,
      "architecture/reliability/reliability-catalog.schema.json",
    ),
  );
  const catalog = await readYaml(
    path.join(
      repositoryRoot,
      "architecture/reliability/reliability-catalog.yaml",
    ),
  );
  const owners = await readYaml(path.join(repositoryRoot, "docs/owners.yaml"));

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats.default?.(ajv);
  if (!addFormats.default) {
    addFormats(ajv);
  }
  const validate = ajv.compile(schema);
  const valid = validate(catalog);
  const errors = valid ? [] : schemaErrors(validate);
  errors.push(
    ...validateReliabilitySemantics(
      catalog,
      new Set(Object.keys(owners.owners ?? {})),
    ),
  );
  errors.push(
    ...(await validateQualificationReferences(catalog, repositoryRoot)),
  );

  return {
    catalog,
    errors: errors.toSorted(),
  };
}

async function main() {
  const repositoryRoot = parseArguments(process.argv.slice(2));
  const result = await validateReliabilityFoundation(repositoryRoot);
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Reliability foundation valid: ${result.catalog.profiles.length} profiles, ${result.catalog.capabilities.length} deployment capabilities, ${result.catalog.indicators.length} indicators, ${result.catalog.invariants.length} invariants, ${result.catalog.resourceBudgets.length} resource budgets.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
