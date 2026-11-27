import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

// This adapter admits one verified archive as inert Host input. It never invokes
// upgrade/finalize/restore, changes a native proof, or rebinds an old physical root.
type Json = Record<string, unknown>;
type Options = { archivePath: string | undefined; evidenceRoot: string; targetRoot: string;
  candidateRoot: string; outputRoot: string };
export type ArchivedHostInput = {
  evidenceClass: "verified-archived-physical-target";
  qualificationAuthority: false; replayable: false; sourceRoot: string; sourceConsumer: Json;
  materializedInputRoot: string; archiveSha256: string;
  physicalRun: { repository: string; runId: string; runAttempt: string; headSha: string; workflowPath: string };
  artifact: { id: string; bytes: number; sha256: string };
  originalJob: { id: string; conclusion: "failure"; physicalStepConclusion: "success"; failedHostCheck: string };
  limitations: string[];
};
const SOURCE = "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67";
const TREE = "a24da96493edd1c6fe3bd5868d4cf636007bcf04";
const ARCHIVE_SHA = "sha256:c0007a199de47148c1c3ecf4f333a6ab484aa9a0188cc89e9d88c451f2d37704";
const SOURCE_RUN = { repository: "agent-teams-ai/agent-teams-orchestrator",
  runId: "45972172068", runAttempt: "1",
  headSha: "c29a5b3d4dbe4beabfc0e5acc1d026eeedc54a14",
  workflowPath: ".github/workflows/orchestrator-managed-lifecycle.yml" };
const ASSETS = [".github/workflows/docs-protocol.yml", ".node-version",
  "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
const sha = (bytes: Uint8Array) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
function object(value: unknown): Json {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value)); return value as Json;
}
function text(value: unknown): string { assert.ok(typeof value === "string" && value.length > 0); return value; }
function list(value: unknown): unknown[] { assert.ok(Array.isArray(value)); return value; }
async function json(path: string): Promise<Json> { return object(JSON.parse(await readFile(path, "utf8")) as unknown); }
function disjoint(left: string, right: string): void {
  const within = (a: string, b: string) => { const r = relative(a, b);
    return r === "" || (!isAbsolute(r) && r !== ".." && !r.startsWith(".." + sep)); };
  assert.ok(!within(left, right) && !within(right, left), "Archive/Host roots overlap");
}
const VERIFY_ZIP = [
  "import pathlib,stat,sys,zipfile",
  "archive,root=map(pathlib.Path,sys.argv[1:]); names=set(); total=0",
  "with zipfile.ZipFile(archive) as z:",
  " assert len(z.infolist())==153",
  " for item in z.infolist():",
  "  name=item.filename; parts=pathlib.PurePosixPath(name).parts",
  "  assert name not in names and parts and not name.startswith('/')",
  "  assert all(part not in ('','..','.') for part in parts)",
  "  assert all(ord(ch) not in (0,92) for ch in name)",
  "  assert parts[0] in ('evidence','host-export') and not item.is_dir()",
  "  assert stat.S_IFMT(item.external_attr >> 16) in (0,stat.S_IFREG)",
  "  names.add(name); data=z.read(item); total+=len(data)",
  "  path=root.joinpath(*parts); info=path.lstat()",
  "  assert stat.S_ISREG(info.st_mode) and info.st_nlink==1 and path.resolve()==path",
  "  assert data==path.read_bytes(),name",
  " assert total==6055023",
].join("\n");

export function selectArchivedHostArgument(argv: string[]): { argv: string[]; path?: string } {
  const positions = argv.flatMap((value, index) => value === "--archive" ? [index] : []);
  assert.ok(positions.length <= 1, "--archive may occur only once");
  const index = positions[0]; if (index === undefined) return { argv: [...argv] };
  const value = argv[index + 1]; assert.ok(value && !value.startsWith("--"));
  return { argv: [...argv.slice(0, index), ...argv.slice(index + 2)], path: resolve(value) };
}

