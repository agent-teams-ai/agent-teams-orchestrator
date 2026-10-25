import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

export const reviewRouterRuntimeSha = "75cbecab131d74021677fcd1fb21962994d306b8";
export const reviewRouterReviewWorkflowSha256 =
  "d30c359c172a2d2e6ad8af7b5557894ae8d601f5f4957a87153aa93810966cc4";
export const reviewRouterInteractionWorkflowSha256 =
  "336a904791d2e84164b44b2342aa5acc6d63cff36aac71cbce80a8c6fc8b8843";

function workflowSha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function validateCanonicalWorkflow({ source, expectedSha256, label, ruleId }) {
  try {
    YAML.parse(source);
  } catch (error) {
    return [`${ruleId} invalid ${label} YAML: ${error.message}`];
  }
  const actualSha256 = workflowSha256(source);
  if (actualSha256 !== expectedSha256) {
    return [
      `${ruleId} ${label} workflow must exactly match the reviewed canonical source (expected ${expectedSha256}, received ${actualSha256})`,
    ];
  }
  return [];
}

const gatewayRuntimeWorkflow =
  "777genius/review-router/.github/workflows/reviewrouter-runtime.yml@workflow-v1";
const gatewayInputGuard =
  "${{ inputs.review_request_id != '' && inputs.pr_number != '' && inputs.review_head_sha != '' }}";

function validateGatewayAuthority(source) {
  let workflow;
  try {
    workflow = YAML.parse(source);
  } catch {
    return [];
  }
  const job = workflow?.jobs?.review;
  const requiredInputs = Object.fromEntries(
    ["review_request_id", "pr_number", "review_head_sha"].map((name) => [
      name,
      { required: true, type: "string" },
    ]),
  );
  const checks = [
    ["dispatch inputs", workflow?.on, { workflow_dispatch: { inputs: requiredInputs } }],
    ["root permissions", workflow?.permissions, {}],
    ["job identity", Object.keys(workflow?.jobs ?? {}), ["review"]],
    ["input guard", job?.if, gatewayInputGuard],
    [
      "request serialization",
      job?.concurrency,
      {
        group: "reviewrouter-request-${{ github.repository_id }}-${{ inputs.review_request_id }}",
        "cancel-in-progress": false,
      },
    ],
    [
      "job permissions",
      job?.permissions,
      { contents: "read", "pull-requests": "read", "id-token": "write" },
    ],
    ["runtime custody", job?.uses, gatewayRuntimeWorkflow],
    [
      "bound input forwarding",
      job?.with,
      {
        review_request_id: "${{ inputs.review_request_id }}",
        pr_number: "${{ inputs.pr_number }}",
        review_head_sha: "${{ inputs.review_head_sha }}",
      },
    ],
    ["secret isolation", job?.secrets, undefined],
  ];
  return checks
    .filter(([, actual, expected]) => JSON.stringify(actual) !== JSON.stringify(expected))
    .map(
      ([label]) => `RR-WORKFLOW-003 Gateway ${label} must preserve the reviewed authority boundary`,
    );
}

export function validateReviewRouterReviewWorkflow(source) {
  return [
    ...validateCanonicalWorkflow({
      source,
      expectedSha256: reviewRouterReviewWorkflowSha256,
      label: "Gateway review",
      ruleId: "RR-WORKFLOW-001",
    }),
    ...validateGatewayAuthority(source),
  ];
}

export function validateReviewRouterWorkflow(source) {
  return validateCanonicalWorkflow({
    source,
    expectedSha256: reviewRouterInteractionWorkflowSha256,
    label: "explicit interaction V2",
    ruleId: "RR-WORKFLOW-002",
  });
}

export async function validateRepositoryReviewRouterWorkflow(repositoryRoot) {
  const [reviewSource, interactionSource] = await Promise.all(
    ["reviewrouter-review.yml", "reviewrouter-interaction.yml"].map((name) =>
      readFile(path.join(repositoryRoot, ".github/workflows", name), "utf8"),
    ),
  );
  return [
    ...validateReviewRouterReviewWorkflow(reviewSource),
    ...validateReviewRouterWorkflow(interactionSource),
  ];
}

async function main() {
  const rootIndex = process.argv.indexOf("--root");
  const repositoryRoot =
    rootIndex === -1 ? defaultRepositoryRoot : path.resolve(process.argv[rootIndex + 1] ?? "");
  const errors = await validateRepositoryReviewRouterWorkflow(repositoryRoot);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `ReviewRouter Gateway and interaction workflow conformance passed (interaction ${reviewRouterRuntimeSha})`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
