import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readReviewedContract, requireCompleteSelection } from "./run-required-quality-tests.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const identity = (file, name) => ({ file, names: [name], kind: "test" });

async function fixture(action) {
  const root = await mkdtemp(join(tmpdir(), "orchestrator-required-node-"));
  try {
    await mkdir(join(root, "tests"));
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function execute(root, contract, source) {
  const manifestPath = fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const cli = join(dirname(manifestPath), manifest.bin["agent-teams-node-test"]);
  await writeFile(join(root, "tests/critical.test.mjs"), source);
  await writeFile(join(root, "contract.json"), JSON.stringify(contract));
  const result = spawnSync(process.execPath, [cli, "--contract", "contract.json", "--", "tests/critical.test.mjs"],
    { cwd: root, encoding: "utf8", timeout: 60_000 });
  assert.equal(result.error, undefined, result.stderr);
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const header = "import test from 'node:test'; import assert from 'node:assert/strict';\n";

test("published mandatory runner rejects omission and skip, and accepts completed execution", async () => {
  await fixture(async (root) => {
    const contract = { schemaVersion: 1, required: [identity("tests/critical.test.mjs", "critical")], exceptions: [] };
    const complete = await execute(root, contract, `${header}test('critical', () => assert.equal(2 + 2, 4));`);
    assert.equal(complete.status, 0, complete.output);
    assert.match(complete.output, /1 required identities completed/u);
    for (const [source, outcome] of [
      ["test('unrelated', () => {});", "omitted"],
      ["test('critical', { skip: true }, () => {});", "skipped"],
      ["test('critical', { todo: true }, () => {});", "todo"],
      ["test('critical', () => assert.fail('regression'));", "failed"],
    ]) {
      const rejected = await execute(root, contract, `${header}${source}`);
      assert.notEqual(rejected.status, 0, rejected.output);
      assert.match(rejected.output, new RegExp(outcome, "u"));
    }
  });
});

test("mandatory selection rejects dropping a whole protected file", async () => {
  const contract = { required: [identity("a.test.mjs", "a"), identity("b.test.mjs", "b")] };
  requireCompleteSelection(contract, ["a.test.mjs", "b.test.mjs"]);
  assert.throws(() => requireCompleteSelection(contract, ["a.test.mjs"]), /complete contract/u);
  assert.throws(() => requireCompleteSelection(contract, ["a.test.mjs", "a.test.mjs", "b.test.mjs"]), /complete contract/u);
  const rejected = spawnSync(process.execPath, [join(repositoryRoot, "scripts/architecture/run-required-quality-tests.mjs"),
    "scripts/architecture/source-dependencies-v3.test.mjs"],
  { cwd: repositoryRoot, encoding: "utf8", timeout: 60_000 });
  assert.equal(rejected.error, undefined, rejected.stderr);
  assert.notEqual(rejected.status, 0, rejected.stdout);
  assert.match(rejected.stderr, /complete contract/u);
});

test("mandatory contract rejects removing a critical identity while all protected files remain selected", async () => {
  await fixture(async (root) => {
    const original = await readFile(join(repositoryRoot, "architecture/foundation/required-quality-tests.json"), "utf8");
    const path = join(root, "contract.json");
    await writeFile(path, original);
    const contract = await readReviewedContract(path);
    const files = [...new Set(contract.required.map(({ file }) => file))];
    assert.equal(files.length, 3);
    requireCompleteSelection(contract, files);
    for (const [index, removed] of contract.required.entries()) {
      const candidate = structuredClone(contract);
      candidate.required.splice(index, 1);
      requireCompleteSelection(candidate, files);
      await writeFile(path, `${JSON.stringify(candidate, null, 2)}\n`);
      await assert.rejects(readReviewedContract(path), /identity contract has drifted/u, JSON.stringify(removed));
      await writeFile(path, original);
      requireCompleteSelection(await readReviewedContract(path), files);
    }
  });
});

test("published mandatory runner admits only the exact OS exception", async () => {
  await fixture(async (root) => {
    const required = identity("tests/critical.test.mjs", "Windows command interpreter");
    const exception = { ...required, status: "skipped",
      reason: "cmd.exe is a Windows OS facility unavailable on Linux and macOS.",
      applicability: { platforms: ["linux", "darwin"] } };
    const contract = { schemaVersion: 1, required: [required], exceptions: [exception] };
    const source = `${header}import { spawnSync } from 'node:child_process';
      test('Windows command interpreter', { skip: process.platform !== 'win32' }, () => {
        assert.equal(spawnSync('cmd.exe', ['/c', 'ver']).status, 0);
      });`;
    const accepted = await execute(root, contract, source);
    assert.equal(accepted.status, 0, accepted.output);
    if (process.platform !== "win32") {
      exception.applicability.platforms = ["win32"];
      const wrongPlatform = await execute(root, contract, source);
      assert.notEqual(wrongPlatform.status, 0, wrongPlatform.output);
      assert.match(wrongPlatform.output, /skipped/u);
      exception.applicability.platforms = ["linux", "darwin", "win32"];
      const blanket = await execute(root, contract, source);
      assert.notEqual(blanket.status, 0, blanket.output);
      assert.match(blanket.output, /platform subset/u);
    }
  });
});
