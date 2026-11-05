import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  validateRepositoryReviewRouterWorkflow,
  validateReviewRouterReviewWorkflow,
  validateReviewRouterWorkflow,
} from "./validate-reviewrouter-workflow.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const workflowRoot = path.join(repositoryRoot, ".github/workflows");
const canonicalReview = await readFile(path.join(workflowRoot, "reviewrouter-review.yml"), "utf8");
const canonicalInteraction = await readFile(
  path.join(workflowRoot, "reviewrouter-interaction.yml"),
  "utf8",
);

function replaceExactlyOnce(source, expected, replacement) {
  assert.equal(
    source.split(expected).length - 1,
    1,
    `mutation source must occur exactly once: ${expected}`,
  );
  return source.replace(expected, replacement);
}

const negativeCases = [
  {
    name: "rejects Gateway review trigger trust-boundary drift",
    expected: "  workflow_dispatch:",
    replacement: "  pull_request_target:",
  },
  {
    name: "rejects optional Gateway head qualification",
    expected: "      review_head_sha: { required: true, type: string }",
    replacement: "      review_head_sha: { required: false, type: string }",
  },
  {
    name: "rejects Gateway root permission drift",
    expected: "permissions: {}",
    replacement: "permissions: { contents: write }",
  },
  {
    name: "rejects Gateway job write permission drift",
    expected: "      pull-requests: read",
    replacement: "      pull-requests: write",
  },
  {
    name: "rejects missing Gateway OIDC permission",
    expected: "      id-token: write",
    replacement: "      id-token: read",
  },
  {
    name: "rejects Gateway request cancellation drift",
    expected: "      cancel-in-progress: false",
    replacement: "      cancel-in-progress: true",
  },
  {
    name: "rejects Gateway serialization scope drift",
    expected:
      "      group: reviewrouter-request-${{ github.repository_id }}-${{ inputs.review_request_id }}",
    replacement: "      group: reviewrouter-request-${{ github.repository_id }}",
  },
  {
    name: "rejects Gateway input guard drift",
    expected:
      "    if: ${{ inputs.review_request_id != '' && inputs.pr_number != '' && inputs.review_head_sha != '' }}",
    replacement: "    if: ${{ true }}",
  },
  {
    name: "rejects Gateway runtime custody drift",
    expected: "reviewrouter-runtime.yml@workflow-v1",
    replacement: "reviewrouter-runtime.yml@main",
  },
  {
    name: "rejects unbound Gateway head forwarding",
    expected: "      review_head_sha: ${{ inputs.review_head_sha }}",
    replacement: "      review_head_sha: main",
  },
  {
    name: "rejects inherited Gateway secrets",
    expected: "    with:",
    replacement: "    secrets: inherit\n    with:",
  },
].map((entry) => ({
  ...entry,
  validate: validateReviewRouterReviewWorkflow,
  source: canonicalReview,
}));
const interactionNegativeCases = [
  {
    name: "rejects interaction trigger drift",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: "  pull_request_review_comment:\n    types: [created, edited]",
    replacement: "  pull_request_review_comment:\n    types: [created]",
  },
  {
    name: "rejects interaction root permission drift",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: "permissions: {}",
    replacement: "permissions:\n  contents: read",
  },
  {
    name: "rejects interaction write permission drift",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: "      issues: read",
    replacement: "      issues: write",
  },
  {
    name: "rejects missing interaction OIDC permission",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: "      id-token: write",
    replacement: "      id-token: read",
  },
  {
    name: "rejects a mutable interaction checkout ref",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    replacement: "actions/checkout@main",
  },
  {
    name: "rejects interaction runtime drift",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: 'RR_RUNTIME_REF: "75cbecab131d74021677fcd1fb21962994d306b8"',
    replacement: 'RR_RUNTIME_REF: "c7b7d5c5da0587c9fecdc2b7ec65be3df8e4acf4"',
  },
  {
    name: "rejects static interaction runtime configuration",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: 'REVIEWROUTER_RUNTIME_CONFIG_MODE: "oidc"',
    replacement: 'REVIEWROUTER_RUNTIME_CONFIG_MODE: "static"',
  },
  {
    name: "rejects a mutable interaction setup action ref",
    validate: validateReviewRouterWorkflow,
    source: canonicalInteraction,
    expected: "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
    replacement: "actions/setup-node@main",
  },
];

test("accepts the exact ReviewRouter canonical workflows", async () => {
  assert.deepEqual(validateReviewRouterReviewWorkflow(canonicalReview), []);
  assert.deepEqual(validateReviewRouterWorkflow(canonicalInteraction), []);
  assert.deepEqual(await validateRepositoryReviewRouterWorkflow(repositoryRoot), []);
});

for (const { name, validate, source, expected, replacement } of [
  ...negativeCases,
  ...interactionNegativeCases,
]) {
  test(name, () => {
    const mutated = replaceExactlyOnce(source, expected, replacement);
    assert.notEqual(mutated, source, "mutant must change the canonical fixture");
    const errors = validate(mutated);
    if (validate === validateReviewRouterReviewWorkflow) {
      assert.ok(
        errors.some((error) => error.startsWith("RR-WORKFLOW-003")),
        "Gateway mutants must fail semantic authority checks independently of byte hashing",
      );
    } else {
      assert.equal(errors.length, 1);
    }
  });
}
