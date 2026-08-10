import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

export const reviewRouterRuntimeSha =
  "5da51b7b71b1db9ce531f946ec2bb90411a31300";
const reusableWorkflow =
  "777genius/review-router/.github/workflows/reviewrouter-interaction-reusable.yml";
const expectedUse = `${reusableWorkflow}@${reviewRouterRuntimeSha}`;
const expectedFilter =
  "${{ github.event_name == 'workflow_dispatch' || ((github.event_name != 'issue_comment' || github.event.issue.pull_request) && github.event.comment.user.type != 'Bot') }}";

const expectedPermissions = {
  actions: "write",
  contents: "read",
  issues: "read",
  "pull-requests": "read",
  "id-token": "write",
};

const expectedInputs = {
  runtime_ref: reviewRouterRuntimeSha,
  api_url: "https://api.reviewrouter.site",
  runtime_config_mode: "oidc",
  review_workflow_file: "reviewrouter-codex.yml",
  discussion_mode: "${{ vars.REVIEW_ROUTER_DISCUSSION_MODE || 'off' }}",
  discussion_model: "${{ vars.REVIEW_CODEX_MODEL || 'gpt-5.5' }}",
  discussion_reasoning_effort:
    "${{ vars.REVIEW_CODEX_EFFORT || 'xhigh' }}",
  discussion_max_per_pr:
    "${{ vars.REVIEW_ROUTER_DISCUSSION_MAX_PER_PR || '20' }}",
  discussion_max_per_thread:
    "${{ vars.REVIEW_ROUTER_DISCUSSION_MAX_PER_THREAD || '5' }}",
  discussion_timeout_seconds:
    "${{ vars.REVIEW_ROUTER_DISCUSSION_TIMEOUT_SECONDS || '60' }}",
};

const expectedSecrets = {
  CODEX_AUTH_JSON: "${{ secrets.REVIEWROUTER_CODEX_AUTH_JSON }}",
  REVIEW_ROUTER_LEDGER_KEY: "${{ secrets.REVIEW_ROUTER_LEDGER_KEY }}",
};

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function equal(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function hasExactEvents(events) {
  return (
    events &&
    equal(Object.keys(events).toSorted(), [
      "issue_comment",
      "pull_request_review_comment",
      "workflow_dispatch",
    ]) &&
    equal(events.pull_request_review_comment?.types, ["created", "edited"]) &&
    equal(events.issue_comment?.types, ["created", "edited"])
  );
}

function copiedRuntimeKeys(job) {
  return ["runs-on", "steps", "env", "container", "services"].filter((key) =>
    Object.hasOwn(job, key),
  );
}

function sourceContainsCopiedRuntime(source) {
  return [
    "actions/checkout@",
    "actions/setup-node@",
    "npm install -g @openai/codex",
    ".reviewrouter-runtime/dist/index.js",
  ].some((fragment) => source.includes(fragment));
}

export function validateReviewRouterWorkflow(source) {
  const errors = [];
  let workflow;
  try {
    workflow = YAML.parse(source);
  } catch (error) {
    return [`RR-WORKFLOW-001 invalid YAML: ${error.message}`];
  }

  const events = workflow?.on;
  if (!hasExactEvents(events)) {
    errors.push(
      "RR-WORKFLOW-002 interaction triggers must remain created/edited review comments, created/edited issue comments, and manual dispatch",
    );
  }

  if (!equal(workflow?.permissions, {})) {
    errors.push("RR-WORKFLOW-003 root permissions must remain empty");
  }

  const jobs = workflow?.jobs;
  if (!jobs || !equal(Object.keys(jobs), ["interaction"])) {
    errors.push("RR-WORKFLOW-004 exactly one interaction job is allowed");
  }
  const job = jobs?.interaction ?? {};
  if (job.if !== expectedFilter) {
    errors.push("RR-WORKFLOW-005 bot and non-PR issue comments must stay filtered");
  }
  if (job.uses !== expectedUse) {
    errors.push(
      `RR-WORKFLOW-006 reusable workflow must use immutable ${expectedUse}`,
    );
  }
  if (!equal(job.permissions, expectedPermissions)) {
    errors.push(
      "RR-WORKFLOW-007 caller permissions must exactly match the reviewed reusable contract",
    );
  }
  if (!equal(job.with, expectedInputs)) {
    errors.push(
      "RR-WORKFLOW-008 runtime SHA and repository-specific inputs must match the reviewed contract",
    );
  }
  if (!equal(job.secrets, expectedSecrets)) {
    errors.push(
      "RR-WORKFLOW-009 repository-specific secret mappings must remain explicit and exact",
    );
  }
  for (const forbiddenKey of copiedRuntimeKeys(job)) {
    errors.push(
      `RR-WORKFLOW-010 thin caller cannot define copied runtime key ${forbiddenKey}`,
    );
  }
  if (sourceContainsCopiedRuntime(source)) {
    errors.push(
      "RR-WORKFLOW-011 checkout, authentication, and runtime steps belong to the reusable workflow",
    );
  }

  return errors;
}

export async function validateRepositoryReviewRouterWorkflow(repositoryRoot) {
  const workflowPath = path.join(
    repositoryRoot,
    ".github/workflows/reviewrouter-interaction.yml",
  );
  return validateReviewRouterWorkflow(await readFile(workflowPath, "utf8"));
}

async function main() {
  const rootIndex = process.argv.indexOf("--root");
  const repositoryRoot =
    rootIndex === -1
      ? defaultRepositoryRoot
      : path.resolve(process.argv[rootIndex + 1] ?? "");
  const errors = await validateRepositoryReviewRouterWorkflow(repositoryRoot);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `ReviewRouter thin caller conformance passed (${reviewRouterRuntimeSha})`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
