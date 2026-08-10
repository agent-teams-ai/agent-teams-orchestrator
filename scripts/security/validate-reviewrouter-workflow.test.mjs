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

test("accepts the exact ReviewRouter thin caller", () => {
  assert.deepEqual(validateReviewRouterWorkflow(canonical), []);
});

for (const [name, mutate, expectedRule] of [
  [
    "rejects a mutable reusable workflow ref",
    (source) => source.replace(
      "reviewrouter-interaction-reusable.yml@5da51b7b71b1db9ce531f946ec2bb90411a31300",
      "reviewrouter-interaction-reusable.yml@main",
    ),
    "RR-WORKFLOW-006",
  ],
  [
    "rejects a mismatched runtime ref",
    (source) => source.replace(
      'runtime_ref: "5da51b7b71b1db9ce531f946ec2bb90411a31300"',
      'runtime_ref: "08f6bc1481fd284fa82adfa47cda05c76b161b00"',
    ),
    "RR-WORKFLOW-008",
  ],
  [
    "rejects missing repository ledger mapping",
    (source) => source.replace(
      "      REVIEW_ROUTER_LEDGER_KEY: ${{ secrets.REVIEW_ROUTER_LEDGER_KEY }}\n",
      "",
    ),
    "RR-WORKFLOW-009",
  ],
  [
    "rejects a copied runtime step",
    (source) => `${source}    steps:\n      - run: node .reviewrouter-runtime/dist/index.js\n`,
    "RR-WORKFLOW-010",
  ],
]) {
  test(name, () => {
    const errors = validateReviewRouterWorkflow(mutate(canonical));
    assert.ok(
      errors.some((error) => error.startsWith(expectedRule)),
      `expected ${expectedRule}, received ${errors.join("; ")}`,
    );
  });
}