export async function validateArchivedHostInput(options: Options): Promise<ArchivedHostInput | undefined> {
  if (options.archivePath === undefined) return undefined;
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, SOURCE_RUN.repository);
  const archivePath = await realpath(options.archivePath), root = dirname(options.evidenceRoot);
  assert.equal(archivePath, options.archivePath);
  for (const target of [options.targetRoot, options.candidateRoot, options.outputRoot]) {
    disjoint(archivePath, target); disjoint(root, target);
  }
  const archive = await readFile(archivePath);
  assert.equal(archive.length, 1_814_712); assert.equal(sha(archive), ARCHIVE_SHA);
  execFileSync("python3", ["-c", VERIFY_ZIP, archivePath, root], { timeout: 30_000, stdio: "pipe" });
  const summary = await json(join(options.evidenceRoot, "summary.json"));
  assert.equal(summary.schemaVersion, 1); assert.equal(summary.scope, "physical-managed-lifecycle");
  assert.equal(summary.outcome, "passed");
  assert.deepEqual(summary.run, { repository: SOURCE_RUN.repository, runId: SOURCE_RUN.runId, runAttempt: SOURCE_RUN.runAttempt });
  const source = object(summary.source), consumer = object(source.consumer), sourceRoot = text(consumer.root);
  assert.equal(source.revision, SOURCE); assert.equal(source.tree, TREE);
  assert.notEqual(sourceRoot, options.targetRoot, "Archive materialization must not impersonate the old root");
  assert.equal(execFileSync("git", ["--no-replace-objects", "-C", options.targetRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), SOURCE);
  const assetValues: unknown = JSON.parse(await readFile(join(options.evidenceRoot, "managed-assets-manifest.json"), "utf8"));
  assert.deepEqual(assetValues, summary.assets);
  const assets = list(assetValues).map(object);
  assert.deepEqual(assets.map((item) => item.path), ASSETS);
  const phases = object(summary.phases);
  for (const phase of ["A", "B", "C"]) {
    const path = join(options.evidenceRoot, "proofs", phase, "completion.json.prepared");
    const bytes = await readFile(path), preparation = object(JSON.parse(bytes.toString()) as unknown);
    assert.equal(sha(bytes), object(phases[phase]).preparationDigest);
    assert.deepEqual(preparation.consumer, consumer);
    assert.equal(preparation.sourceRevision, SOURCE); assert.equal(preparation.sourceTree, TREE);
    assert.equal(object(preparation.targetCohort).cohortId, "docs-2026-11-27-orchestrator-v3");
    assert.deepEqual(preparation.controller, summary.controller); assert.deepEqual(preparation.kernel, summary.kernel);
  }
  for (const item of assets) {
    const path = text(item.path), original = await readFile(join(options.evidenceRoot, "managed-assets", path));
    const materialized = join(options.targetRoot, path), info = await lstat(materialized);
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.nlink === 1);
    assert.equal(await realpath(materialized), materialized);
    assert.equal(original.length, item.bytes); assert.equal(sha(original), item.sha256);
    assert.ok(original.equals(await readFile(materialized)), "Archived generated bytes changed: " + path);
    assert.equal("100" + (info.mode & 0o777).toString(8), item.mode);
  }
  return { evidenceClass: "verified-archived-physical-target", qualificationAuthority: false, replayable: false,
    sourceRoot, sourceConsumer: consumer, materializedInputRoot: options.targetRoot, archiveSha256: ARCHIVE_SHA,
    physicalRun: SOURCE_RUN, artifact: { id: "15188626286", bytes: 1_814_712, sha256: ARCHIVE_SHA },
    originalJob: { id: "140414983610", conclusion: "failure", physicalStepConclusion: "success",
      failedHostCheck: "docs-protocol-check: CSpell postimages" },
    limitations: ["No archived proof is invoked or rebound to this checkout.",
      "The original physical run is distinct from this Host execution.",
      "External proof copy permissions describe downloaded archive files."] };
}
