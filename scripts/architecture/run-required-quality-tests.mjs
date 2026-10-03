import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const contractPath = "architecture/foundation/required-quality-tests.json";
const reviewedContractSha256 = "78b2b819ae3f842a82303248d7af75efe7d07948823394b5b2922b59f62e502b";

// Bind the reviewed consumer identities without duplicating their inventory or
// the shared runner's schema validation and execution accounting.
export async function readReviewedContract(path = contractPath) {
  const source = await readFile(path);
  assert.equal(createHash("sha256").update(source).digest("hex"), reviewedContractSha256,
    "Mandatory quality identity contract has drifted from its reviewed SHA-256.");
  return JSON.parse(source.toString("utf8"));
}

// The shared runner protects identities only in selected files. This consumer
// adapter binds the entire mandatory file selection before invoking its public bin.
export function requireCompleteSelection(contract, files) {
  const requiredFiles = [...new Set(contract.required.map(({ file }) => file))].toSorted();
  assert.ok(requiredFiles.length > 0, "Mandatory quality file selection is empty.");
  assert.deepEqual([...files].toSorted(), requiredFiles,
    "Mandatory quality file selection must cover the complete contract exactly once.");
}

async function main() {
  const contract = await readReviewedContract();
  const files = process.argv.length > 2 ? process.argv.slice(2) :
    [...new Set(contract.required.map(({ file }) => file))];
  requireCompleteSelection(contract, files);
  const manifestPath = fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const cli = join(dirname(manifestPath), manifest.bin["agent-teams-node-test"]);
  const result = spawnSync(process.execPath, [cli, "--contract", contractPath, "--", ...files],
    { stdio: "inherit", timeout: 120_000 });
  if (result.error) {
    throw result.error;
  }
  assert.equal(result.status, 0, "Mandatory quality execution failed.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
