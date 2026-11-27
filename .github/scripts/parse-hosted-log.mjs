#!/usr/bin/env node
// Local transport verification only. This parser grants no lifecycle or admission authority.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LIMITS = { log: 32 * 1024 * 1024, file: 1024 * 1024, total: 16 * 1024 * 1024, groups: 256, chunks: 1024 };
const SOURCE = "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67";
export const EXPECTED_BINDING = {"sourceRevision":"ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67","sourceTree":"a24da96493edd1c6fe3bd5868d4cf636007bcf04","sourceLockSha256":"sha256:0ebee389b33d6ee41beb3f4a3dd28e20f956c177b17a2911d5a812160ea07044","sourceLockGitBlob":"596614ef81a97d2b825e06d15086ca36dd20656a","originalMainRevision":"3dccf2c53bf11f3939a19734a58f5e64d96673d0","sourceAdmission":{"metaSha256":"sha256:94296a4fcdec10ce7e4eb054edb8341a54478a695a4df930d1e138f9bb1dd1a5","stdoutSha256":"sha256:75d35e87cbc93c3016584bb8a19f73a422488932447e9fb486ad034a2d178977","preparationSha256":"sha256:b7849c93c324c184c2aaccfc9c86a98e1a2a62c5957e4fabb75b6c09f247cae7","replayable":false,"finalPhysicalConsumerQualified":false},"authoritySnapshotRevision":"d167b2360524474240a43e3ff70e35eb94e109c7","target":{"cohortId":"docs-2026-11-27-orchestrator-v3","recordDigest":"sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c","qualificationEventDigest":"sha256:4451ea715ef68048c01e182fe4755acc4639d7d2e106e536e2b240834e7084c0","policy":{"id":"agent-teams.docs-protocol-current-policy","version":"3.1.0","digest":"sha256:18db0135d1d6191ef78c1feb243f5dc672aaed9985f52be1a72af4fdd7e9bb4e"},"workflow":{"repository":"agent-teams-ai/.github","path":".github/workflows/docs-protocol-check.yml","revision":"997f24396598f93cf1b03bb26436a5ec7686ddef","blobSha":"714af12998ef140dd55a2ec3057f67775586cfd7"},"callerDigest":"sha256:2ce33590e2d5d36a14bcdf3f16e6ca5422c4b3ebe300f3ac4d94343cc022e1ac","closure":{"digest":"sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475","path":"governance/docs-runtime-closures/sha256-7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475.json","packageCount":88},"packages":{"repositoryMutation":{"name":"@agent-teams/repository-mutation","version":"0.5.2","integrity":"sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg=="},"documentAuthoring":{"name":"@agent-teams/document-authoring","version":"0.3.9","integrity":"sha512-a6SOuytNOoKJVW+pp51AUMhrjzTvbYvro6nUuAFqmu0l0G63xkSAnhpwlaPJbHSbSBvoIawm8z+nL8OVMFIY3A=="},"docsProtocol":{"name":"@agent-teams/docs-protocol","version":"0.6.9","integrity":"sha512-rZ7Ie43dmN+m8LjCdXt5iqOP5h41M/TWNFg7bwvV05/XuSJrJF4udBLXIReqqVfeqdoYrFNxPbTknKJ30N6aTA=="},"docsProtocolAgentTeams":{"name":"@agent-teams/docs-protocol-agent-teams","version":"0.8.0","integrity":"sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg=="},"engineeringFoundation":{"name":"@agent-teams/engineering-foundation","version":"4.0.3","integrity":"sha512-D/q979O6OOhsS3IpkwKwb1wNDcXcJESKbYATz7Gk8biiXYxC2tIGi5S9er/DQDbghOnzrilipKxvTMJZ1GGolg=="}}},"controller":{"version":"0.8.0","integrity":"sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg==","buildIdentity":"sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80"},"kernel":{"version":"0.5.2","integrity":"sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg==","buildIdentity":"sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1"},"runtime":{"node24":"24.22.3","node26":"26.12.1","sourcePin":"26.11.1\n","targetPin":"26.12.1\n","sourcePnpm":"11.18.0","targetPnpm":"11.20.0"},"selectedLock":{"path":"/workspace/scratch/e36de90adcfd/iam-e2e-resume-20261127/selected-lock-v3-preparation/actual-7957/selected-target/selected-target-lock.yaml","bytes":320228,"sha256":"sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b","gitBlob":"5b452244b3d74dd49432e659abd575efca49c4c2"},"selectedLockReportSha256":"sha256:4e04cf99c102c94f4289922a0bfb9a710ef6a7b6f578b126cbcaa3e26c716cdf"};
export const INPUT_BINDING_BYTES = Buffer.from(JSON.stringify(EXPECTED_BINDING, null, 2) + "\n");
const PARENT = "c01efb6813f0c048497caeefbb8235cead480cb2";
const FULL_ASSETS = [".github/workflows/docs-protocol.yml", ".node-version", "architecture/foundation/docs-consumer-integration.json", "architecture/foundation/docs-protocol-managed-state.json"];
const ASSETS = [".github/workflows/docs-protocol.yml", ".node-version", "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"].sort();
const META_KEYS = ["path", "bytes", "sha256", "gitBlob", "mode"];
const sha = (bytes) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const blob = (bytes) => createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
const utf8 = (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const descriptor = (value) => Object.fromEntries(META_KEYS.map((key) => [key, value[key]]));
const keyOf = (namespace, path) => namespace + "/" + path;
function exactKeys(value, keys) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), "Frame must be an object");
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), "Unexpected or missing frame fields");
}
export function safeRelative(path) {
  assert.ok(typeof path === "string" && path.length > 0 && path.length <= 512, "Invalid path length");
  assert.match(path, /^[A-Za-z0-9._/-]+$/, "Path contains unsupported or unsafe characters");
  assert.ok(path.split("/").every((part) => part && part !== "." && part !== ".." && part.toLowerCase() !== ".git"),
    "Absolute, traversing, empty, or Git-internal path");
  return path;
}
function validateDescriptor(value) {
  safeRelative(value.path);
  assert.ok(Number.isSafeInteger(value.bytes) && value.bytes >= 0 && value.bytes <= LIMITS.file, "Invalid file byte count");
  assert.match(value.sha256, /^sha256:[0-9a-f]{64}$/);
  assert.match(value.gitBlob, /^[0-9a-f]{40}$/);
  assert.ok(value.mode === "100644" || value.mode === "100755", "Unsupported file mode");
}
function namespaceFor(prefix, kind) {
  if (prefix === "E2E") {
    assert.ok(kind === "managed-asset" || kind === "evidence", "Unknown E2E kind");
    return kind === "managed-asset" ? "e2e-managed" : "e2e-evidence";
  }
  return { HOST: "host-candidate", HOST_EVIDENCE: "host-evidence", HOST_FAILURE: "host-failure" }[prefix];
}
function frameJson(body) {
  assert.ok(typeof body === "string" && Buffer.byteLength(body) <= 24_576, "Missing or oversized frame JSON");
  const value = JSON.parse(body);
  // Both current producers emit compact JSON. This also rejects duplicate keys,
  // alternate encodings, unsafe numeric spellings, and accidentally copied echo text.
  assert.equal(JSON.stringify(value), body, "Noncanonical frame JSON");
  return value;
}
function decodeBase64(value) {
  assert.ok(typeof value === "string" && value.length > 0 && value.length <= 16_384 && value.length % 4 === 0,
    "Invalid base64 chunk length");
  assert.match(value, /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
  const bytes = Buffer.from(value, "base64");
  assert.equal(bytes.toString("base64"), value, "Noncanonical base64");
  return bytes;
}
function successBinding(files, hostResult, expected) {
  const map = new Map(files.map((file) => [keyOf(file.namespace, file.path), file]));
  const get = (namespace, path) => {
    const file = map.get(keyOf(namespace, path));
    assert.ok(file, "Required completed transport missing: " + namespace + "/" + path);
    return file;
  };
  const read = (namespace, path) => JSON.parse(utf8(get(namespace, path).data));
  assert.ok(hostResult, "Missing final HOST_RESULT");
  assert.ok(!files.some((file) => file.namespace === "host-failure"), "Failure diagnostics present in success mode");
  const physicalFile = get("e2e-evidence", "summary.json"), physical = JSON.parse(utf8(physicalFile.data));
  assert.equal(physical.schemaVersion, 1);
  assert.equal(physical.scope, "physical-managed-lifecycle");
  assert.equal(physical.outcome, "passed");
  assert.equal(physical.source.revision, SOURCE);
  assert.equal(physical.source.tree, EXPECTED_BINDING.sourceTree);
  assert.equal(physical.originalMainRevision, EXPECTED_BINDING.originalMainRevision);
  const inputBinding = get("e2e-evidence", "harness-input-binding.json");
  assert.equal(inputBinding.sha256, "sha256:b8e476f1713a623526c3e9560966761c873f7ac601c1753a4d49e6d5a91bcfdb");
  assert.ok(inputBinding.data.equals(INPUT_BINDING_BYTES));
  assert.equal(physical.harnessInputBindingSha256, inputBinding.sha256);
  const selected = get("e2e-evidence", "selected-target-lock.yaml");
  for (const key of ["bytes", "sha256", "gitBlob"]) assert.equal(selected[key], EXPECTED_BINDING.selectedLock[key]);
  const observed = read("e2e-evidence", "selected-lock-observation.json");
  assert.deepEqual(physical.selectedTargetLock, observed);
  assert.equal(observed.qualificationAuthority, false);
  for (const key of ["bytes", "sha256", "gitBlob"]) assert.equal(observed[key], selected[key]);
  assert.equal(observed.sourceRevision, SOURCE); assert.equal(observed.sourceTree, EXPECTED_BINDING.sourceTree);
  assert.equal(observed.sourceLockSha256, EXPECTED_BINDING.sourceLockSha256);
  assert.equal(observed.closureDigest, EXPECTED_BINDING.target.closure.digest);
  assert.equal(observed.harnessInputBindingSha256, inputBinding.sha256);
  const runtimes = read("e2e-evidence", "runtimes.json");
  assert.deepEqual(physical.runtimes, runtimes);
  assert.equal(runtimes.node24.node, "24.22.3"); assert.equal(runtimes.node26.node, "26.12.1");
  assert.equal(runtimes.controllerBuildIdentity, EXPECTED_BINDING.controller.buildIdentity);
  assert.equal(runtimes.kernelBuildIdentity, EXPECTED_BINDING.kernel.buildIdentity);
  assert.ok(get("e2e-managed", ".node-version").data.equals(Buffer.from("26.12.1\n")));
  assert.ok(get("e2e-managed", "pnpm-lock.yaml").data.equals(selected.data));
  assert.equal(physical.run.repository, "agent-teams-ai/agent-teams-orchestrator");
  assert.match(String(physical.run.runId), /^[1-9][0-9]*$/);
  assert.match(String(physical.run.runAttempt), /^[1-9][0-9]*$/);
  if (expected.runId) assert.equal(String(physical.run.runId), expected.runId);
  if (expected.attempt) assert.equal(String(physical.run.runAttempt), expected.attempt);
  const assets = read("e2e-evidence", "managed-assets-manifest.json");
  assert.deepEqual(assets.map((x) => x.path).sort(), ASSETS);
  assert.deepEqual(physical.assets, assets);
  assert.equal(files.filter((file) => file.namespace === "e2e-managed").length, ASSETS.length);
  for (const item of assets) assert.deepEqual(descriptor(get("e2e-managed", item.path)), item);
  const resultFile = get("host-evidence", "integration-run.json"), result = JSON.parse(utf8(resultFile.data));
  const summary = hostResult.value;
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.scope, "derived-host-integration");
  assert.equal(summary.outcome, "passed");
  assert.equal(summary.parentCommit, PARENT);
  assert.equal(summary.physicalSourceRevision, SOURCE);
  assert.deepEqual(summary.detail, descriptor(resultFile));
  assert.ok(hostResult.line > resultFile.endLine && resultFile.startLine > physicalFile.endLine, "Final result order invalid");
  for (const name of ["schemaVersion", "scope", "outcome", "parentCommit", "physicalSourceRevision"])
    assert.deepEqual(result[name], summary[name], "HOST_RESULT/detail mismatch: " + name);
  for (const name of ["candidateCommitCreated", "finalPublishedHeadQualified", "node24CompatibilityQualified", "productionIAMLifecycleQualified"]) {
    assert.equal(summary[name], false);
    assert.equal(result[name], false);
  }
  assert.deepEqual(result.physicalTargetFiles, assets);
  assert.equal(result.managedCheck.outcome, "current");
  assert.deepEqual(result.managedCheck.issues, []);
  const candidate = files.filter((file) => file.namespace === "host-candidate");
  assert.equal(result.files.length, candidate.length);
  assert.equal(new Set(result.files.map((x) => x.path)).size, result.files.length);
  for (const item of result.files) assert.deepEqual(descriptor(get("host-candidate", item.path)), item);
  assert.equal(summary.fileCount, candidate.length);
  assert.equal(summary.fileBytes, candidate.reduce((sum, file) => sum + file.bytes, 0));
  for (const path of FULL_ASSETS) {
    assert.deepEqual(descriptor(get("host-candidate", path)), descriptor(get("e2e-managed", path)));
  }
  const manifest = read("host-candidate", "docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json");
  assert.equal(manifest.authority, false);
  assert.equal(manifest.replayable, false);
  assert.deepEqual(manifest.source, physical.source);
  assert.deepEqual(manifest.phases, physical.phases);
  assert.deepEqual(manifest.physicalTargetFiles, assets);
  assert.equal(manifest.authorityRevision, physical.authorityRevision);
  assert.deepEqual(manifest.selectedTargetLock, physical.selectedTargetLock);
  assert.equal(manifest.harnessInputBindingSha256, physical.harnessInputBindingSha256);
  for (const name of ["repository", "runId", "runAttempt"]) assert.deepEqual(manifest.run[name], physical.run[name]);
  return { physicalRun: physical.run, sourceRevision: SOURCE, parentCommit: PARENT,
    integrationResultSha256: resultFile.sha256, candidateFiles: candidate.length, candidateBytes: summary.fileBytes };
}
export function parseHostedLog(text, { mode = "success", runId, attempt } = {}) {
  assert.ok(mode === "success" || mode === "diagnostic", "Mode must be success or diagnostic");
  assert.ok(Buffer.byteLength(text) <= LIMITS.log, "Log exceeds 32 MiB");
  const files = [], incomplete = [], errors = [], seen = new Set();
  let active, hostResult, bytes = 0, frames = 0;
  const abandon = (reason, line) => {
    if (!active) return;
    incomplete.push({ namespace: active.namespace, ...descriptor(active),
      startLine: active.startLine, lastLine: line, expectedChunks: active.chunks, receivedChunks: active.parts.length,
      receivedBytes: active.receivedBytes, reason, base64: active.parts.join(""), verified: false });
    active = undefined;
  };
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = index + 1;
    const raw = lines[index].replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z /, "");
    if (!raw.startsWith("ORCHESTRATOR_")) continue;
    try {
      if (raw.startsWith("ORCHESTRATOR_HOST_RESULT ")) {
        assert.ok(!active && !hostResult, "Duplicate or interleaved HOST_RESULT");
        hostResult = { line, value: frameJson(raw.slice("ORCHESTRATOR_HOST_RESULT ".length)) };
        frames++;
        continue;
      }
      const match = /^ORCHESTRATOR_(E2E|HOST_EVIDENCE|HOST_FAILURE|HOST)_(FILE|CHUNK|END) (.+)$/.exec(raw);
      assert.ok(match, "Unknown or truncated transport marker");
      const [, prefix, type, body] = match, value = frameJson(body);
      const namespace = namespaceFor(prefix, value.kind), keys = prefix === "E2E" ? ["kind"] : [];
      safeRelative(value.path);
      frames++;
      if (type === "FILE") {
        exactKeys(value, [...META_KEYS, "chunks", ...keys]);
        validateDescriptor(value);
        assert.ok(Number.isSafeInteger(value.chunks) && value.chunks >= 0 && value.chunks <= LIMITS.chunks);
        assert.equal(value.bytes === 0, value.chunks === 0, "Empty-file/chunk-count mismatch");
        if (active) {
          errors.push({ line, message: "A new FILE interrupted an unfinished group" });
          abandon("Interrupted by new FILE", line);
        }
        const key = keyOf(namespace, value.path);
        assert.ok(!seen.has(key), "Duplicate FILE group: " + key);
        assert.ok(![...seen].some((other) => other.startsWith(key + "/") || key.startsWith(other + "/")), "File/directory path collision");
        assert.ok(seen.size < LIMITS.groups, "Too many FILE groups");
        seen.add(key);
        active = { ...value, namespace, startLine: line, parts: [], receivedBytes: 0 };
      } else {
        exactKeys(value, type === "CHUNK" ? ["path", "index", "total", "base64", ...keys] : ["path", "sha256", ...keys]);
        assert.ok(active && active.namespace === namespace && active.path === value.path, "Orphan or interleaved group frame");
        if (type === "CHUNK") {
          assert.equal(value.index, active.parts.length, "Out-of-order or duplicate CHUNK");
          assert.equal(value.total, active.chunks, "Chunk-total mismatch");
          assert.ok(value.index < active.chunks);
          const decoded = decodeBase64(value.base64);
          assert.ok(value.index === active.chunks - 1 || !value.base64.includes("="), "Padding before final chunk");
          const receivedBytes = active.receivedBytes + decoded.length;
          assert.ok(receivedBytes <= active.bytes, "Chunk data exceeds declared bytes");
          active.receivedBytes = receivedBytes;
          active.parts.push(value.base64);
        } else {
          assert.equal(active.parts.length, active.chunks, "Premature END");
          assert.equal(value.sha256, active.sha256, "END digest mismatch");
          const data = Buffer.from(active.parts.join(""), "base64");
          assert.equal(data.length, active.bytes, "File byte count mismatch");
          assert.equal(sha(data), active.sha256, "File SHA-256 mismatch");
          assert.equal(blob(data), active.gitBlob, "Git blob mismatch");
          utf8(data);
          bytes += data.length;
          assert.ok(bytes <= LIMITS.total, "Decoded total exceeds 16 MiB");
          files.push({ namespace, ...descriptor(active), startLine: active.startLine, endLine: line, data });
          active = undefined;
        }
      }
    } catch (error) {
      errors.push({ line, message: error.message.slice(0, 1000) });
      abandon("Rejected group: " + error.message.slice(0, 200), line);
      if (errors.length >= 64) break;
    }
  }
  if (active) {
    errors.push({ line: lines.length, message: "Log ended with an unfinished FILE group" });
    abandon("Truncated log or missing END", lines.length);
  }
  let binding = null;
  if (mode === "success" && errors.length === 0) {
    try { binding = successBinding(files, hostResult, { runId, attempt }); }
    catch (error) { errors.push({ line: hostResult?.line ?? lines.length, message: error.message.slice(0, 1000) }); }
  }
  return { schemaVersion: 1, purpose: "local-log-transport-verification", qualificationAuthority: false,
    mode, status: mode === "success" ? (binding && errors.length === 0 ? "verified-complete" : "rejected") : "diagnostic",
    frames, lineCount: lines.length, files, incomplete, errors, binding,
    hostedJobConclusionVerified: false };
}
async function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    assert.ok(["--log", "--output", "--mode", "--run-id", "--attempt"].includes(key) && !Object.hasOwn(args, key) && process.argv[i + 1],
      "Usage: parse-hosted-log.mjs --log FILE --output FRESH_DIR --mode success|diagnostic [--run-id ID --attempt N]");
    args[key] = process.argv[i + 1];
  }
  assert.ok(args["--log"] && args["--output"] && args["--mode"], "Explicit log, fresh output directory and mode are required");
  const input = await realpath(args["--log"]);
  const before = await stat(input);
  assert.ok(before.isFile() && before.size <= LIMITS.log, "Invalid or oversized log file");
  const raw = await readFile(input);
  assert.equal(raw.length, before.size, "Input log changed while reading");
  const parsed = parseHostedLog(utf8(raw), { mode: args["--mode"], runId: args["--run-id"], attempt: args["--attempt"] });
  const requested = resolve(args["--output"]), output = join(await realpath(dirname(requested)), basename(requested));
  await mkdir(output, { mode: 0o700 }); // Exclusive: existing directories and symlinks fail.
  const saved = [];
  for (const file of parsed.files) {
    const path = file.namespace + "/" + safeRelative(file.path), destination = join(output, path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, file.data, { flag: "wx", mode: file.mode === "100755" ? 0o755 : 0o644 });
    await chmod(destination, file.mode === "100755" ? 0o755 : 0o644);
    saved.push({ namespace: file.namespace, ...descriptor(file), savedAs: path, startLine: file.startLine, endLine: file.endLine });
  }
  const partial = [];
  for (const [index, item] of parsed.incomplete.entries()) {
    const path = "_incomplete/" + String(index + 1).padStart(3, "0") + ".unverified.base64.txt";
    await mkdir(join(output, "_incomplete"), { recursive: true, mode: 0o700 });
    await writeFile(join(output, path), item.base64 + "\n", { flag: "wx", mode: 0o600 });
    const { base64, ...metadata } = item;
    partial.push({ ...metadata, savedAs: path });
  }
  const manifest = { ...parsed, input: { path: input, bytes: raw.length, sha256: sha(raw) }, output, files: saved, incomplete: partial };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(join(output, "manifest.json"), manifestBytes, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ status: parsed.status, files: saved.length, incomplete: partial.length, errors: parsed.errors.length,
    qualificationAuthority: false, output, manifestSha256: sha(manifestBytes) }));
  process.exitCode = parsed.mode === "success" ? (parsed.status === "verified-complete" ? 0 : 1) : (parsed.errors.length ? 2 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => { console.error("Hosted log parser: " + error.message); process.exitCode = 1; });
}

