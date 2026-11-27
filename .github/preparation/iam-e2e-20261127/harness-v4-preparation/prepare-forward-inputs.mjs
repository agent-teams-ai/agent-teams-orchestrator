// Local, prerequisite-gated preparation only. No network, Git, package installation,
// lifecycle command, publication, or qualification is performed by this builder.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TARGET = "docs-2026-11-27-orchestrator-v4";
const MAIN = "3dccf2c53bf11f3939a19734a58f5e64d96673d0";
const MAIN_TREE = "a92524845b6d7915e37b61ef40b72bd71634d193";
const MAIN_LOCK = "sha256:5b411a3b054017041ad9ebb5f4d42eb9d5c39ceddb7242885831ee7bca80df13";
const MAIN_LOCK_BLOB = "18c3a6cc736795cffcb24595eb30d3630837dcce";
const FROM = "docs-2026-10-03-stable31";
const OWNER = { name: "Илия", email: "iliyazelenkog@gmail.com" };
const BASE = resolve(dirname(fileURLToPath(import.meta.url)), "../retargeted-orchestrator-v2-20261127/hosted-fallback");
const PREIMAGES = {
  "orchestrator-managed-lifecycle.sh": "959c15e33d6cbbc81072de1b0bebaac2a912745e",
  "orchestrator-managed-lifecycle.yml": "ea36a7475e87da522ef389e4774d4d92e4809a57",
  "parse-hosted-log.mjs": "10022cf1d6adc7efa11c40dbaf268eb72508beba",
  "parse-hosted-log.test.mjs": "a0c97f3fc81aeb00274dff9176951ff757fe236d",
};
const PACKAGES = [
  ["repositoryMutation", "repository-mutation", "0.5.2", "transitive"],
  ["documentAuthoring", "document-authoring", "0.3.9", "transitive"],
  ["docsProtocol", "docs-protocol", "0.6.9", "direct"],
  ["docsProtocolAgentTeams", "docs-protocol-agent-teams", "0.8.0", "direct"],
  ["engineeringFoundation", "engineering-foundation", "4.0.3", "direct"],
];
const SHA = /^(?!0{40}$)[0-9a-f]{40}$/;
const DIGEST = /^sha256:(?!0{64}$)[0-9a-f]{64}$/;
const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");
const blob = (b) => createHash("sha1").update("blob " + b.length + "\0").update(b).digest("hex");
const utf8 = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);
const encode = (v) => Buffer.from(JSON.stringify(v, null, 2) + "\n");
const info = (b) => ({ bytes: b.length, sha256: sha(b), gitBlob: blob(b) });
const subset = (v, keys) => Object.fromEntries(keys.map((k) => [k, v[k]]));
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") { assert.ok(Number.isSafeInteger(value)); return JSON.stringify(value); }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  assert.ok(value && typeof value === "object");
  return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}
