import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, createReadStream, openSync } from "node:fs";
import { chmod, lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Disposable owner reconciliation. Live forward proofs and the old artifact are inputs.
const BASE = "c01efb6813f0c048497caeefbb8235cead480cb2";
const SOURCE = "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67";
const SOURCE_TREE = "a24da96493edd1c6fe3bd5868d4cf636007bcf04";
const ORIGINAL_MAIN = "3dccf2c53bf11f3939a19734a58f5e64d96673d0";
const OLD_COHORT = "docs-2026-11-27-orchestrator-v3";
const NEW_COHORT = "docs-2026-11-27-orchestrator-v4";
const FROM = "docs-2026-10-03-stable31";
const OLD_RECORD = "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c";
const CLOSURE = "sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475";
const SELECTED_LOCK = "sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b";
const HOST_LOCK = "sha256:4ad19563e9694e5d1cf6d65c2c81141cc38f1661b655b79b765da8c2ee6789ff";
const CONTROLLER = "sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80";
const KERNEL = "sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1";
const OLD_EVIDENCE = "docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27";
const NEW_EVIDENCE = "docs/research/evidence/managed-docs-orchestrator-v4-2026-11-27";
const REPOSITORY = "agent-teams-ai/agent-teams-orchestrator";
const ASSETS = [".github/workflows/docs-protocol.yml", ".node-version",
  "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
const IDENTITY_ASSETS = [ASSETS[0], ASSETS[2], ASSETS[3]].map((value) => {
  assert.ok(value); return value;
});
const RETAINED_ASSETS = [".node-version", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
const HOST_PATHS = [".github/workflows/architecture.yml", ".github/workflows/docs.yml",
  ".github/workflows/od035-native-research.yml", ".github/workflows/reviewrouter-interaction.yml",
  "AGENTS.md", "docs/architecture/repository-tooling.md", "docs/architecture/dependency-rules.md",
  "docs/architecture/feature-module-standard.md", "docs/architecture/security-architecture.md",
  "docs/open-decisions/OD-020-architecture-conformance-tooling.md",
  "docs/open-decisions/OD-035-local-durable-workflow-engine.md",
  "docs/research/orchestrator-full-foundation-review-2026-11-26.md",
  "scripts/architecture/quality-source-coverage.test.mjs", "scripts/docs/docs-protocol-profile.test.mjs",
  "scripts/security/validate-reviewrouter-workflow.mjs"];
const SUCCESSOR_DELTA = [...IDENTITY_ASSETS, "scripts/architecture/quality-source-coverage.test.mjs",
  "AGENTS.md", "docs/architecture/repository-tooling.md",
  "docs/open-decisions/OD-020-architecture-conformance-tooling.md",
  "docs/research/orchestrator-full-foundation-review-2026-11-26.md"];
const OLD_LABELS = ["A-prepare", "A-fault", "A-resume", "A-restore", "B-prepare",
  "B-finalize", "B-committed-restore", "C-prepare", "C-finalize"];
const LABELS = ["successor-prepare", "successor-finalize", "successor-check"];
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const GIT_SHA = /^(?!0{40}$)[a-f0-9]{40}$/;
const IMMUTABLE = {
  "architecture/foundation/required-quality-tests.json": "a26ff983529afb2b492706253293664df596705bdaae7882aa6b030c16905f35",
  "docs/open-decisions/OD-012-identity-authorization-tenant-isolation.md": "ed6bc32d61f9a5d95345857b313d8d46286f792fd67d8d99c8b905c08e5f867c",
  "docs/domain/contexts/access-control/README.md": "038b9bba4c34da01aaef74fbc4770046c2776523d66211f9fa774ede227e138a",
  "docs/domain/contexts/identity-registry/README.md": "d905dd0f1613bdf3d092eaaa88f7073f4f27a9f248d7a6f95689189efb399080",
  "docs/open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md": "e298454b6261eb1abbdbac26ad88ee4e957810d4358f63b8eca540cc76f1785a",
  "docs/decisions/0118-full-foundation-capability-adoption.md": "f0be0522db7ac6a13f6f5590d3a424837aecff00ff48cb999dfcf3e3888b4d66",
};
type Json = Record<string, unknown>;
type Ref = { path: string; bytes: number; sha256: string };
type Image = Ref & { gitBlob: string; mode: string };
type Roots = { candidate: string; target: string; output: string; legacyExport: string;
  legacyEvidence: string; evidence: string; controller: string };
type Runtime = { node24: string; node26: string; corepack: string; cli: string; observed: Json };
type Legacy = { result: Json; summary: Json; files: Image[]; assets: Image[]; profile: Json;
  manifest: Json; physicalArtifact: Json; hostExportArtifact: Json };
type Forward = { observation: Json; preparation: Json; completion: Json; companion: Json;
  assets: Image[]; files: Image[]; outputs: Map<string, Json>; record: Json; event: Json };
const sha = (bytes: Uint8Array) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const blob = (bytes: Uint8Array) => createHash("sha1")
  .update("blob " + bytes.length + "\0").update(bytes).digest("hex");
function object(value: unknown, label = "object"): Json {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), label);
  return value as Json;
}
function string(value: unknown, label = "string"): string {
  assert.ok(typeof value === "string" && value.length > 0 && !value.includes("\0"), label);
  return value;
}
function array(value: unknown, label = "array"): unknown[] {
  assert.ok(Array.isArray(value), label); return value;
}
function integer(value: unknown): number {
  assert.ok(typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
  return value;
}
function keys(value: Json, expected: string[]): void {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
}
function reference(value: unknown): Ref {
  const item = object(value); keys(item, ["path", "bytes", "sha256"]);
  const result = { path: string(item.path), bytes: integer(item.bytes), sha256: string(item.sha256) };
  assert.ok(isAbsolute(result.path)); assert.match(result.sha256, DIGEST);
  return result;
}
function image(value: unknown): Image {
  const item = object(value); keys(item, ["path", "bytes", "sha256", "gitBlob", "mode"]);
  const result = { path: string(item.path), bytes: integer(item.bytes), sha256: string(item.sha256),
    gitBlob: string(item.gitBlob), mode: string(item.mode) };
  assert.match(result.sha256, DIGEST); assert.match(result.gitBlob, GIT_SHA);
  assert.ok(["100600", "100644", "100755"].includes(result.mode)); safePath(result.path);
  return result;
}
function safePath(path: string): void {
  assert.ok(!isAbsolute(path) && !path.includes("\\") &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== ".."), path);
}
function within(parent: string, child: string): boolean {
  const value = relative(parent, child);
  return value === "" || (!isAbsolute(value) && value !== ".." && !value.startsWith(".." + sep));
}
function disjoint(left: string, right: string): void {
  assert.ok(!within(left, right) && !within(right, left), "Overlapping selected roots");
}
function sensitive(text: string): boolean {
  return /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|https?:\/\/[^/\s]+:[^/\s]+@|Authorization:\s*(?:Bearer|Basic)\s+\S+|_authToken\s*[=:]\s*\S+)/i.test(text);
}
function describe(path: string, bytes: Buffer, mode = "100644"): Image {
  return { path, bytes: bytes.length, sha256: sha(bytes), gitBlob: blob(bytes), mode };
}
async function file(path: string, limit = 16_777_216): Promise<{ bytes: Buffer; mode: string }> {
  assert.equal(await realpath(path), resolve(path), "Selected file must be canonical");
  const stat = await lstat(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= limit);
  const mode = "100" + (stat.mode & 0o777).toString(8).padStart(3, "0");
  assert.ok(["100600", "100644", "100755"].includes(mode));
  const bytes = await readFile(path); assert.equal(bytes.length, stat.size);
  return { bytes, mode };
}
async function checked(value: unknown): Promise<Buffer> {
  const ref = reference(value), actual = await file(ref.path);
  assert.equal(actual.bytes.length, ref.bytes); assert.equal(sha(actual.bytes), ref.sha256);
  return actual.bytes;
}
async function verifyLargeRef(value: unknown): Promise<Ref> {
  const ref = reference(value); assert.equal(await realpath(ref.path), ref.path);
  const stat = await lstat(ref.path); assert.ok(stat.isFile() && !stat.isSymbolicLink());
  assert.equal(stat.size, ref.bytes);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(ref.path)) {
    assert.ok(Buffer.isBuffer(chunk)); hash.update(chunk);
  }
  assert.equal("sha256:" + hash.digest("hex"), ref.sha256); return ref;
}
function parse(bytes: Buffer): Json {
  return object(JSON.parse(bytes.toString("utf8")) as unknown);
}
async function json(path: string): Promise<Json> { return parse((await file(path)).bytes); }
async function readImage(root: string, expected: Image): Promise<Buffer> {
  safePath(expected.path); const actual = await file(join(root, expected.path));
  assert.deepEqual(describe(expected.path, actual.bytes, actual.mode), expected);
  return actual.bytes;
}
async function write(root: string, path: string, bytes: Buffer, mode = "100644"): Promise<void> {
  safePath(path); assert.ok(["100644", "100755"].includes(mode));
  const target = join(root, path); await mkdir(dirname(target), { recursive: true });
  assert.equal(await realpath(dirname(target)), dirname(target));
  try { const existing = await lstat(target); assert.ok(existing.isFile() && !existing.isSymbolicLink()); }
  catch (error) { if (object(error).code !== "ENOENT") throw error; }
  await writeFile(target, bytes); await chmod(target, mode === "100755" ? 0o755 : 0o644);
}
async function writeJson(root: string, path: string, value: unknown): Promise<void> {
  await write(root, path, Buffer.from(JSON.stringify(value, null, 2) + "\n"));
}
function git(root: string, ...argv: string[]): Buffer {
  const result = spawnSync("git", ["--no-replace-objects", "-C", root, ...argv],
    { timeout: 30_000, maxBuffer: 16_777_216 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr?.toString());
  return result.stdout;
}
function textGit(root: string, ...argv: string[]): string { return git(root, ...argv).toString(); }
function commandPaths(labels: string[], stderr = "stderr.txt"): string[] {
  return labels.flatMap((label) => ["meta.json", "stdout.json", stderr].map((suffix) =>
    "commands/" + label + "." + suffix)).sort();
}
function legacyPaths(): string[] {
  return [...ASSETS, ...HOST_PATHS, OLD_EVIDENCE + "/manifest.json",
    ...commandPaths(OLD_LABELS).map((path) => OLD_EVIDENCE + "/" + path)].sort();
}
function forwardPaths(): string[] {
  return [...commandPaths(LABELS, "stderr.log"),
    ...["", ".prepared", ".receipt"].map((suffix) => "proofs/forward/completion.json" + suffix)].sort();
}
function findImage(items: Image[], path: string): Image {
  const selected = items.filter((item) => item.path === path);
  assert.equal(selected.length, 1, path); const result = selected[0]; assert.ok(result); return result;
}
async function roots(input: Json, inputPath: string): Promise<Roots> {
  const legacy = object(input.legacy), forward = object(input.forward), runtime = object(input.runtime);
  const result = { candidate: await realpath(string(input.candidateRoot)),
    target: await realpath(string(forward.targetRoot)), output: resolve(string(input.outputRoot)),
    legacyExport: await realpath(string(legacy.exportRoot)),
    legacyEvidence: await realpath(string(legacy.evidenceRoot)),
    evidence: await realpath(string(forward.evidenceRoot)),
    controller: await realpath(string(runtime.controllerRoot)) };
  assert.equal(await realpath(dirname(result.output)), dirname(result.output));
  for (const left of [result.candidate, result.output]) {
    for (const right of [result.target, result.evidence, result.controller,
      result.legacyExport, result.legacyEvidence, inputPath]) disjoint(left, right);
  }
  disjoint(result.candidate, result.output); disjoint(result.target, result.evidence);
  disjoint(result.target, result.controller); disjoint(result.evidence, result.controller);
  assert.equal(textGit(result.candidate, "rev-parse", "HEAD").trim(), BASE);
  assert.equal(textGit(result.candidate, "status", "--porcelain=v1", "--untracked-files=all"), "");
  assert.equal(textGit(result.target, "rev-parse", "HEAD").trim(), SOURCE);
  assert.equal(textGit(result.target, "rev-parse", "HEAD^{tree}").trim(), SOURCE_TREE);
  await mkdir(result.output, { recursive: false }); return result;
}
async function immutable(candidate: string): Promise<void> {
  for (const [path, digest] of Object.entries(IMMUTABLE)) {
    assert.equal(sha((await file(join(candidate, path))).bytes), "sha256:" + digest, path);
  }
}
async function readLegacy(input: Json, root: Roots): Promise<Legacy> {
  const selected = object(input.legacy), physicalArtifact = object(selected.physicalArtifact);
  const hostExportArtifact = object(selected.hostExportArtifact);
  for (const artifact of [physicalArtifact, hostExportArtifact]) {
    keys(artifact, ["id", "bytes", "sha256", "runId", "runAttempt", "headSha"]);
    for (const key of ["id", "runId", "runAttempt"]) assert.match(string(artifact[key]), /^[1-9][0-9]+$/);
    integer(artifact.bytes); assert.match(string(artifact.sha256), DIGEST);
    assert.match(string(artifact.headSha), GIT_SHA);
  }
  assert.deepEqual(physicalArtifact, { id: "15188626286", bytes: 1_814_712,
    sha256: "sha256:c0007a199de47148c1c3ecf4f333a6ab484aa9a0188cc89e9d88c451f2d37704",
    runId: "45972172068", runAttempt: "1", headSha: "c29a5b3d4dbe4beabfc0e5acc1d026eeedc54a14" });
  assert.notEqual(hostExportArtifact.id, physicalArtifact.id);
  assert.notEqual(hostExportArtifact.runId, physicalArtifact.runId);
  assert.notEqual(hostExportArtifact.headSha, physicalArtifact.headSha);
  for (const [key, expected] of [["integrationRun", join(root.legacyExport, "integration-run.json")],
    ["summary", join(root.legacyEvidence, "summary.json")],
    ["assets", join(root.legacyEvidence, "managed-assets-manifest.json")]]) {
    assert.ok(key && expected); assert.equal(reference(selected[key]).path, expected);
  }
  const result = parse(await checked(selected.integrationRun));
  const summary = parse(await checked(selected.summary));
  const assets = array(JSON.parse((await checked(selected.assets)).toString()) as unknown).map(image);
  const files = array(result.files).map(image);
  assert.equal(result.scope, "derived-host-integration"); assert.equal(result.outcome, "passed");
  assert.equal(result.parentCommit, BASE); assert.equal(result.physicalSourceRevision, SOURCE);
  assert.equal(result.candidateCommitCreated, false); assert.equal(result.finalPublishedHeadQualified, false);
  const hostRun = { repository: REPOSITORY, runId: hostExportArtifact.runId,
    runAttempt: hostExportArtifact.runAttempt, headSha: hostExportArtifact.headSha };
  assert.deepEqual(result.hostRun, hostRun);
  const archiveInput = object(result.archivedPhysicalInput);
  assert.equal(archiveInput.evidenceClass, "verified-archived-physical-target");
  assert.equal(archiveInput.qualificationAuthority, false); assert.equal(archiveInput.replayable, false);
  assert.equal(archiveInput.archiveSha256, physicalArtifact.sha256);
  assert.deepEqual(archiveInput.artifact, { id: physicalArtifact.id,
    bytes: physicalArtifact.bytes, sha256: physicalArtifact.sha256 });
  assert.deepEqual(archiveInput.physicalRun, { repository: REPOSITORY,
    runId: physicalArtifact.runId, runAttempt: physicalArtifact.runAttempt,
    headSha: physicalArtifact.headSha, workflowPath: ".github/workflows/orchestrator-managed-lifecycle.yml" });
  assert.deepEqual(files.map((item) => item.path), legacyPaths()); assert.equal(files.length, 50);
  assert.deepEqual(assets.map((item) => item.path), ASSETS);
  assert.deepEqual(result.physicalTargetFiles, assets);
  assert.equal(summary.scope, "physical-managed-lifecycle"); assert.equal(summary.outcome, "passed");
  assert.equal(object(summary.source).revision, SOURCE); assert.equal(object(summary.source).tree, SOURCE_TREE);
  assert.equal(object(summary.run).repository, REPOSITORY);
  assert.equal(object(summary.run).runId, physicalArtifact.runId);
  assert.equal(object(summary.run).runAttempt, physicalArtifact.runAttempt);
  assert.deepEqual(archiveInput.sourceConsumer, object(summary.source).consumer);
  assert.deepEqual(summary.assets, assets);
  for (const item of files) await readImage(join(root.legacyExport, "files"), item);
  for (const item of assets) await readImage(join(root.legacyEvidence, "managed-assets"), item);
  const profile = await json(join(root.legacyEvidence, "managed-assets", ASSETS[2] ?? ""));
  assert.equal(object(profile.cohort).cohortId, OLD_COHORT);
  assert.equal(object(profile.cohort).recordDigest, OLD_RECORD);
  const manifest = await json(join(root.legacyExport, "files", OLD_EVIDENCE, "manifest.json"));
  assert.equal(manifest.authority, false); assert.equal(manifest.replayable, false);
  assert.equal(object(manifest.run).workflowCommit, physicalArtifact.headSha);
  assert.equal(object(manifest.run).runId, physicalArtifact.runId);
  assert.deepEqual(object(manifest.hostReconciliation).archiveInput, archiveInput);
  for (const [key, value] of Object.entries(hostRun)) {
    assert.equal(object(object(manifest.hostReconciliation).hostRun)[key], value);
  }
  assert.deepEqual(manifest.phases, summary.phases); assert.deepEqual(manifest.physicalTargetFiles, assets);
  await verifyLegacyCommands(root, result, summary);
  assert.equal(findImage(files, "pnpm-lock.yaml").sha256, HOST_LOCK);
  return { result, summary, files, assets, profile, manifest, physicalArtifact, hostExportArtifact };
}
async function verifyLegacyCommands(root: Roots, result: Json, summary: Json): Promise<void> {
  const commands = array(result.commands).map((value) => object(value));
  for (const label of ["frozen-install", "installed-peers", "managed-check", "docs-check", "docs-protocol-check"]) {
    assert.equal(commands.filter((item) => item.label === label).length, 1);
  }
  for (const command of commands) {
    const label = string(command.label); assert.match(label, /^[a-z0-9-]+$/);
    assert.equal(command.exitCode, 0); assert.equal(command.signal, null);
    assert.equal(command.executionError, null);
    assert.deepEqual(await json(join(root.legacyExport, "commands", label + ".meta.json")), command);
    await readImage(join(root.legacyExport, "commands"), image(command.stdout));
    await readImage(join(root.legacyExport, "commands"), image(command.stderr));
  }
  const managedCheck = await json(join(root.legacyExport, "commands/managed-check.stdout.txt"));
  assert.deepEqual(result.managedCheck, managedCheck);
  assert.equal(managedCheck.command, "consumer.check"); assert.equal(managedCheck.outcome, "current");
  assert.deepEqual(managedCheck.issues, []); assert.equal(object(managedCheck.plan).cohortId, OLD_COHORT);
  const phases = object(summary.phases);
  for (const [label, phase, key, outcome] of [
    ["A-resume", "A", "resume", "upgraded"], ["A-restore", "A", "restore", "restored"],
    ["B-finalize", "B", "finalize", "upgraded"], ["B-committed-restore", "B", "committedRestore", "restored"],
    ["C-finalize", "C", "finalize", "upgraded"]]) {
    assert.ok(label && phase && key && outcome);
    const output = await json(join(root.legacyExport, "files", OLD_EVIDENCE, "commands", label + ".stdout.json"));
    assert.deepEqual(output, object(phases[phase])[key]);
    assert.equal(output.outcome, outcome); assert.deepEqual(output.issues, []);
    if (outcome === "upgraded") assert.equal(object(output.receipt).outcome, label === "A-resume" ? "already-satisfied" : "applied");
  }
  assert.equal(object(phases.A).inventoryRestored, true); assert.equal(object(phases.B).inventoryRestored, true);
}
async function readRuntime(input: Json, root: Roots): Promise<Runtime> {
  const selected = object(input.runtime);
  assert.equal(reference(selected.observation).path, join(root.evidence, "runtimes.json"));
  const observed = parse(await checked(selected.observation));
  assert.equal(observed.controllerBuildIdentity, CONTROLLER); assert.equal(observed.kernelBuildIdentity, KERNEL);
  const nodes = new Map<string, Ref>();
  for (const [key, version] of [["node24", "24.22.3"], ["node26", "26.12.1"]]) {
    assert.ok(key && version);
    const item = await verifyLargeRef(selected[key]), observation = object(observed[key]);
    assert.equal(item.path, observation.path); assert.equal(item.sha256, observation.sha256);
    assert.equal(observation.node, version); assert.equal(observation.platform, "linux");
    assert.equal(observation.architecture, "x64"); nodes.set(key, item);
  }
  const corepack = await verifyLargeRef(selected.corepack), cli = await verifyLargeRef(selected.controllerCli);
  assert.equal(corepack.path, object(observed.corepack).entrypoint);
  assert.equal(corepack.sha256, object(observed.corepack).sha256);
  assert.equal(object(observed.corepack).version, "0.36.0");
  assert.equal(cli.path, join(root.controller, "node_modules/@agent-teams/docs-protocol-agent-teams/dist/cli.js"));
  assert.equal(cli.sha256, "sha256:7f4ab8e70738ecd7771fdb45cabc3529a8a563fba7fd75b5fc83019ad644da55");
  assert.ok(within(root.controller, corepack.path));
  const node24 = nodes.get("node24"), node26 = nodes.get("node26");
  assert.ok(node24 && node26); assert.equal(await realpath(process.execPath), node26.path);
  for (const path of [node24.path, node26.path]) {
    disjoint(root.candidate, path); disjoint(root.output, path); disjoint(root.target, path);
  }
  return { node24: node24.path, node26: node26.path, corepack: corepack.path, cli: cli.path, observed };
}
function selectRow(rows: unknown, key: string, expected: string): Json {
  const selected = array(rows).map((value) => object(value))
    .filter((row) => String(row[key]) === expected);
  assert.equal(selected.length, 1, key + "=" + expected);
  const result = selected[0]; assert.ok(result); return result;
}
async function readAuthority(input: Json, observation: Json, target: Json): Promise<{ record: Json; event: Json }> {
  const selected = object(input.authority), registry = parse(await checked(selected.registry));
  const policy = parse(await checked(selected.policy));
  assert.match(string(selected.revision), GIT_SHA);
  assert.equal(selected.revision, observation.authorityRevision);
  assert.equal(selected.cohortId, NEW_COHORT);
  const record = selectRow(registry.cohorts, "cohort_id", NEW_COHORT);
  const old = selectRow(registry.cohorts, "cohort_id", OLD_COHORT);
  assert.equal(old.record_digest, OLD_RECORD); assert.equal(record.cohort_generation, 3);
  assert.match(string(selected.recordDigest), DIGEST);
  assert.equal(record.record_digest, selected.recordDigest); assert.notEqual(record.record_digest, OLD_RECORD);
  assert.equal(target.cohortId, NEW_COHORT); assert.equal(target.recordDigest, record.record_digest);
  assert.equal(target.candidateDigest, record.candidate_digest);
  const events = array(registry.events).map((value) => object(value)).filter((event) => event.cohort_id === NEW_COHORT);
  const event = events.at(-1); assert.ok(event); assert.equal(event.state, "QUALIFIED");
  assert.equal(events.filter((value) => value.state === "QUALIFIED").length, 1);
  assert.equal(event.event_digest, selected.qualificationEventDigest);
  assert.equal(target.qualificationEventDigest, event.event_digest);
  for (const key of ["packages", "dependency_edges", "schemas", "runtime", "runtime_closure",
    "policy_identity", "upgrade_from", "rollback_to", "canary_repositories", "channel"]) {
    assert.deepEqual(record[key], old[key], "Successor tuple changed: " + key);
  }
  assert.deepEqual(record.upgrade_from, [FROM]); assert.deepEqual(record.rollback_to, [FROM]);
  assert.equal(object(record.runtime_closure).digest, CLOSURE);
  const workflow = object(record.reusable_workflow), prior = object(old.reusable_workflow);
  for (const key of ["repository", "repository_id", "path", "blob_sha"]) assert.deepEqual(workflow[key], prior[key]);
  assert.match(string(workflow.revision), GIT_SHA); assert.notEqual(workflow.revision, prior.revision);
  assert.deepEqual(target.workflow, { repository: workflow.repository, path: workflow.path,
    revision: workflow.revision, blobSha: workflow.blob_sha });
  for (const key of ["skill", "asset_catalog", "transition_catalog"]) {
    assert.deepEqual(object(record.assets)[key], object(old.assets)[key]);
  }
  const caller = object(object(record.assets).caller_workflow);
  const oldCaller = object(object(old.assets).caller_workflow);
  for (const key of ["package", "path", "digest"]) assert.deepEqual(caller[key], oldCaller[key]);
  assert.equal(object(target.assets).callerWorkflowDigest, caller.rendered_digest);
  const row = selectRow(policy.repositories, "repository_id", "1310245598");
  assert.equal(row.repository, REPOSITORY); assert.equal(row.cohort_binding_status, "rollout_pending");
  assert.equal(row.desired_cohort_id, NEW_COHORT); assert.equal(row.desired_cohort_generation, 3);
  assert.equal(row.observed_cohort_id, FROM); assert.equal(row.observed_cohort_generation, 2);
  assert.deepEqual(observation.target, { cohortId: NEW_COHORT, recordDigest: record.record_digest,
    qualificationEventDigest: event.event_digest });
  return { record, event };
}
function option(argv: string[], name: string): string {
  assert.equal(argv.filter((value) => value === name).length, 1, name);
  const value = argv[argv.indexOf(name) + 1]; assert.ok(value && !value.startsWith("--"), name); return value;
}
async function forwardCommands(root: Roots, files: Image[], runtime: Runtime, digest: string): Promise<Map<string, Json>> {
  const outputs = new Map<string, Json>(), proof = join(root.evidence, "proofs/forward/completion.json");
  for (const label of LABELS) {
    const meta = parse(await readImage(root.evidence, findImage(files, "commands/" + label + ".meta.json")));
    assert.equal(meta.label, label); assert.equal(meta.exitCode, 0);
    const argv = array(meta.argv).map((value) => string(value));
    assert.equal(option(argv, "--consumer"), root.target);
    const output = parse(await readImage(root.evidence, findImage(files, "commands/" + label + ".stdout.json")));
    assert.deepEqual(output.issues, []);
    if (label === "successor-prepare") {
      const lock = option(argv, "--target-lockfile");
      assert.equal(sha((await file(lock)).bytes), SELECTED_LOCK);
      assert.deepEqual(argv, [runtime.node24, runtime.cli, "upgrade", "--consumer", root.target,
        "--to", NEW_COHORT, "--source-generation", "2", "--target-generation", "3", "--prepare",
        "--restoration-proof", proof, "--target-lockfile", lock, "--target-lockfile-sha256", SELECTED_LOCK, "--json"]);
      assert.equal(output.command, "consumer.upgrade"); assert.equal(output.outcome, "prepared");
      assert.deepEqual(output.preparation, { path: proof + ".prepared", digest });
    } else if (label === "successor-finalize") {
      assert.deepEqual(argv, [runtime.node24, runtime.cli, "finalize", "--consumer", root.target,
        "--from", FROM, "--to", NEW_COHORT, "--source-generation", "2", "--target-generation", "3",
        "--preparation", proof + ".prepared", "--expect", digest, "--proof", proof, "--json"]);
      assert.equal(output.command, "consumer.finalize"); assert.equal(output.outcome, "upgraded");
      assert.equal(object(output.receipt).outcome, "applied");
    } else {
      assert.deepEqual(argv, [runtime.node26, runtime.cli, "check", "--consumer", root.target, "--json"]);
      assert.equal(output.command, "consumer.check"); assert.equal(output.outcome, "current");
      assert.equal(object(output.plan).cohortId, NEW_COHORT);
    }
    outputs.set(label, output);
  }
  return outputs;
}
async function verifyForwardImages(root: Roots, preparation: Json, assets: Image[]): Promise<void> {
  const operations = array(object(preparation.plan).operations).map((value) => object(value));
  assert.deepEqual(operations.map((item) => item.path).sort(), ASSETS);
  assert.deepEqual(textGit(root.target, "diff", "--name-only", "-z", SOURCE).split("\0").filter(Boolean).sort(), ASSETS);
  assert.equal(textGit(root.target, "ls-files", "--others", "--exclude-standard", "-z"), "");
  for (const operation of operations) {
    const path = string(operation.path), postimage = object(operation.postimage);
    const precondition = object(operation.precondition); assert.equal(precondition.state, "known-file");
    const before = array(precondition.acceptedPreimages); assert.equal(before.length, 1);
    const preimage = object(before[0]), source = git(root.target, "show", SOURCE + ":" + path);
    for (const [value, bytes] of [[preimage, source],
      [postimage, await readImage(root.target, findImage(assets, path))]] as const) {
      const encoded = string(value.contentBase64);
      assert.equal(bytes.toString("base64"), encoded); assert.equal(sha(bytes), value.digest);
      assert.equal(bytes.length, value.size);
    }
    const sourceMode = textGit(root.target, "ls-tree", SOURCE, "--", path).split(" ")[0];
    assert.equal(sourceMode, "100" + integer(preimage.mode).toString(8).padStart(3, "0"));
    assert.equal(findImage(assets, path).mode, "100" + integer(postimage.mode).toString(8).padStart(3, "0"));
    await readImage(join(root.evidence, "managed-assets"), findImage(assets, path));
  }
  assert.equal(findImage(assets, "pnpm-lock.yaml").sha256, SELECTED_LOCK);
}
async function readForward(input: Json, root: Roots, legacy: Legacy, runtime: Runtime): Promise<Forward> {
  const selected = object(input.forward);
  assert.equal(reference(selected.observation).path, join(root.evidence, "forward-observation.json"));
  const observation = parse(await checked(selected.observation));
  keys(observation, ["schemaVersion", "scope", "outcome", "qualificationAuthority", "run", "source",
    "authorityRevision", "target", "assets", "files"]);
  assert.equal(observation.schemaVersion, 1); assert.equal(observation.scope, "physical-managed-successor-forward");
  assert.equal(observation.outcome, "passed"); assert.equal(observation.qualificationAuthority, false);
  assert.deepEqual(observation.run, { repository: REPOSITORY, runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT, headSha: process.env.GITHUB_SHA });
  const assets = array(observation.assets).map(image), files = array(observation.files).map(image);
  assert.deepEqual(assets.map((item) => item.path), ASSETS);
  assert.deepEqual(files.map((item) => item.path), forwardPaths());
  for (const item of files) await readImage(root.evidence, item);
  const preparationImage = findImage(files, "proofs/forward/completion.json.prepared");
  const completionImage = findImage(files, "proofs/forward/completion.json");
  const preparation = parse(await readImage(root.evidence, preparationImage));
  const completion = parse(await readImage(root.evidence, completionImage));
  const companion = parse(await readImage(root.evidence, findImage(files, "proofs/forward/completion.json.receipt")));
  assert.equal(preparation.protocol, "agent-teams.managed-generation3-preparation/v1");
  assert.equal(preparation.sourceGeneration, 2); assert.equal(preparation.targetGeneration, 3);
  assert.equal(preparation.sourceRevision, SOURCE); assert.equal(preparation.sourceTree, SOURCE_TREE);
  assert.equal(preparation.initialProofPath, join(root.evidence, "proofs/forward/completion.json"));
  assert.equal(object(preparation.sourceCohort).cohortId, FROM);
  assert.deepEqual(preparation.controller, { name: "@agent-teams/docs-protocol-agent-teams", version: "0.8.0", buildIdentity: CONTROLLER });
  assert.deepEqual(preparation.kernel, { name: "@agent-teams/repository-mutation", version: "0.5.2", buildIdentity: KERNEL });
  assert.deepEqual(preparation.controller, legacy.summary.controller); assert.deepEqual(preparation.kernel, legacy.summary.kernel);
  const consumer = object(preparation.consumer), stat = await lstat(root.target, { bigint: true });
  assert.equal(consumer.root, root.target); assert.equal(consumer.device, String(stat.dev));
  assert.equal(consumer.inode, String(stat.ino)); assert.equal(consumer.birthtimeNs, String(stat.birthtimeNs));
  assert.deepEqual(consumer.repository, { provider: "github", id: "1310245598", nameWithOwner: REPOSITORY });
  assert.deepEqual(observation.source, { revision: SOURCE, tree: SOURCE_TREE, consumer });
  for (const [key, value] of Object.entries(object(runtime.observed.consumerIdentity))) assert.equal(consumer[key], value);
  const target = object(preparation.targetCohort), prior = object(legacy.profile.cohort);
  assert.equal(target.schemaVersion, 3);
  for (const key of ["packages", "runtime", "schemas", "upgradeFrom", "rollbackTo", "channel"]) {
    assert.deepEqual(target[key], prior[key], "Pure managed successor tuple changed: " + key);
  }
  const { record, event } = await readAuthority(input, observation, target);
  const outputs = await forwardCommands(root, files, runtime, preparationImage.sha256);
  const finalized = outputs.get("successor-finalize"); assert.ok(finalized);
  assert.deepEqual(finalized.restoration, { path: join(root.evidence, completionImage.path), digest: completionImage.sha256 });
  assert.equal(object(finalized.receipt).planDigest, object(preparation.plan).planDigest);
  const receiptOperations = array(object(finalized.receipt).operations).map((value) => object(value));
  assert.deepEqual(receiptOperations.map((value) => value.path).sort(), ASSETS);
  assert.ok(receiptOperations.every((value) => value.outcome === "replaced"));
  for (const operation of receiptOperations) {
    assert.equal(operation.resultDigest, findImage(assets, string(operation.path)).sha256);
  }
  assert.deepEqual(completion, { schemaVersion: 1, protocol: "agent-teams.managed-generation3-completion/v1",
    preparationDigest: preparationImage.sha256, receipt: finalized.receipt, activation: "verified-current-v3" });
  assert.deepEqual(companion, { preparationDigest: preparationImage.sha256, receipt: finalized.receipt });
  await verifyForwardImages(root, preparation, assets);
  const profile = await json(join(root.target, "architecture/foundation/docs-consumer-integration.json"));
  const state = await json(join(root.target, "architecture/foundation/docs-protocol-managed-state.json"));
  assert.equal(profile.schemaVersion, 4); assert.deepEqual(profile.cohort, target);
  assert.equal(state.schemaVersion, 3); assert.equal(state.cohortId, NEW_COHORT);
  assert.equal(findImage(assets, ".github/workflows/docs-protocol.yml").sha256, object(target.assets).callerWorkflowDigest);
  for (const path of RETAINED_ASSETS) {
    assert.deepEqual(findImage(assets, path), findImage(legacy.assets, path), "Pure target changed beyond identity: " + path);
  }
  return { observation, preparation, completion, companion, assets, files, outputs, record, event };
}
function frame(prefix: string, path: string, bytes: Buffer, mode = "100644"): void {
  assert.ok(bytes.length <= 1_048_576 && !sensitive(bytes.toString("utf8")));
  const item = describe(path, bytes, mode), encoded = bytes.toString("base64");
  const chunks = Math.ceil(encoded.length / 12_000);
  console.log(prefix + "_FILE " + JSON.stringify({ ...item, chunks }));
  for (let index = 0; index < chunks; index++) {
    const line = prefix + "_CHUNK " + JSON.stringify({ path, index, total: chunks,
      base64: encoded.slice(index * 12_000, (index + 1) * 12_000) });
    assert.ok(Buffer.byteLength(line) <= 16_384); console.log(line);
  }
  console.log(prefix + "_END " + JSON.stringify({ path, sha256: item.sha256 }));
}
async function commands(root: Roots, runtime: Runtime): Promise<{
  results: Json[]; run: (label: string, executable: string, argv: string[]) => Promise<Buffer>;
  pnpm: (label: string, argv: string[]) => Promise<Buffer>;
}> {
  const directory = join(root.output, "commands"), shim = join(root.output, "bin");
  await mkdir(directory); await mkdir(shim);
  const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
  await write(shim, "pnpm", Buffer.from("#!/bin/sh\nexec " + quote(runtime.node26) +
    " " + quote(runtime.corepack) + ' pnpm "$@"\n'), "100755");
  const env: NodeJS.ProcessEnv = { ...process.env,
    PATH: shim + ":" + dirname(runtime.node26) + ":" + (process.env.PATH ?? ""),
    COREPACK_ENABLE_NETWORK: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0", COREPACK_DEFAULT_TO_LATEST: "0" };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "GITHUB_TOKEN", "GH_TOKEN", "CENTRAL_READ_TOKEN"]) delete env[key];
  const results: Json[] = [];
  async function run(label: string, executable: string, argv: string[]): Promise<Buffer> {
    assert.match(label, /^[a-z0-9-]+$/);
    const out = join(directory, label + ".stdout.txt"), err = join(directory, label + ".stderr.txt");
    const stdout = openSync(out, "wx"), stderr = openSync(err, "wx"), startedAt = new Date().toISOString();
    let result: ReturnType<typeof spawnSync>;
    try { result = spawnSync(executable, argv, { cwd: root.candidate, env,
      stdio: ["ignore", stdout, stderr], timeout: 1_200_000 }); }
    finally { closeSync(stdout); closeSync(stderr); }
    const outBytes = (await file(out, 33_554_432)).bytes, errBytes = (await file(err, 33_554_432)).bytes;
    const meta: Json = { label, argv: [executable, ...argv], cwd: root.candidate, startedAt,
      completedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal ?? null,
      executionError: result.error ? { name: result.error.name, message: result.error.message } : null,
      stdout: describe(label + ".stdout.txt", outBytes), stderr: describe(label + ".stderr.txt", errBytes) };
    results.push(meta); await writeJson(directory, label + ".meta.json", meta);
    if (result.status !== 0) {
      const tail = (bytes: Buffer) => sensitive(bytes.toString()) ? { withheld: true } :
        { withheld: false, fromByte: Math.max(0, bytes.length - 8_000), text: bytes.subarray(-8_000).toString() };
      const safeMeta = sensitive(JSON.stringify(meta)) ? { label, exitCode: result.status, argumentsWithheld: true } : meta;
      const failure = Buffer.from(JSON.stringify({ schemaVersion: 1, metadata: safeMeta,
        stdoutTail: tail(outBytes), stderrTail: tail(errBytes) }, null, 2) + "\n");
      await write(directory, label + ".failure.json", failure);
      frame("ORCHESTRATOR_HOST_FAILURE", "commands/" + label + ".failure.json", failure);
    }
    assert.equal(result.status, 0, "Host command failed: " + label); return outBytes;
  }
  return { results, run, pnpm: (label, argv) => run(label, runtime.node26, [runtime.corepack, "pnpm", ...argv]) };
}
function replace(text: string, before: string, after: string): string {
  assert.equal(text.split(before).length - 1, 1, "Unexpected document preimage: " + before.slice(0, 100));
  return text.replace(before, after);
}
async function editDocuments(candidate: string, runUrl: string): Promise<void> {
  const oldLink = "../research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json";
  const newLink = "../research/evidence/managed-docs-orchestrator-v4-2026-11-27/manifest.json";
  const tick = String.fromCharCode(96);
  const changes: [string, string, string][] = [
    ["AGENTS.md",
      "The hosted retained controller produced the\norchestrator-v3 managed successor from the reviewed stable31 preparation source. Its actual\npreparation, receipt-write refusal, fresh-process resume, source restoration and\ncommitted rollback observations are retained in the\n[managed transition evidence](docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json).\nKeep original receipts as history.",
      "The hosted retained controller completed the orchestrator-v3 preparation,\nreceipt-write refusal, fresh-process resume, source restoration and committed\nrollback. Those observations remain in the immutable\n[v3 lifecycle evidence](docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json).\nA separate fresh preparation and forward from the same reviewed stable31 source\nproduced orchestrator-v4 with the repaired immutable workflow source and the same\npublished package/runtime/closure tuple. Its\n[forward evidence](docs/research/evidence/managed-docs-orchestrator-v4-2026-11-27/manifest.json)\ndoes not claim another fault or rollback qualification. Keep original receipts as history."],
    ["docs/architecture/repository-tooling.md",
      "This candidate carries the actual orchestrator-v3\nmanaged profile, state and caller; resulting-main qualification remains separate.",
      "This candidate carries the actual orchestrator-v4\nmanaged profile, state and caller; resulting-main qualification remains separate."],
    ["docs/architecture/repository-tooling.md",
      "This candidate\npreserves those managed assets while reconciling the separately owned Host\nconfiguration.",
      "The later orchestrator-v4 forward preserves the same package/runtime/closure\ntuple and selects the repaired immutable workflow source. This candidate carries\nits new profile, state and caller while retaining the separately reconciled Host\npackage, workspace and lock bytes."],
    ["docs/architecture/repository-tooling.md",
      "Candidate Docs " + tick + "0.6.9" + tick + " / adapter " + tick + "0.8.0" + tick + " come from the actual orchestrator-v3 transition. Stable31 receipts remain historical; resulting-main observation is still required",
      "Candidate Docs " + tick + "0.6.9" + tick + " / adapter " + tick + "0.8.0" + tick + " retain the tuple exercised by orchestrator-v3; the final selected cohort is orchestrator-v4. Stable31 receipts remain historical; resulting-main observation is still required"],
    ["docs/architecture/repository-tooling.md",
      "retain real defect/refusal evidence, the actual orchestrator-v3 managed tuple and the separate resulting-main gate",
      "retain real defect/refusal evidence, the actual orchestrator-v4 managed tuple and the separate resulting-main gate"],
    ["docs/architecture/repository-tooling.md", "The orchestrator-v3 candidate selects", "The orchestrator-v4 candidate selects"],
    ["docs/architecture/repository-tooling.md",
      "The real hosted controller completed retained preparation, an actual receipt\nwrite refusal, a fresh-process resume, source restoration and committed rollback,\nthen produced the final orchestrator-v3 managed target. The\n[inert evidence manifest](" + oldLink + ")\nbinds the actual source root, command outputs and generated file digests. It\nclaims no successful execution in the unavailable local environment. The Host\nintegration retains the original controller output files as evidence and records\nits package/workspace/lock reconciliation separately.",
      "The hosted controller completed the original orchestrator-v3 fault, resume,\nsource restoration and committed rollback cycle. The unchanged\n[v3 evidence manifest](" + oldLink + ")\nretains that run's source, outputs and original target digests. Its immutable\nworkflow later required a central authorization-digest repair. A separate\n[fresh forward run](" + runUrl + ") prepared and finalized orchestrator-v4\nfrom the same reviewed source using the same controller, kernel and published\ntuple. The [v4 forward manifest](" + newLink + ")\nrecords its new root-bound proofs and the distinct Host reconciliation. It does\nnot rebind v3 receipts or claim v4 fault/rollback execution. Neither observation\nclaims execution in the unavailable earlier local environment."],
    ["docs/open-decisions/OD-020-architecture-conformance-tooling.md",
      "The actual orchestrator-v3 managed transition is recorded in the\n[hosted lifecycle evidence](" + oldLink + ").\nFinal consumer and resulting-main admission remain separate completion gates.",
      "The original orchestrator-v3 fault/resume/rollback cycle remains in the\n[hosted lifecycle evidence](" + oldLink + "). The separate\n[orchestrator-v4 forward](" + newLink + ")\nproduced the current managed target with the repaired immutable workflow.\nFinal consumer and resulting-main admission remain separate completion gates."],
    ["docs/research/orchestrator-full-foundation-review-2026-11-26.md",
      "installed checks from the\n[actual hosted managed transition](evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json)\nand the still-required final-head and resulting-main gates.",
      "installed checks from the\n[original v3 lifecycle](evidence/managed-docs-orchestrator-v3-2026-11-27/manifest.json)\nand the [separate v4 forward](evidence/managed-docs-orchestrator-v4-2026-11-27/manifest.json),\nwith final-head and resulting-main gates still required."],
  ];
  for (const path of [...new Set(changes.map(([name]) => name))]) {
    const original = (await file(join(candidate, path))).bytes.toString(); let updated = original;
    for (const [name, before, after] of changes) if (name === path) updated = replace(updated, before, after);
    assert.equal(updated.match(/^---\n[\s\S]*?\n---/)?.[0], original.match(/^---\n[\s\S]*?\n---/)?.[0]);
    await write(candidate, path, Buffer.from(updated));
  }
}
async function applyCandidate(root: Roots, legacy: Legacy, forward: Forward): Promise<void> {
  for (const item of legacy.files) {
    await write(root.candidate, item.path, await readImage(join(root.legacyExport, "files"), item), item.mode);
  }
  for (const path of IDENTITY_ASSETS) {
    const item = findImage(forward.assets, path);
    await write(root.candidate, path, await readImage(root.target, item), item.mode);
  }
  const assertion = "scripts/architecture/quality-source-coverage.test.mjs";
  const source = (await file(join(root.candidate, assertion))).bytes.toString();
  await write(root.candidate, assertion, Buffer.from(replace(source,
    'assert.equal(managed.cohortId, "' + OLD_COHORT + '");',
    'assert.equal(managed.cohortId, "' + NEW_COHORT + '");')));
  for (const path of commandPaths(LABELS, "stderr.log")) {
    const bytes = await readImage(root.evidence, findImage(forward.files, path));
    assert.ok(!sensitive(bytes.toString()), "Credential-like forward evidence refused");
    await write(root.candidate, NEW_EVIDENCE + "/" + path.replace(/\.stderr\.log$/, ".stderr.txt"), bytes);
  }
  await immutable(root.candidate);
}
async function snapshotCandidate(root: Roots, paths: string[]): Promise<Image[]> {
  const images: Image[] = [];
  for (const path of [...paths].sort()) {
    const current = await file(join(root.candidate, path));
    images.push(describe(path, current.bytes, current.mode));
  }
  return images;
}
async function preserveChecks(root: Roots, legacy: Legacy, forward: Forward, expected: Image[]): Promise<void> {
  await immutable(root.candidate);
  assert.equal(SUCCESSOR_DELTA.length, 8);
  assert.equal(legacy.files.filter((item) => !SUCCESSOR_DELTA.includes(item.path)).length, 42);
  for (const item of legacy.files) {
    if (!SUCCESSOR_DELTA.includes(item.path)) await readImage(root.candidate, item);
  }
  assert.equal(expected.length, 60);
  for (const item of expected) await readImage(root.candidate, item);
  for (const path of IDENTITY_ASSETS) {
    const item = findImage(forward.assets, path);
    await readImage(root.candidate, item);
  }
  for (const item of forward.assets) await readImage(root.target, item);
  for (const item of forward.files) await readImage(root.evidence, item);
}
async function retainedForward(root: Roots, forward: Forward): Promise<Image[]> {
  const retained: Image[] = [];
  for (const path of commandPaths(LABELS, "stderr.log")) {
    const bytes = await readImage(root.evidence, findImage(forward.files, path));
    retained.push(describe(path.replace(/\.stderr\.log$/, ".stderr.txt"), bytes));
  }
  return retained;
}
async function exportCandidate(root: Roots): Promise<{ files: Image[]; total: number }> {
  const actual = [...new Set([...textGit(root.candidate, "diff", "--name-only", "-z", "HEAD").split("\0"),
    ...textGit(root.candidate, "ls-files", "--others", "--exclude-standard", "-z").split("\0")]
    .filter(Boolean))].sort();
  const expected = [...legacyPaths(), NEW_EVIDENCE + "/manifest.json",
    ...commandPaths(LABELS).map((path) => NEW_EVIDENCE + "/" + path)].sort();
  assert.deepEqual(actual, expected); assert.equal(actual.length, 60);
  const files: Image[] = []; let total = 0;
  for (const path of actual) {
    const current = await file(join(root.candidate, path));
    assert.ok(!sensitive(current.bytes.toString()), "Credential-like candidate output refused: " + path);
    total += current.bytes.length; assert.ok(total <= 8_388_608);
    await write(root.output, "files/" + path, current.bytes, current.mode);
    const item = describe(path, current.bytes, current.mode); files.push(item);
    frame("ORCHESTRATOR_HOST", path, current.bytes, current.mode);
  }
  return { files, total };
}
async function main(): Promise<void> {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY);
  assert.equal(process.env.GITHUB_REPOSITORY_ID, "1310245598");
  const argv = process.argv.slice(2); assert.equal(argv.length, 4);
  const inputPath = option(argv, "--input"), expectedDigest = option(argv, "--expect");
  assert.equal(await realpath(inputPath), inputPath); assert.match(expectedDigest, DIGEST);
  const inputBytes = (await file(inputPath, 1_048_576)).bytes;
  assert.equal(sha(inputBytes), expectedDigest);
  const input = parse(inputBytes);
  keys(input, ["schemaVersion", "scope", "candidateRoot", "outputRoot", "legacy", "forward", "authority", "runtime"]);
  assert.equal(input.schemaVersion, 1); assert.equal(input.scope, "orchestrator-successor-host-integration");
  keys(object(input.legacy), ["exportRoot", "evidenceRoot", "integrationRun", "summary", "assets",
    "physicalArtifact", "hostExportArtifact"]);
  keys(object(input.forward), ["targetRoot", "evidenceRoot", "observation"]);
  keys(object(input.authority), ["revision", "registry", "policy", "cohortId", "recordDigest", "qualificationEventDigest"]);
  keys(object(input.runtime), ["controllerRoot", "controllerCli", "node24", "node26", "corepack", "observation"]);
  const root = await roots(input, inputPath);
  await immutable(root.candidate);
  const legacy = await readLegacy(input, root), runtime = await readRuntime(input, root);
  const forward = await readForward(input, root, legacy, runtime);
  await applyCandidate(root, legacy, forward);
  const ownedPaths = [...legacyPaths(), ...commandPaths(LABELS).map((path) => NEW_EVIDENCE + "/" + path)];
  const beforeDiscovery = await snapshotCandidate(root, ownedPaths); assert.equal(beforeDiscovery.length, 59);
  const runner = await commands(root, runtime);
  assert.equal((await runner.pnpm("pnpm-version", ["--version"])).toString().trim(), "11.20.0");
  await runner.pnpm("frozen-install", ["install", "--frozen-lockfile", "--config.engine-strict=true", "--strict-peer-dependencies"]);
  assert.equal(sha((await file(join(root.candidate, "pnpm-lock.yaml"))).bytes), HOST_LOCK);
  await runner.pnpm("installed-peers", ["peers", "check"]);
  await runner.pnpm("docs-info", ["docs:info"]);
  await runner.pnpm("docs-find", ["docs:find", "--", "--text", "repository tooling"]);
  const packageJson = await json(join(root.candidate, "package.json"));
  const docsInfo = string(object(packageJson.scripts)["docs:info"]);
  const selection = /^agent-teams-docs info --consumer (\S+) --profile (\S+)$/.exec(docsInfo);
  assert.ok(selection && selection[1] && selection[2]);
  await runner.pnpm("docs-context", ["exec", "docs-protocol", "context", "--consumer", selection[1],
    "--profile", selection[2], "--max-documents", "8", "--max-bytes", "32768"]);
  for (const item of beforeDiscovery) await readImage(root.candidate, item);
  const run = object(forward.observation.run), runUrl = "https://github.com/" + REPOSITORY +
    "/actions/runs/" + string(run.runId) + "/attempts/" + string(run.runAttempt);
  await editDocuments(root.candidate, runUrl);
  const retainedOutputs = await retainedForward(root, forward);
  const manifest = {
    schemaVersion: 1, evidenceClass: "inert-hosted-managed-successor-forward-observation",
    authority: false, replayable: false, run: { ...run, url: runUrl },
    source: forward.observation.source, originalMainRevision: ORIGINAL_MAIN,
    selectedPhysicalLock: findImage(forward.assets, "pnpm-lock.yaml"),
    authorityRevision: forward.observation.authorityRevision, target: forward.observation.target,
    controller: forward.preparation.controller, kernel: forward.preparation.kernel, runtimes: runtime.observed,
    phases: { forward: Object.fromEntries(forward.outputs) },
    physicalTargetFiles: forward.assets, retainedOutputs,
    externalProofDigests: forward.files.filter((item) => item.path.startsWith("proofs/")),
    legacy: { physicalArtifact: legacy.physicalArtifact, hostExportArtifact: legacy.hostExportArtifact,
      physicalScope: "orchestrator-v3 fault, cold resume, source restoration and committed rollback",
      hostScope: "separate successful archived-target Host continuation",
      manifest: findImage(legacy.files, OLD_EVIDENCE + "/manifest.json"),
      originalEvidencePreserved: legacy.files.filter((item) => item.path.startsWith(OLD_EVIDENCE + "/")) },
    hostReconciliation: { parentCommit: BASE, inputSha256: expectedDigest,
      inheritedIntegrationRun: reference(object(input.legacy).integrationRun),
      preservedHostLock: findImage(legacy.files, "pnpm-lock.yaml"), generatedIdentityAssets: IDENTITY_ASSETS,
      packageWorkspaceLockReresolved: false, mandatoryQualityContractSha256:
        "sha256:" + IMMUTABLE["architecture/foundation/required-quality-tests.json"] },
    remaining: ["final published PR head CI", "resulting main CI", "central observed binding and CANARY"],
    limitations: ["The v3 fault and rollback observations remain original historical evidence.",
      "This run qualifies only a fresh v4 forward from the reviewed stable31 source.",
      "Archived proof copies are inert and no v3 receipt is rebound to the new root.",
      "Production IAM/module lifecycle implementation is outside this Docs transition."]
  };
  await writeJson(root.candidate, NEW_EVIDENCE + "/manifest.json", manifest);
  const expectedCandidate = await snapshotCandidate(root, [...ownedPaths, NEW_EVIDENCE + "/manifest.json"]);
  const managedCheck = parse(await runner.run("managed-check", runtime.node26,
    [runtime.cli, "check", "--consumer", root.candidate, "--json"]));
  assert.equal(managedCheck.command, "consumer.check"); assert.equal(managedCheck.outcome, "current");
  assert.deepEqual(managedCheck.issues, []); assert.equal(object(managedCheck.plan).cohortId, NEW_COHORT);
  await runner.pnpm("docs-check", ["docs:check"]);
  await runner.pnpm("docs-protocol-check", ["docs:protocol:check"]);
  await preserveChecks(root, legacy, forward, expectedCandidate);
  const exported = await exportCandidate(root);
  const result = { schemaVersion: 1, scope: "derived-successor-host-integration", outcome: "passed",
    parentCommit: BASE, physicalSourceRevision: SOURCE, inputSha256: expectedDigest,
    run, physicalTargetFiles: forward.assets, files: exported.files, commands: runner.results,
    legacy: { physicalArtifact: legacy.physicalArtifact, hostExportArtifact: legacy.hostExportArtifact },
    forwardObservation: reference(object(input.forward).observation), managedCheck,
    candidateCommitCreated: false, finalPublishedHeadQualified: false,
    node24CompatibilityQualified: false, productionIAMLifecycleQualified: false };
  const resultBytes = Buffer.from(JSON.stringify(result, null, 2) + "\n");
  await write(root.output, "successor-integration-run.json", resultBytes);
  frame("ORCHESTRATOR_HOST_EVIDENCE", "successor-integration-run.json", resultBytes);
  console.log("ORCHESTRATOR_HOST_RESULT " + JSON.stringify({ schemaVersion: 1, scope: result.scope,
    outcome: result.outcome, parentCommit: BASE, physicalSourceRevision: SOURCE,
    fileCount: exported.files.length, fileBytes: exported.total,
    detail: describe("successor-integration-run.json", resultBytes),
    candidateCommitCreated: false, finalPublishedHeadQualified: false,
    node24CompatibilityQualified: false, productionIAMLifecycleQualified: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
