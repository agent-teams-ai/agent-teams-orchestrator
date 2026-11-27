// Synthetic transport fixtures only. No hosted run, controller, or qualification is exercised.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { parseHostedLog, EXPECTED_BINDING, INPUT_BINDING_BYTES } from "./parse-hosted-log.mjs";
import { readFileSync } from "node:fs";

const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");
const blob = (b) => createHash("sha1").update("blob " + b.length + "\0").update(b).digest("hex");
function meta(path, data, mode = "100644") {
  return { path, bytes: data.length, sha256: sha(data), gitBlob: blob(data), mode };
}
const data = (value) => Buffer.from(JSON.stringify(value) + "\n");
function group(prefix, path, bytes, kind, mode = "100644") {
  const descriptor = meta(path, bytes, mode), encoded = bytes.toString("base64");
  const chunks = Math.ceil(encoded.length / 12000), k = kind ? { kind } : {};
  const lines = ["ORCHESTRATOR_" + prefix + "_FILE " + JSON.stringify({ ...descriptor, ...k, chunks })];
  for (let index = 0; index < chunks; index++) lines.push("ORCHESTRATOR_" + prefix + "_CHUNK " +
    JSON.stringify({ path, ...k, index, total: chunks, base64: encoded.slice(index * 12000, (index + 1) * 12000) }));
  lines.push("ORCHESTRATOR_" + prefix + "_END " + JSON.stringify({ path, ...k, sha256: descriptor.sha256 }));
  return lines;
}
function fixture() {
  const source = EXPECTED_BINDING.sourceRevision, parent = "c01efb6813f0c048497caeefbb8235cead480cb2";
  const paths = [".github/workflows/docs-protocol.yml", ".node-version", "architecture/foundation/docs-consumer-integration.json",
    "architecture/foundation/docs-protocol-managed-state.json", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"].sort();
  const physical = new Map(paths.map((path) => [path, Buffer.from("SYNTHETIC transport only: " + path + "\n")]));
  // Real input bytes are transported in a synthetic fixture; no command executes them.
  const selected = readFileSync(new URL("../inputs/selected-target-lock.yaml", import.meta.url));
  physical.set("pnpm-lock.yaml", selected); physical.set(".node-version", Buffer.from("26.12.1\n"));
  const selectedTargetLock = { schemaVersion: 1, scope: "selected-lock-input", qualificationAuthority: false,
    ...meta("selected-target-lock.yaml", selected), path: "/synthetic/never-executed/selected-target-lock.yaml",
    sourceRevision: source, sourceTree: EXPECTED_BINDING.sourceTree, sourceLockSha256: EXPECTED_BINDING.sourceLockSha256,
    closureDigest: EXPECTED_BINDING.target.closure.digest, harnessInputBindingSha256: sha(INPUT_BINDING_BYTES) };
  const runtimes = { syntheticTestOnly: true, node24: { node: "24.22.3" }, node26: { node: "26.12.1" },
    controllerBuildIdentity: EXPECTED_BINDING.controller.buildIdentity, kernelBuildIdentity: EXPECTED_BINDING.kernel.buildIdentity };
  const assets = paths.map((path) => meta(path, physical.get(path)));
  const summary = { schemaVersion: 1, scope: "physical-managed-lifecycle", outcome: "passed", syntheticTestOnly: true,
    source: { revision: source, tree: EXPECTED_BINDING.sourceTree, consumer: { root: "/synthetic/never-executed" } },
    originalMainRevision: EXPECTED_BINDING.originalMainRevision, selectedTargetLock, runtimes, harnessInputBindingSha256: sha(INPUT_BINDING_BYTES),
    run: { repository: "agent-teams-ai/agent-teams-orchestrator", runId: "90000001", runAttempt: "1" },
    authorityRevision: "a".repeat(40), phases: { syntheticTestOnly: true }, assets };
  const manifest = { authority: false, replayable: false, source: summary.source, phases: summary.phases,
    physicalTargetFiles: assets, authorityRevision: summary.authorityRevision, run: summary.run,
    selectedTargetLock, harnessInputBindingSha256: summary.harnessInputBindingSha256 };
  const candidate = new Map([...physical.entries()]);
  candidate.set("package.json", data({ syntheticTestOnly: true, text: "Текст 🙂 transport ".repeat(6000) }));
  candidate.set("docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json", data(manifest));
  const files = [...candidate].map(([path, bytes]) => meta(path, bytes));
  const result = { schemaVersion: 1, scope: "derived-host-integration", outcome: "passed", parentCommit: parent,
    physicalSourceRevision: source, physicalTargetFiles: assets, files, syntheticTestOnly: true,
    managedCheck: { outcome: "current", issues: [] }, candidateCommitCreated: false,
    finalPublishedHeadQualified: false, node24CompatibilityQualified: false, productionIAMLifecycleQualified: false };
  const resultBytes = data(result);
  const compact = { schemaVersion: 1, scope: result.scope, outcome: result.outcome, parentCommit: parent,
    physicalSourceRevision: source, fileCount: files.length, fileBytes: files.reduce((n, file) => n + file.bytes, 0),
    detail: meta("integration-run.json", resultBytes), candidateCommitCreated: false, finalPublishedHeadQualified: false,
    node24CompatibilityQualified: false, productionIAMLifecycleQualified: false };
  const lines = [];
  for (const [path, bytes] of physical) lines.push(...group("E2E", path, bytes, "managed-asset"));
  lines.push(...group("E2E", "harness-input-binding.json", INPUT_BINDING_BYTES, "evidence"));
  lines.push(...group("E2E", "selected-target-lock.yaml", selected, "evidence"));
  lines.push(...group("E2E", "selected-lock-observation.json", data(selectedTargetLock), "evidence"));
  lines.push(...group("E2E", "runtimes.json", data(runtimes), "evidence"));
  lines.push(...group("E2E", "summary.json", data(summary), "evidence"));
  lines.push(...group("E2E", "managed-assets-manifest.json", data(assets), "evidence"));
  lines.push(...group("E2E", "empty.stdout.txt", Buffer.alloc(0), "evidence"));
  for (const [path, bytes] of candidate) lines.push(...group("HOST", path, bytes));
  lines.push(...group("HOST_EVIDENCE", "integration-run.json", resultBytes));
  lines.push("ORCHESTRATOR_HOST_RESULT " + JSON.stringify(compact));
  return { lines, candidate, physical, summary };
}
function mutate(lines, index, transform) {
  const copy = [...lines], separator = copy[index].indexOf(" ");
  const value = JSON.parse(copy[index].slice(separator + 1));
  transform(value);
  copy[index] = copy[index].slice(0, separator + 1) + JSON.stringify(value);
  return copy.join("\n");
}

test("synthetic complete round trip, timestamps, echoes and exclusive local output", async () => {
  const f = fixture();
  const log = ['2026-11-27T00:00:00.0000000Z console.log("ORCHESTRATOR_HOST_FILE echoed source")',
    ...f.lines.map((line) => "2026-11-27T00:00:00.1234567Z " + line)].join("\n") + "\n";
  const parsed = parseHostedLog(log, { mode: "success", runId: "90000001", attempt: "1" });
  assert.equal(parsed.status, "verified-complete"); assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.qualificationAuthority, false);
  assert.ok(parsed.files.find((file) => file.namespace === "host-candidate" && file.path === "package.json").data.equals(f.candidate.get("package.json")));
  const temp = await mkdtemp("./parser-synthetic-");
  try {
    const input = join(temp, "synthetic.log"), output = join(temp, "decoded");
    await writeFile(input, log);
    const args = ["parse-hosted-log.mjs", "--log", input, "--output", output, "--mode", "success", "--run-id", "90000001", "--attempt", "1"];
    const first = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr);
    const manifest = await readFile(join(output, "manifest.json"));
    assert.ok((await readFile(join(output, "host-candidate/package.json"))).equals(f.candidate.get("package.json")));
    const again = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(again.status, 1); assert.ok((await readFile(join(output, "manifest.json"))).equals(manifest));
    assert.equal((await stat(join(output, "host-candidate/package.json"))).mode & 0o777, 0o644);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test("synthetic tamper, duplicate, ordering and binding controls reject", () => {
  const f = fixture(), first = f.lines.findIndex((line) => line.startsWith("ORCHESTRATOR_E2E_FILE "));
  const chunk = f.lines.findIndex((line) => line.startsWith("ORCHESTRATOR_E2E_CHUNK "));
  for (const [index, change] of [
    [first, (x) => { x.gitBlob = "0".repeat(40); }],
    [first, (x) => { x.mode = "120000"; }],
    [first, (x) => { x.path = "../escape"; }],
    [first, (x) => { x.sha256 = "sha256:" + "0".repeat(64); }],
    [chunk, (x) => { x.index = 1; }],
    [chunk, (x) => { x.base64 = (x.base64[0] === "A" ? "B" : "A") + x.base64.slice(1); }],
    [f.lines.length - 1, (x) => { x.detail.gitBlob = "f".repeat(40); }],
  ]) assert.equal(parseHostedLog(mutate(f.lines, index, change)).status, "rejected");
  const duplicated = [f.lines[0], ...f.lines].join("\n");
  assert.equal(parseHostedLog(duplicated).status, "rejected");
  assert.equal(parseHostedLog(f.lines.join("\n"), { runId: "90000002" }).status, "rejected");
  const badBase64 = group("HOST_FAILURE", "failure.txt", Buffer.from("f")).map((line) => line.replace('"Zg=="', '"Zh=="')).join("\n");
  assert.ok(parseHostedLog(badBase64, { mode: "diagnostic" }).errors.length > 0);
  const duplicateKey = f.lines.join("\n").replace('"bytes":', '"bytes":0,"bytes":');
  assert.equal(parseHostedLog(duplicateKey).status, "rejected");
});
test("synthetic truncation and failed-run diagnostics remain explicitly incomplete", async () => {
  const complete = group("HOST_FAILURE", "commands/probe.failure.json", data({ syntheticTestOnly: true, exitCode: 1 }));
  const partial = group("HOST", "package.json", Buffer.from("unverified payload ".repeat(3000))).slice(0, 2);
  const parsed = parseHostedLog([...complete, ...partial].join("\n"), { mode: "diagnostic" });
  assert.equal(parsed.files.length, 1); assert.equal(parsed.files[0].namespace, "host-failure");
  assert.equal(parsed.incomplete.length, 1); assert.equal(parsed.incomplete[0].verified, false);
  assert.ok(parsed.incomplete[0].receivedChunks < parsed.incomplete[0].expectedChunks);
  const invalidUtf8 = parseHostedLog(group("HOST", "bad.txt", Buffer.from([0xc3, 0x28])).join("\n"), { mode: "diagnostic" });
  assert.equal(invalidUtf8.files.length, 0); assert.ok(invalidUtf8.errors.length);
  const temp = await mkdtemp("./parser-synthetic-");
  try {
    const input = join(temp, "truncated.log"), output = join(temp, "diagnostic");
    await writeFile(input, [...complete, ...partial].join("\n"));
    const result = spawnSync(process.execPath, ["parse-hosted-log.mjs", "--log", input, "--output", output, "--mode", "diagnostic"], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    const manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
    assert.equal(manifest.status, "diagnostic"); assert.equal(manifest.incomplete[0].verified, false);
    assert.ok((await readFile(join(output, manifest.incomplete[0].savedAs), "utf8")).length > 0);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