function authorityDigest(domain, value, excluded) {
  return sha(canonical({ domain, body: Object.fromEntries(Object.entries(value).filter(([k]) => k !== excluded)) }));
}
async function stableRead(path, limit = 32 * 1024 * 1024) {
  assert.ok(typeof path === "string" && isAbsolute(path), "Inputs must have explicit absolute paths");
  assert.equal(await realpath(path), path, "Noncanonical/symlinked input path");
  const before = await lstat(path, { bigint: true });
  assert.ok(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(limit), "Invalid input file");
  const bytes = await readFile(path), after = await lstat(path, { bigint: true });
  for (const k of ["dev", "ino", "size", "mtimeNs", "ctimeNs"]) assert.equal(after[k], before[k], "Input changed while read");
  assert.equal(BigInt(bytes.length), before.size); utf8(bytes);
  return bytes;
}
async function checkedFile(descriptor, label) {
  assert.ok(descriptor && typeof descriptor === "object", "Missing actual file: " + label);
  assert.deepEqual(Object.keys(descriptor).sort(), ["path", "sha256"]);
  assert.match(descriptor.sha256, DIGEST, "Missing actual SHA-256: " + label);
  const bytes = await stableRead(descriptor.path);
  assert.equal(sha(bytes), descriptor.sha256, "Actual input hash mismatch: " + label);
  return { ...info(bytes), path: descriptor.path, data: bytes };
}
const readJson = (file) => JSON.parse(utf8(file.data));
function assertCanonicalRegistry(bytes, registry) {
  assert.ok(bytes.equals(encode(registry)), "Registry must retain exact canonical JSON, with no duplicate keys");
  assert.equal(new Set(registry.cohorts.map((x) => x.cohort_id)).size, registry.cohorts.length);
  for (const row of registry.cohorts) {
    const generation = row.cohort_generation ?? 1;
    assert.ok([1, 2, 3].includes(generation));
    assert.equal(authorityDigest("agent-teams.docs-qualified-cohort/v" + generation, row, "record_digest"), row.record_digest);
  }
  let previous = null;
  for (const [i, event] of registry.events.entries()) {
    assert.equal(event.sequence, i + 1); assert.equal(event.previous_event_digest, previous);
    assert.equal(authorityDigest("agent-teams.docs-qualified-cohort-event/v1", event, "event_digest"), event.event_digest);
    previous = event.event_digest;
  }
}

