import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  validateRepositoryReviewRouterWorkflow,
  validateReviewRouterCodexWorkflow,
  validateReviewRouterWorkflow,
} from "./validate-reviewrouter-workflow.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const workflowRoot = path.join(repositoryRoot, ".github/workflows");
const canonicalCodex = await readFile(
  path.join(workflowRoot, "reviewrouter-codex.yml"),
  "utf8",
);
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
    name: "rejects review trigger trust-boundary drift",
    validate: validateReviewRouterCodexWorkflow,
    source: canonicalCodex,
    expected: "  pull_request_target:",
    replacement: "  pull_request:",
  },
  {
    name: "rejects a mutable review reusable workflow ref",
    validate: validateReviewRouterCodexWorkflow,
    source: canonicalCodex,
    expected:
      "reviewrouter-t0-reusable.yml@75cbecab131d74021677fcd1fb21962994d306b8",
    replacement: "reviewrouter-t0-reusable.yml@main",
  },
  {
    name: "rejects review schema drift",
    validate: validateReviewRouterCodexWorkflow,
    source: canonicalCodex,
    expected: "      workflow_schema_version: 4",
    replacement: "      workflow_schema_version: 3",
  },
  {
    name: "rejects review namespace drift",
    validate: validateReviewRouterCodexWorkflow,
    source: canonicalCodex,
    expected:
      "name: ReviewRouter Codex OAuth [namespace=sns_345c07992e6e38d5af4602d735d9cc73;epoch=3;secret=REVIEWROUTER_CODEX_AUTH_JSON_R1310245598_P0f52b3eeb12a23d4_E3_345c07992e6e38d5af4602d735d9cc73]",
    replacement: "name: ReviewRouter Codex OAuth",
  },
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
  assert.deepEqual(validateReviewRouterCodexWorkflow(canonicalCodex), []);
  assert.deepEqual(validateReviewRouterWorkflow(canonicalInteraction), []);
  assert.deepEqual(
    await validateRepositoryReviewRouterWorkflow(repositoryRoot),
    [],
  );
});

for (const { name, validate, source, expected, replacement } of negativeCases) {
  test(name, () => {
    const mutated = replaceExactlyOnce(source, expected, replacement);
    assert.notEqual(mutated, source, "mutant must change the canonical fixture");
    assert.equal(validate(mutated).length, 1);
  });
}
