import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateReviewRouterWorkflow } from "./validate-reviewrouter-workflow.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const workflowPath = path.join(
  repositoryRoot,
  ".github/workflows/reviewrouter-interaction.yml",
);
const canonical = await readFile(workflowPath, "utf8");

function replaceExactlyOnce(source, expected, replacement) {
  assert.equal(
    source.split(expected).length - 1,
    1,
    `mutation source must occur exactly once: ${expected}`,
  );
  return source.replace(expected, replacement);
}

function ruleIds(errors) {
  return [
    ...new Set(errors.map((error) => error.slice(0, error.indexOf(" ")))),
  ].toSorted();
}

const canonicalFilter =
  "    if: ${{ github.event_name == 'workflow_dispatch' || ((github.event_name != 'issue_comment' || github.event.issue.pull_request) && github.event.comment.user.type != 'Bot') }}";

const negativeCases = [
  {
    name: "rejects review-comment trigger drift",
    rule: "RR-WORKFLOW-002",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        "  pull_request_review_comment:\n    types: [created, edited]",
        "  pull_request_review_comment:\n    types: [created]",
      ),
  },
  {
    name: "rejects pull-request issue filter drift",
    rule: "RR-WORKFLOW-005",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        canonicalFilter,
        "    if: ${{ github.event_name == 'workflow_dispatch' || github.event.comment.user.type != 'Bot' }}",
      ),
  },
  {
    name: "rejects non-bot filter drift",
    rule: "RR-WORKFLOW-005",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        canonicalFilter,
        "    if: ${{ github.event_name == 'workflow_dispatch' || (github.event_name != 'issue_comment' || github.event.issue.pull_request) }}",
      ),
  },
  {
    name: "rejects root permission drift",
    rule: "RR-WORKFLOW-003",
    mutate: (source) =>
      replaceExactlyOnce(source, "permissions: {}", "permissions:\n  contents: read"),
  },
  {
    name: "rejects write access for the fallback GitHub token",
    rule: "RR-WORKFLOW-007",
    mutate: (source) =>
      replaceExactlyOnce(source, "      issues: read", "      issues: write"),
  },
  {
    name: "rejects missing OIDC permission",
    rule: "RR-WORKFLOW-007",
    mutate: (source) =>
      replaceExactlyOnce(source, "      id-token: write", "      id-token: read"),
  },
  {
    name: "rejects a mutable reusable workflow ref",
    rule: "RR-WORKFLOW-006",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        "reviewrouter-interaction-reusable.yml@6b35091c824b1d4d5ee6bf8316121ed08d3e4861",
        "reviewrouter-interaction-reusable.yml@main",
      ),
  },
  {
    name: "rejects a mismatched runtime ref",
    rule: "RR-WORKFLOW-008",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        'runtime_ref: "6b35091c824b1d4d5ee6bf8316121ed08d3e4861"',
        'runtime_ref: "08f6bc1481fd284fa82adfa47cda05c76b161b00"',
      ),
  },
  {
    name: "rejects API URL drift",
    rule: "RR-WORKFLOW-008",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        'api_url: "https://api.reviewrouter.site"',
        'api_url: "https://example.invalid"',
      ),
  },
  {
    name: "rejects static runtime configuration",
    rule: "RR-WORKFLOW-008",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        'runtime_config_mode: "oidc"',
        'runtime_config_mode: "static"',
      ),
  },
  ...[
    [
      "discussion mode",
      "discussion_mode: ${{ vars.REVIEW_ROUTER_DISCUSSION_MODE || 'off' }}",
      "discussion_mode: ${{ vars.REVIEW_ROUTER_DISCUSSION_MODE || 'suggest' }}",
    ],
    [
      "discussion model",
      "discussion_model: ${{ vars.REVIEW_CODEX_MODEL || 'gpt-5.5' }}",
      "discussion_model: ${{ vars.REVIEW_CODEX_MODEL || 'gpt-5' }}",
    ],
    [
      "discussion effort",
      "discussion_reasoning_effort: ${{ vars.REVIEW_CODEX_EFFORT || 'xhigh' }}",
      "discussion_reasoning_effort: ${{ vars.REVIEW_CODEX_EFFORT || 'high' }}",
    ],
    [
      "per-PR discussion limit",
      "discussion_max_per_pr: ${{ vars.REVIEW_ROUTER_DISCUSSION_MAX_PER_PR || '20' }}",
      "discussion_max_per_pr: ${{ vars.REVIEW_ROUTER_DISCUSSION_MAX_PER_PR || '21' }}",
    ],
    [
      "per-thread discussion limit",
      "discussion_max_per_thread: ${{ vars.REVIEW_ROUTER_DISCUSSION_MAX_PER_THREAD || '5' }}",
      "discussion_max_per_thread: ${{ vars.REVIEW_ROUTER_DISCUSSION_MAX_PER_THREAD || '6' }}",
    ],
    [
      "discussion timeout",
      "discussion_timeout_seconds: ${{ vars.REVIEW_ROUTER_DISCUSSION_TIMEOUT_SECONDS || '60' }}",
      "discussion_timeout_seconds: ${{ vars.REVIEW_ROUTER_DISCUSSION_TIMEOUT_SECONDS || '61' }}",
    ],
  ].map(([label, expected, replacement]) => ({
    name: `rejects ${label} variable or default drift`,
    rule: "RR-WORKFLOW-008",
    mutate: (source) => replaceExactlyOnce(source, expected, replacement),
  })),
  {
    name: "rejects CODEX auth secret source drift",
    rule: "RR-WORKFLOW-009",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        "      CODEX_AUTH_JSON: ${{ secrets.REVIEWROUTER_CODEX_AUTH_JSON }}",
        "      CODEX_AUTH_JSON: ${{ secrets.CODEX_AUTH_JSON }}",
      ),
  },
  {
    name: "rejects missing repository ledger mapping",
    rule: "RR-WORKFLOW-009",
    mutate: (source) =>
      replaceExactlyOnce(
        source,
        "      REVIEW_ROUTER_LEDGER_KEY: ${{ secrets.REVIEW_ROUTER_LEDGER_KEY }}\n",
        "",
      ),
  },
  {
    name: "rejects copied steps independently of copied source fragments",
    rule: "RR-WORKFLOW-010",
    mutate: (source) => `${source}    steps:\n      - run: echo copied\n`,
  },
  ...[
    "actions/checkout@copied",
    "actions/setup-node@copied",
    "npm install -g @openai/codex",
    ".reviewrouter-runtime/dist/index.js",
  ].map((fragment) => ({
    name: `rejects copied source fragment ${fragment}`,
    rule: "RR-WORKFLOW-011",
    mutate: (source) => `${source}# ${fragment}\n`,
  })),
];

test("accepts the exact ReviewRouter thin caller", () => {
  assert.deepEqual(validateReviewRouterWorkflow(canonical), []);
});

for (const { name, mutate, rule } of negativeCases) {
  test(name, () => {
    const mutated = mutate(canonical);
    assert.notEqual(mutated, canonical, "mutant must change the canonical fixture");
    const errors = validateReviewRouterWorkflow(mutated);
    assert.deepEqual(
      ruleIds(errors),
      [rule],
      `mutant must fail independently with ${rule}: ${errors.join("; ")}`,
    );
  });
}