// The default is the final lifecycle/Host gate. The explicit preparation-only
// purpose breaks the source-admission bootstrap without ever emitting final A/B/C.
export async function readAndValidateInput(metadataPath, { purpose = "final-lifecycle" } = {}) {
  assert.ok(["final-lifecycle", "source-admission"].includes(purpose));
  const metadataBytes = await stableRead(metadataPath, 1024 * 1024), input = JSON.parse(utf8(metadataBytes));
  assert.equal(input.schemaVersion, 1); assert.equal(input.targetCohortId, TARGET);
  for (const v of [input.source?.revision, input.source?.tree, input.authority?.revision]) assert.match(v, SHA);
  const entries = [
    ["sourceLock", input.source.lock], ["branch", input.authority.branch],
    ["registry", input.authority.registry], ["policy", input.authority.policy],
    ["workflow", input.authority.workflow], ["closure", input.closure],
    ["controllerLock", input.installedController?.lock], ["runtimes", input.installedController?.runtimes],
    ["selectedLock", input.selectedLock?.file], ["selectedReport", input.selectedLock?.report],
  ];
  const files = Object.fromEntries(await Promise.all(entries.map(async ([key, descriptor]) => [key, await checkedFile(descriptor, key)])));
  const registry = readJson(files.registry); assertCanonicalRegistry(files.registry.data, registry);
  const matches = registry.cohorts.filter((r) => r.cohort_id === TARGET); assert.equal(matches.length, 1);
  const record = matches[0], events = registry.events.filter((e) => e.cohort_id === TARGET), event = events.at(-1);
  assert.equal(record.cohort_generation, 3); assert.equal(record.channel, "stable");
  assert.equal(record.policy_identity.id, "agent-teams.docs-protocol-current-policy");
  assert.equal(record.policy_identity.version, "3.1.0"); assert.match(record.policy_identity.digest, DIGEST);
  assert.equal(event?.state, "QUALIFIED", "The actual target must be qualified, without an invented CANARY event");
  assert.ok(events.some((e) => e.state === "VERIFIED") && events.some((e) => e.state === "PUBLISHED_UNQUALIFIED"));
  assert.deepEqual(record.canary_repositories, [{ repository_id: 1310245598, repository: "agent-teams-ai/agent-teams-orchestrator" }]);
  assert.deepEqual(record.upgrade_from, [FROM]); assert.deepEqual(record.rollback_to, [FROM]);
  assert.deepEqual(record.runtime.qualification_runtime, { node_version: "26.12.1", pnpm_version: "11.20.0", platform: "linux", architecture: "x64" });
  assert.equal(record.runtime.selected_lane, "node-26-managed-qualified");
  assert.equal(record.runtime.node, ">=26.12.1 <27");
  assert.equal(record.packages.length, 5);
  const packages = {};
  for (const [key, suffix, version, role] of PACKAGES) {
    const found = record.packages.filter((p) => p.name === "@agent-teams/" + suffix); assert.equal(found.length, 1);
    const p = found[0]; assert.equal(p.version, version); assert.equal(p.role, role);
    assert.equal(p.registry, "https://registry.npmjs.org/"); assert.match(p.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
    assert.equal(p.provenance.signature_verified, true);
    packages[key] = subset(p, ["name", "version", "integrity"]);
  }
  const branch = readJson(files.branch);
  assert.equal(branch.name, "main"); assert.equal(branch.protected, true); assert.equal(branch.commit.sha, input.authority.revision);
  const rows = readJson(files.policy).repositories.filter((r) => r.repository_id === 1310245598); assert.equal(rows.length, 1);
  const row = rows[0]; assert.equal(row.desired_cohort_id, TARGET); assert.equal(row.desired_cohort_generation, 3);
  assert.equal(row.cohort_binding_status, "rollout_pending"); assert.equal(row.observed_cohort_id, FROM); assert.equal(row.observed_cohort_generation, 2);
  assert.deepEqual(subset(row.v3_qualification_coordinates, ["profile_schema_version", "cohort_schema_version", "managed_state_schema_version", "receipt_schema_version", "execution_envelope_schema_version"]),
    { profile_schema_version: 4, cohort_schema_version: 3, managed_state_schema_version: 3, receipt_schema_version: 1, execution_envelope_schema_version: 1 });
  const wf = record.reusable_workflow;
  assert.equal(wf.repository, "agent-teams-ai/.github"); assert.equal(wf.repository_id, 1316243981);
  assert.equal(wf.path, ".github/workflows/docs-protocol-check.yml"); assert.match(wf.revision, SHA); assert.equal(files.workflow.gitBlob, wf.blob_sha);
  assert.match(record.assets.caller_workflow.rendered_digest, DIGEST);
  const closure = readJson(files.closure), rc = record.runtime_closure;
  assert.equal(rc.schema_version, 2); assert.equal(rc.domain, "agent-teams.docs-runtime-closure/v2");
  assert.equal(rc.package_manager, "pnpm@11.20.0"); assert.equal(rc.lockfile_version, "9.0");
  assert.equal(files.closure.sha256, rc.digest); assert.equal(closure.domain, rc.domain); assert.equal(closure.schemaVersion, 2);
  assert.equal(closure.packageManager, rc.package_manager); assert.equal(closure.packageCount, rc.package_count);
  assert.equal(closure.pnpmLock.lockfileVersion, "9.0"); assert.equal(Object.keys(closure.pnpmLock.snapshots).length, rc.package_count);
  assert.equal(rc.projection_path, "governance/docs-runtime-closures/sha256-" + rc.digest.slice(7) + ".json");
  assert.deepEqual(closure.coordinates, record.packages.map((p) => subset(p, ["name", "role", "version", "integrity"])));
  assert.deepEqual(closure.managedEdges.map(canonical).sort(), record.dependency_edges.map(canonical).sort());
  const lock = readJson(files.controllerLock), runtimes = readJson(files.runtimes);
  for (const p of [packages.docsProtocolAgentTeams, packages.repositoryMutation]) {
    const installed = lock.packages["node_modules/" + p.name];
    assert.equal(installed.version, p.version); assert.equal(installed.integrity, p.integrity);
  }
  assert.match(runtimes.controllerBuildIdentity, DIGEST); assert.match(runtimes.kernelBuildIdentity, DIGEST);
  for (const [key, version] of [["node24", "24.22.3"], ["node26", "26.12.1"]]) {
    assert.deepEqual(subset(runtimes[key], ["node", "platform", "architecture"]), { node: version, platform: "linux", architecture: "x64" });
    assert.match(runtimes[key].sha256, DIGEST);
  }
  assert.equal(runtimes.corepack.version, "0.36.0");
  const report = readJson(files.selectedReport);
  assert.equal(report.outcome, "constructed-unadmitted"); assert.equal(report.publicAdmission, "not-run");
  assert.equal(report.qualificationAuthority, false); assert.deepEqual(report.collisions, []);
  assert.equal(report.sourceLock.sha256, files.sourceLock.sha256); assert.equal(report.sourceLock.gitBlob, files.sourceLock.gitBlob);
  assert.equal(report.sourceLock.git.revision, input.source.revision); assert.equal(report.sourceLock.git.tree, input.source.tree);
  assert.equal(report.targetClosure.sha256, files.closure.sha256); assert.equal(report.targetClosure.adapterVersion, "0.8.0");
  for (const k of ["sha256", "gitBlob", "bytes"]) assert.equal(report.selectedLock[k], files.selectedLock[k]);
  assert.equal(report.selectedLock.path, files.selectedLock.path);
  let sourceAdmission = null;
  if (input.source.revision === MAIN) {
    assert.equal(input.source.tree, MAIN_TREE); assert.equal(files.sourceLock.sha256, MAIN_LOCK); assert.equal(files.sourceLock.gitBlob, MAIN_LOCK_BLOB);
    assert.equal(input.source.commit, null); assert.equal(input.source.compare, null);
    assert.deepEqual(input.source.admission, { meta: null, stdout: null, preparation: null });
  } else {
    files.sourceCommit = await checkedFile(input.source.commit, "actual one-lock source Git commit");
    files.sourceCompare = await checkedFile(input.source.compare, "actual source compare");
    const commit = readJson(files.sourceCommit), compare = readJson(files.sourceCompare);
    assert.equal(commit.sha, input.source.revision); assert.equal(commit.tree.sha, input.source.tree);
    assert.deepEqual(commit.parents.map((p) => p.sha), [MAIN]);
    for (const key of ["author", "committer"]) assert.deepEqual(subset(commit[key], ["name", "email"]), OWNER);
    assert.equal(compare.base_commit.sha, MAIN); assert.equal(compare.merge_base_commit.sha, MAIN);
    assert.equal(compare.status, "ahead"); assert.equal(compare.ahead_by, 1); assert.equal(compare.behind_by, 0);
    assert.deepEqual(compare.commits.map((c) => c.sha), [input.source.revision]);
    assert.equal(compare.files.length, 1); assert.equal(compare.files[0].filename, "pnpm-lock.yaml");
    assert.equal(compare.files[0].status, "modified"); assert.equal(compare.files[0].sha, files.sourceLock.gitBlob);
    if (purpose === "final-lifecycle" || Object.values(input.source.admission ?? {}).some((v) => v !== null)) {
      for (const key of ["meta", "stdout", "preparation"]) files["admission" + key] = await checkedFile(input.source.admission?.[key], "source admission " + key);
      const meta = readJson(files.admissionmeta), result = readJson(files.admissionstdout), preparation = readJson(files.admissionpreparation);
      assert.equal(meta.exitCode, 0); assert.ok(Array.isArray(meta.argv)); assert.ok(meta.argv.includes("upgrade") && meta.argv.includes("--prepare"));
      const arg = (name) => { assert.equal(meta.argv.filter((x) => x === name).length, 1); return meta.argv[meta.argv.indexOf(name) + 1]; };
      assert.equal(arg("--source-generation"), "2"); assert.equal(arg("--target-generation"), "3"); assert.equal(arg("--to"), TARGET);
      assert.ok(isAbsolute(arg("--target-lockfile")), "Actual source admission must use the explicit selected-lock path");
      assert.equal(arg("--target-lockfile-sha256"), files.selectedLock.sha256);
      assert.equal(result.command, "consumer.upgrade"); assert.equal(result.outcome, "prepared"); assert.deepEqual(result.issues, []);
      assert.equal(result.preparation.digest, files.admissionpreparation.sha256);
      assert.equal(preparation.sourceRevision, input.source.revision); assert.equal(preparation.sourceTree, input.source.tree);
      assert.equal(preparation.controller.buildIdentity, runtimes.controllerBuildIdentity); assert.equal(preparation.kernel.buildIdentity, runtimes.kernelBuildIdentity);
      const lockOperation = preparation.plan.operations.find((op) => op.path === "pnpm-lock.yaml");
      assert.ok(lockOperation); assert.equal(lockOperation.postimage.digest, files.selectedLock.sha256);
      assert.ok(Buffer.from(lockOperation.postimage.contentBase64, "base64").equals(files.selectedLock.data));
      sourceAdmission = { metaSha256: files.admissionmeta.sha256, stdoutSha256: files.admissionstdout.sha256, preparationSha256: files.admissionpreparation.sha256,
        replayable: false, finalPhysicalConsumerQualified: false };
    } else {
      assert.deepEqual(input.source.admission, { meta: null, stdout: null, preparation: null });
    }
  }
  const binding = {
    sourceRevision: input.source.revision, sourceTree: input.source.tree, sourceLockSha256: files.sourceLock.sha256,
    sourceLockGitBlob: files.sourceLock.gitBlob, originalMainRevision: MAIN, sourceAdmission,
    authoritySnapshotRevision: input.authority.revision,
    target: { cohortId: TARGET, recordDigest: record.record_digest, qualificationEventDigest: event.event_digest, candidateDigest: record.candidate_digest,
      policy: record.policy_identity, workflow: { repository: wf.repository, path: wf.path, revision: wf.revision, blobSha: wf.blob_sha },
      callerDigest: record.assets.caller_workflow.rendered_digest,
      closure: { digest: rc.digest, path: rc.projection_path, packageCount: rc.package_count }, packages },
    controller: { version: packages.docsProtocolAgentTeams.version, integrity: packages.docsProtocolAgentTeams.integrity, buildIdentity: runtimes.controllerBuildIdentity },
    kernel: { version: packages.repositoryMutation.version, integrity: packages.repositoryMutation.integrity, buildIdentity: runtimes.kernelBuildIdentity },
    runtime: { node24: "24.22.3", node26: "26.12.1", sourcePin: "26.11.1\n", targetPin: "26.12.1\n", sourcePnpm: "11.18.0", targetPnpm: "11.20.0" },
    selectedLock: { path: files.selectedLock.path, ...info(files.selectedLock.data) },
    selectedLockReportSha256: files.selectedReport.sha256,
  };
  return { binding, record, event, selectedLockBytes: files.selectedLock.data, selectedLockReportBytes: files.selectedReport.data,
    metadata: { path: metadataPath, ...info(metadataBytes) }, files };
}

// New forward-only preparation. The historical reader above validates package,
// authority, closure, source and selected-lock bytes; it executes no public CLI.
export async function prepareForward(metadataPath, expectedDigest, outputPath) {
  assert.match(expectedDigest, DIGEST);
  const metadata = await stableRead(metadataPath, 1024 * 1024);
  assert.equal(sha(metadata), expectedDigest, "Selected input capture changed");
  const input = JSON.parse(utf8(metadata));
  assert.equal(input.scope, "fresh-orchestrator-v4-forward-inputs");
  const validated = await readAndValidateInput(metadataPath, { purpose: "source-admission" });
  assert.equal(sha(await stableRead(metadataPath, 1024 * 1024)), expectedDigest);
  const b = validated.binding;
  assert.equal(b.sourceRevision, "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67");
  assert.equal(b.sourceTree, "a24da96493edd1c6fe3bd5868d4cf636007bcf04");
  assert.equal(b.sourceLockSha256, "sha256:0ebee389b33d6ee41beb3f4a3dd28e20f956c177b17a2911d5a812160ea07044");
  assert.equal(b.sourceLockGitBlob, "596614ef81a97d2b825e06d15086ca36dd20656a");
  assert.equal(b.sourceAdmission, null, "Historical preparation is not a new v4 admission");
  assert.deepEqual(input.source.admission, { meta: null, stdout: null, preparation: null });
  assert.equal(b.target.closure.digest, "sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475");
  assert.equal(b.target.closure.packageCount, 88);
  assert.equal(b.target.policy.digest, "sha256:18db0135d1d6191ef78c1feb243f5dc672aaed9985f52be1a72af4fdd7e9bb4e");
  assert.equal(b.selectedLock.sha256, "sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b");
  assert.equal(b.selectedLock.gitBlob, "5b452244b3d74dd49432e659abd575efca49c4c2");
  assert.equal(b.selectedLockReportSha256, "sha256:4e04cf99c102c94f4289922a0bfb9a710ef6a7b6f578b126cbcaa3e26c716cdf");
  assert.equal(b.controller.buildIdentity, "sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80");
  assert.equal(b.kernel.buildIdentity, "sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1");
  assert.equal(b.target.workflow.blobSha, "714af12998ef140dd55a2ec3057f67775586cfd7");
  const repairedFile = await checkedFile(input.repairedWorkflowCommit, "actual repaired workflow commit");
  const repaired = readJson(repairedFile);
  assert.equal(repaired.sha, b.target.workflow.revision);
  assert.equal(repaired.tree.sha, "31561be538b5dc4b4aa02e53278047d79ff4dbaa");
  assert.deepEqual(repaired.parents.map(p => p.sha), ["d167b2360524474240a43e3ff70e35eb94e109c7"]);
  assert.notEqual(repaired.sha, "611cd2a78d1f9104dbf46bab69c3ff0e30ac6d8f");
  assert.deepEqual(subset(repaired.author, ["name", "email"]), OWNER);
  assert.deepEqual(subset(repaired.committer, ["name", "email"]), { name: "GitHub", email: "noreply@github.com" });
  assert.equal(repaired.verification?.verified, true, "The actual ordinary squash must retain GitHub's verified signature");
  assert.equal(repaired.verification?.reason, "valid");
  const shell = await checkedFile(input.forwardScript, "reviewed forward-only harness");
  assert.equal(shell.sha256, "sha256:78fcfb827870c2cad2b9834354bf12d58b9ca10be976543714fb03e79206a97d");
  const bindingBytes = encode(b);
  const files = [
    [".github/scripts/orchestrator-managed-forward.sh", shell.data],
    [".github/inputs/harness-input-binding.json", bindingBytes],
    [".github/inputs/selected-target-lock.yaml", validated.selectedLockBytes],
    [".github/inputs/selected-target-lock-report.json", validated.selectedLockReportBytes],
    [".github/inputs/target-runtime-closure.json", validated.files.closure.data],
  ];
  const output = resolve(outputPath);
  assert.equal(await realpath(dirname(output)), dirname(output));
  const inputs = [...Object.values(validated.files), repairedFile, shell, { path: metadataPath }];
  for (const file of inputs) assert.ok(file.path !== output && !file.path.startsWith(output + "/"), "Output overlaps an input");
  await mkdir(output); // Exclusive destination; never replace an earlier result.
  for (const [path, data] of files) {
    const dest = join(output, "files", path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, data, { flag: "wx", mode: 0o644 });
  }
  const result = {
    schemaVersion: 1, scope: "fresh-orchestrator-v4-forward-inputs", outcome: "prepared-unexecuted",
    qualificationAuthority: false, publicPrepareExecuted: false, finalPhysicalConsumerQualified: false,
    historicalProofReplayed: false, target: b.target, authoritySnapshotRevision: b.authoritySnapshotRevision,
    bindingSha256: sha(bindingBytes), input: info(metadata),
    repairedWorkflowCommit: subset(repairedFile, ["path", "bytes", "sha256", "gitBlob"]),
    retainedValidator: "sha256:73a2ea40ee9938f3331745ac666da690050fe12f1ee124c176c81c232f47ee73",
    files: files.map(([path, data]) => ({ path, ...info(data) })),
  };
  await writeFile(join(output, "preparation-manifest.json"), encode(result), { flag: "wx", mode: 0o644 });
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5, "Usage: prepare-forward-inputs.mjs /absolute/input.json sha256:<input-hash> /absolute/new-output");
  console.log(JSON.stringify(await prepareForward(process.argv[2], process.argv[3], process.argv[4])));
}

