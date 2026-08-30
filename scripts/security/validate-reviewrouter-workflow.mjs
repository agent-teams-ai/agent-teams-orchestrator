import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

export const reviewRouterRuntimeSha =
  "75cbecab131d74021677fcd1fb21962994d306b8";
export const reviewRouterCodexWorkflowSha256 =
  "8049f928f481c0169d3038af4d1e61b2368ceb0a4bf1369db595dcda8da253f7";
export const reviewRouterInteractionWorkflowSha256 =
  "0997a60c648fcb66e341d011a94ea2721585af9b1611c7e07445c372f0ac5008";

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
      `${ruleId} ${label} workflow must exactly match the reviewed ReviewRouter v1.0.138 canonical source (expected ${expectedSha256}, received ${actualSha256})`,
    ];
  }
  return [];
}

export function validateReviewRouterCodexWorkflow(source) {
  return validateCanonicalWorkflow({
    source,
    expectedSha256: reviewRouterCodexWorkflowSha256,
    label: "V4/T0 review",
    ruleId: "RR-WORKFLOW-001",
  });
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
  const [codexSource, interactionSource] = await Promise.all(
    ["reviewrouter-codex.yml", "reviewrouter-interaction.yml"].map((name) =>
      readFile(path.join(repositoryRoot, ".github/workflows", name), "utf8"),
    ),
  );
  return [
    ...validateReviewRouterCodexWorkflow(codexSource),
    ...validateReviewRouterWorkflow(interactionSource),
  ];
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
    `ReviewRouter canonical workflow conformance passed (${reviewRouterRuntimeSha})`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
