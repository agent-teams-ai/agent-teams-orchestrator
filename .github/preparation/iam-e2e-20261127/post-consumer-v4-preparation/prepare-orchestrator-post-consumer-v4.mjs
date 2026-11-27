#!/usr/bin/env node
// Offline proposal construction from retained real GitHub responses and artifacts.
// No network, Git mutations, installations, or synthetic evidence generation.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const CENTRAL = { name: "agent-teams-ai/.github", id: 1316243981 };
const CONSUMER = { name: "agent-teams-ai/agent-teams-orchestrator", id: 1310245598 };
// Planned identifier only. Future record, QUALIFIED event and merged source SHA
// must come from authenticated actual inputs; no prospective values are accepted.
const TARGET = "docs-2026-11-27-orchestrator-v4";
const RETAINED_TARGET = "docs-2026-11-27-orchestrator-v3";
const RETAINED_RECORD = "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c";
const REPAIR = {
  pullRequest: 467, pullRequestId: 5524611730,
  base: "d167b2360524474240a43e3ff70e35eb94e109c7",
  head: "611cd2a78d1f9104dbf46bab69c3ff0e30ac6d8f",
  tree: "31561be538b5dc4b4aa02e53278047d79ff4dbaa",
  headRef: "fix/docs-receipt-authorization-order-20261127",
  files: {
    "scripts/verify-docs-cohort-v2-receipt.mjs": "15090b6ce1ca77f3591f3337137d564b4c82dc87",
    "scripts/verify-docs-consumer-gate.test.mjs": "1720cb51da26b4ddfc1f14b855f81cfdfceb8f90",
  },
};
const EXPECTED_WORKFLOW_BLOB = "714af12998ef140dd55a2ec3057f67775586cfd7";
const WORKFLOW_PATH = ".github/workflows/docs-protocol-check.yml";
const CALLER_PATH = ".github/workflows/docs-protocol.yml";
const CONTEXT = "docs-protocol / docs-protocol-check";
const POLICY_PATH = "governance/docs-protocol-policy-v2.json";
const REGISTRY_PATH = "governance/docs-qualified-cohorts.json";
const SUPPORT_PATH = "governance/evidence/docs-cohorts/" + TARGET + "/canary.json";
const MANAGED_PATH = "architecture/foundation/docs-protocol-managed-state.json";
const INTEGRATION_PATH = "architecture/foundation/docs-consumer-integration.json";
const REQUIRED_PATHS = [
  "package.json", "architecture/foundation/docs-protocol.yaml", CALLER_PATH,
  "architecture/foundation/docs-protocol-qualification.json", INTEGRATION_PATH, MANAGED_PATH,
];
const COORDINATES = {
  repository_mutation: "0.5.2", document_authoring: "0.3.9", docs_protocol: "0.6.9",
  docs_protocol_agent_teams: "0.8.0", engineering_foundation: "4.0.3",
};
const COORDINATE_NAMES = [
  "@agent-teams/repository-mutation", "@agent-teams/document-authoring",
  "@agent-teams/docs-protocol", "@agent-teams/docs-protocol-agent-teams",
  "@agent-teams/engineering-foundation",
];
const PINNED_VALIDATORS = {
  "scripts/docs-cohort-policy.mjs": "7f56855e23cb6a1a2e956b6f770b9498dd210abe752e083aee46f31863497f5a",
  "scripts/docs-managed-runtime-policy.ts": "87a6a3f8f1a1afd5154c1438c64d48f7cace2d8a23b2091398e0934ed7d50dd6",
  "scripts/verify-docs-cohort-v2-receipt.mjs": "e64a63e02801a8259892eca3424149885b8a4779dc6ad3ea44d7fbd8e08748fd",
  "governance/docs-qualified-cohorts.schema.json": "de8fa946051ecc45fba5305dfddc41f03bf7584eb9806f71686c396b652080f1",
  "governance/docs-protocol-policy-v2.schema.json": "126ca5860db1b2e8d43b4d8582ba40f60d6499b96ce38c2d1f350ee9110c46ef",
};
const sha256 = (bytes) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const blob = (bytes) => createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
const pretty = (value) => JSON.stringify(value, null, 2) + "\n";
const keys = (value, expected, label) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), label);
const object = (value, label) => assert.ok(value && typeof value === "object" && !Array.isArray(value), label);
const positive = (value, label) => assert.ok(Number.isSafeInteger(value) && value > 0, label);
const immutableSha = (value, label) => assert.match(value, /^(?!0{40}$)[a-f0-9]{40}$/u, label);
// Authorization uses the pinned authorizer's ordinal key order. Event and
// receipt/envelope domains remain owned by their unchanged native helpers.
const authorizationCanonical = (value) => Array.isArray(value)
  ? "[" + value.map(authorizationCanonical).join(",") + "]"
  : value && typeof value === "object"
    ? "{" + Object.keys(value).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
      .map((key) => JSON.stringify(key) + ":" + authorizationCanonical(value[key])).join(",") + "}"
    : JSON.stringify(value);
const authorizationDigest = (body) => sha256(authorizationCanonical({
  domain: "agent-teams.docs-consumer-gate-authorization/v1", body,
}));
const isWithin = (root, path) => path === root || path.startsWith(root + sep);
const sourceText = (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const timestamp = (value, label) => {
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u, label);
  const ms = Date.parse(value);
  assert.ok(Number.isFinite(ms) && new Date(ms).toISOString().replace(".000Z", "Z") === value.replace(".000Z", "Z"), label);
  return ms;
};
function canonicalRepositoryPath(path) {
  assert.ok(typeof path === "string" && path.length > 0 && !path.includes("\\") && !path.includes("\0"));
  assert.ok(!isAbsolute(path) && path.split("/").every((part) => part && part !== "." && part !== ".."));
}
async function bytesAt(path, limit = 16 * 1024 * 1024) {
  assert.ok(isAbsolute(path) && resolve(path) === path, "Evidence paths must be canonical absolute paths.");
  assert.equal(await realpath(path), path, "Symlink evidence paths are refused.");
  const before = await lstat(path, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink(), "Evidence must be a regular file.");
  assert.ok(before.size <= BigInt(limit), "Evidence exceeds its byte bound.");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const first = await handle.stat({ bigint: true });
    const bytes = await handle.readFile();
    const last = await handle.stat({ bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs"]) {
      assert.equal(first[key], before[key], "Evidence changed before read.");
      assert.equal(last[key], first[key], "Evidence changed during read.");
    }
    assert.equal(BigInt(bytes.length), first.size);
    return bytes;
  } finally { await handle.close(); }
}
function treeEntries(tree, commit) {
  assert.equal(tree.sha, commit.tree.sha);
  assert.equal(tree.truncated, false, "Supply a complete recursive Git tree.");
  assert.ok(Array.isArray(tree.tree));
  const entries = new Map();
  for (const entry of tree.tree) {
    canonicalRepositoryPath(entry.path);
    assert.ok(!entries.has(entry.path), "Duplicate tree path.");
    entries.set(entry.path, entry);
  }
  return entries;
}
function bindFile(tree, path, bytes) {
  canonicalRepositoryPath(path);
  const entry = tree.get(path);
  assert.ok(entry && entry.type === "blob" && entry.mode === "100644", "Expected regular tracked file: " + path);
  assert.equal(entry.sha, blob(bytes), "Git tree/file bytes differ: " + path);
}
function bindRepository(repo, branch, commit, expected) {
  assert.equal(repo.id, expected.id); assert.equal(repo.full_name, expected.name);
  assert.equal(repo.default_branch, "main"); assert.equal(repo.archived, false); assert.equal(repo.disabled, false);
  assert.equal(branch.name, repo.default_branch); assert.equal(branch.protected, true);
  immutableSha(commit.sha, "Commit SHA missing."); assert.equal(branch.commit.sha, commit.sha);
  immutableSha(commit.tree.sha, "Commit tree SHA missing.");
}
function step(job, name) {
  const found = job.steps.filter((item) => item.name === name);
  assert.equal(found.length, 1, "Missing or ambiguous step: " + name);
  assert.equal(found[0].status, "completed"); assert.equal(found[0].conclusion, "success", name);
}
// Same decisive-run selection as the pinned Central admission verifier.
function decisive(checks) {
  const found = new Map();
  for (const check of checks.filter((item) => item.conclusion !== "skipped")) {
    const run = /\/actions\/runs\/(\d+)\/job\/\d+$/u.exec(check.html_url ?? "")?.[1];
    const key = run === undefined ? "check:" + check.id : "run:" + run;
    if (!found.has(key) || check.id > found.get(key).id) found.set(key, check);
  }
  return [...found.values()].sort((a, b) => a.id - b.id);
}
const ZIP_PROBE = [
  "import hashlib,json,stat,sys,zipfile",
  "result=[]",
  "with zipfile.ZipFile(sys.argv[1]) as archive:",
  " entries=archive.infolist()",
  " assert len(entries)<=16",
  " names=set(); total=0",
  " for item in entries:",
  "  name=item.filename",
  "  assert name not in names; names.add(name)",
  "  assert name and not name.startswith('/')",
  "  assert all(ord(character) not in (0,92) for character in name)",
  "  assert all(p not in ('','.','..') for p in name.rstrip('/').split('/'))",
  "  mode=item.external_attr>>16",
  "  assert not stat.S_ISLNK(mode) and not (item.flag_bits&1)",
  "  if item.is_dir(): continue",
  "  assert stat.S_IFMT(mode) in (0,stat.S_IFREG)",
  "  assert item.file_size<=4*1024*1024",
  "  total+=item.file_size; assert total<=8*1024*1024",
  "  data=archive.read(item)",
  "  assert len(data)==item.file_size",
  "  result.append({'name':name,'bytes':len(data),'sha256':'sha256:'+hashlib.sha256(data).hexdigest()})",
  "print(json.dumps(result))",
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  assert.equal(args.length, 6, "Use --mode observed|canary --input ABS --output FRESH_ABS.");
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(["--mode", "--input", "--output"].includes(args[i]) && !Object.hasOwn(options, args[i]));
    options[args[i]] = args[i + 1];
  }
  const mode = options["--mode"]; assert.ok(["observed", "canary"].includes(mode));
  const inputPath = options["--input"], output = options["--output"];
  const inputBytes = await bytesAt(inputPath, 256 * 1024);
  const input = JSON.parse(sourceText(inputBytes));
  keys(input, ["schemaVersion", "observedAt", "proofRoot", "validatorRoot", "successor", "central", "consumer"], "Input manifest fields differ.");
  assert.equal(input.schemaVersion, 1);
  const observedMs = timestamp(input.observedAt, "Observation timestamp");
  assert.ok(observedMs <= Date.now(), "A future observation is refused.");
  for (const root of [input.proofRoot, input.validatorRoot]) {
    assert.ok(isAbsolute(root) && resolve(root) === root && (await realpath(root)) === root);
    assert.ok((await lstat(root)).isDirectory());
  }
  assert.ok(isWithin(input.proofRoot, inputPath), "Manifest must be inside the retained proof root.");
  assert.ok(isAbsolute(output) && resolve(output) === output);
  assert.equal(await realpath(dirname(output)), dirname(output), "Output parent must already exist and be canonical.");
  for (const root of [input.proofRoot, input.validatorRoot]) {
    assert.ok(!isWithin(root, output) && !isWithin(output, root), "Output must be disjoint from evidence and validator roots.");
  }
  await lstat(output).then(() => assert.fail("Output already exists."), (error) => assert.equal(error.code, "ENOENT"));
  const retained = [];
  async function readDescriptor(descriptor, logicalName, limit) {
    keys(descriptor, ["path", "sha256"], logicalName + " descriptor");
    assert.ok(isWithin(input.proofRoot, descriptor.path), "Evidence is outside proofRoot.");
    const bytes = await bytesAt(descriptor.path, limit);
    const expected = descriptor.sha256.startsWith("sha256:") ? descriptor.sha256 : "sha256:" + descriptor.sha256;
    assert.equal(sha256(bytes), expected, "Evidence hash differs: " + logicalName);
    retained.push({ logicalName, path: descriptor.path, bytes: bytes.length, sha256: sha256(bytes), gitBlob: blob(bytes) });
    return bytes;
  }
  async function readJson(descriptor, name) { return JSON.parse(sourceText(await readDescriptor(descriptor, name))); }
  const c = input.central, o = input.consumer;
  keys(c, ["repository", "branch", "commit", "tree", "files"], "Central inputs");
  keys(o, ["repository", "branchBefore", "branchAfter", "commit", "tree", "run", "jobs", "checks", "comparePrior", "files", "artifacts", "authorizationZip", "qualificationZip", "authorization", "receipt", "installEvidence"], "Consumer inputs");
  const centralRepo = await readJson(c.repository, "central.repository");
  const centralBranch = await readJson(c.branch, "central.branch");
  const centralCommit = await readJson(c.commit, "central.commit");
  const centralTree = treeEntries(await readJson(c.tree, "central.tree"), centralCommit);
  bindRepository(centralRepo, centralBranch, centralCommit, CENTRAL);
  assert.ok(timestamp(centralCommit.committer.date, "Central commit time") <= observedMs);
  const centralPaths = [POLICY_PATH, REGISTRY_PATH, "governance/docs-protocol-exceptions.json", "governance/code-security-defaults.json"];
  keys(c.files, centralPaths, "Central base data paths");
  const base = {};
  for (const path of centralPaths) {
    const bytes = await readDescriptor(c.files[path], "central.file:" + path);
    bindFile(centralTree, path, bytes); base[path] = { bytes, value: JSON.parse(sourceText(bytes)) };
  }
  // A source commit merely existing on a prep branch is insufficient. Bind M to
  // actual merged PR467, its exact repaired tree, successful native main runs,
  // and ancestry of the current protected Central snapshot.
  const s = input.successor;
  keys(s, ["repairPull", "mergeCommit", "mergeTree", "compareRepair", "compareCurrent", "workflow", "receipt", "nativeNode26", "nativeNode24"], "Successor source inputs");
  const repairPull = await readJson(s.repairPull, "successor.repairPull");
  const mergeCommit = await readJson(s.mergeCommit, "successor.mergeCommit");
  const mergeTree = treeEntries(await readJson(s.mergeTree, "successor.mergeTree"), mergeCommit);
  const compareRepair = await readJson(s.compareRepair, "successor.compareRepair");
  const compareCurrent = await readJson(s.compareCurrent, "successor.compareCurrent");
  assert.equal(repairPull.number, REPAIR.pullRequest); assert.equal(repairPull.id, REPAIR.pullRequestId);
  assert.equal(repairPull.state, "closed"); assert.equal(repairPull.merged, true); assert.equal(repairPull.draft, false);
  assert.equal(repairPull.user.id, 13103045); assert.equal(repairPull.user.login, "777genius");
  for (const side of ["base", "head"]) {
    assert.equal(repairPull[side].repo.id, CENTRAL.id); assert.equal(repairPull[side].repo.full_name, CENTRAL.name);
  }
  assert.equal(repairPull.base.ref, "main"); assert.equal(repairPull.base.sha, REPAIR.base);
  assert.equal(repairPull.head.ref, REPAIR.headRef); assert.equal(repairPull.head.sha, REPAIR.head);
  assert.equal(repairPull.changed_files, 2); assert.equal(repairPull.commits, 1);
  const WORKFLOW_SHA = mergeCommit.sha;
  immutableSha(WORKFLOW_SHA, "Actual merged repair source M is missing.");
  assert.equal(repairPull.merge_commit_sha, WORKFLOW_SHA);
  assert.equal(mergeCommit.tree.sha, REPAIR.tree);
  assert.deepEqual(mergeCommit.parents.map((parent) => parent.sha), [REPAIR.base], "Require the ordinary one-parent squash merge.");
  assert.equal(mergeCommit.author.name, "Илия"); assert.equal(mergeCommit.author.email, "iliyazelenkog@gmail.com");
  assert.equal(mergeCommit.committer.name, "GitHub"); assert.equal(mergeCommit.committer.email, "noreply@github.com");
  assert.equal(mergeCommit.verification?.verified, true); assert.equal(mergeCommit.verification?.reason, "valid");
  assert.ok(timestamp(repairPull.merged_at, "Repair merged_at") <= observedMs);
  assert.ok(timestamp(mergeCommit.committer.date, "Merged repair commit time") <= observedMs);
  assert.equal(compareRepair.base_commit.sha, REPAIR.base); assert.equal(compareRepair.merge_base_commit.sha, REPAIR.base);
  assert.equal(compareRepair.status, "ahead"); assert.equal(compareRepair.behind_by, 0);
  assert.equal(compareRepair.ahead_by, 1); assert.equal(compareRepair.total_commits, 1);
  assert.deepEqual(compareRepair.commits.map((commit) => commit.sha), [WORKFLOW_SHA]);
  assert.equal(compareRepair.html_url, "https://github.com/" + CENTRAL.name + "/compare/" + REPAIR.base + "..." + WORKFLOW_SHA);
  assert.deepEqual(compareRepair.files.map((file) => file.filename).sort(), Object.keys(REPAIR.files).sort());
  for (const file of compareRepair.files) {
    assert.equal(file.status, "modified"); assert.equal(file.previous_filename, undefined);
    assert.equal(file.sha, REPAIR.files[file.filename]);
    const entry = mergeTree.get(file.filename);
    assert.equal(entry?.type, "blob"); assert.equal(entry?.mode, "100644"); assert.equal(entry?.sha, file.sha);
  }
  assert.equal(compareCurrent.base_commit.sha, WORKFLOW_SHA); assert.equal(compareCurrent.merge_base_commit.sha, WORKFLOW_SHA);
  assert.ok(["ahead", "identical"].includes(compareCurrent.status)); assert.equal(compareCurrent.behind_by, 0);
  assert.equal(compareCurrent.html_url, "https://github.com/" + CENTRAL.name + "/compare/" + WORKFLOW_SHA + "..." + centralCommit.sha);
  if (compareCurrent.status === "identical") assert.equal(centralCommit.sha, WORKFLOW_SHA);
  else assert.equal(compareCurrent.commits.at(-1).sha, centralCommit.sha);
  const workflowBytes = await readDescriptor(s.workflow, "successor.workflow");
  const repairedReceiptBytes = await readDescriptor(s.receipt, "successor.receipt");
  bindFile(mergeTree, WORKFLOW_PATH, workflowBytes);
  bindFile(mergeTree, "scripts/verify-docs-cohort-v2-receipt.mjs", repairedReceiptBytes);
  const WORKFLOW_BLOB = blob(workflowBytes);
  assert.equal(WORKFLOW_BLOB, EXPECTED_WORKFLOW_BLOB, "Only the reviewed unchanged four-role workflow body is supported.");
  assert.equal(blob(repairedReceiptBytes), REPAIR.files["scripts/verify-docs-cohort-v2-receipt.mjs"]);
  assert.equal(sha256(repairedReceiptBytes), "sha256:" + PINNED_VALIDATORS["scripts/verify-docs-cohort-v2-receipt.mjs"]);
  for (const [key, path] of [["nativeNode26", ".github/workflows/ci.yml"], ["nativeNode24", ".github/workflows/node24-compatibility.yml"]]) {
    const native = await readJson(s[key], "successor." + key);
    positive(native.id); positive(native.run_attempt);
    assert.equal(native.repository.id, CENTRAL.id); assert.equal(native.repository.full_name, CENTRAL.name);
    assert.equal(native.head_sha, WORKFLOW_SHA); assert.equal(native.head_branch, "main"); assert.equal(native.event, "push");
    assert.equal(native.path, path); assert.equal(native.status, "completed"); assert.equal(native.conclusion, "success");
    assert.ok(timestamp(native.updated_at, "Native M run update") <= observedMs);
  }
  // Execute only these already-reviewed local validator bytes; bind them to actual base tree.
  for (const [path, digest] of Object.entries(PINNED_VALIDATORS)) {
    const bytes = await bytesAt(join(input.validatorRoot, path));
    assert.equal(sha256(bytes), "sha256:" + digest, "Pinned validator source differs.");
    bindFile(centralTree, path, bytes);
  }
  for (const path of ["package.json", "pnpm-lock.yaml"]) {
    bindFile(centralTree, path, await bytesAt(join(input.validatorRoot, path)));
  }
  const require = createRequire(join(input.validatorRoot, "package.json"));
  const Ajv = require("ajv/dist/2020.js").default;
  const ajv = new Ajv({ allErrors: true, strict: true });
  const cohort = await import(pathToFileURL(join(input.validatorRoot, "scripts/docs-cohort-policy.mjs")).href);
  const receiptVerifier = await import(pathToFileURL(join(input.validatorRoot, "scripts/verify-docs-cohort-v2-receipt.mjs")).href);
  const registrySchema = JSON.parse(sourceText(await bytesAt(join(input.validatorRoot, "governance/docs-qualified-cohorts.schema.json"))));
  const policySchema = JSON.parse(sourceText(await bytesAt(join(input.validatorRoot, "governance/docs-protocol-policy-v2.schema.json"))));
  const policy = base[POLICY_PATH].value, registry = base[REGISTRY_PATH].value;
  const exceptions = base["governance/docs-protocol-exceptions.json"].value;
  const security = base["governance/code-security-defaults.json"].value;
  const validatePolicy = ajv.compile(policySchema);
  assert.ok(validatePolicy(policy), JSON.stringify(validatePolicy.errors));
  cohort.validateDocsQualifiedCohorts(registry, registrySchema, { asOf: input.observedAt });
  cohort.validateDocsGovernanceReferences(registry, exceptions, policy, security, { asOf: input.observedAt });
  assert.equal(pretty(policy), sourceText(base[POLICY_PATH].bytes), "Base policy serialization is unexpected.");
  assert.equal(pretty(registry), sourceText(base[REGISTRY_PATH].bytes), "Base registry serialization is unexpected.");
  assert.equal(policy.repositories.length, 13, "Expected the actual thirteen-row policy.");
  const rows = policy.repositories.filter((row) => row.repository_id === CONSUMER.id);
  assert.equal(rows.length, 1); const prior = rows[0];
  assert.equal(prior.repository, CONSUMER.name);
  assert.equal(prior.desired_cohort_id, TARGET); assert.equal(prior.desired_cohort_generation, 3);
  assert.equal(prior.admission_status, "admitted"); assert.equal(prior.qualification.status, "qualified");
  assert.deepEqual(prior.qualification.evidence_paths, REQUIRED_PATHS, "Preserve all six exact existing evidence paths.");
  const records = registry.cohorts.filter((item) => item.cohort_id === TARGET);
  assert.equal(records.length, 1, "A genuine merged v4 record is required.");
  const record = records[0], RECORD = record.record_digest, CANDIDATE = record.candidate_digest;
  assert.equal(cohort.cohortRecordDigest(record), RECORD); assert.equal(record.cohort_generation, 3);
  const retainedRecords = registry.cohorts.filter((item) => item.cohort_id === RETAINED_TARGET);
  assert.equal(retainedRecords.length, 1);
  const retainedRecord = retainedRecords[0];
  assert.equal(retainedRecord.record_digest, RETAINED_RECORD); assert.equal(cohort.cohortRecordDigest(retainedRecord), RETAINED_RECORD);
  assert.notEqual(RECORD, retainedRecord.record_digest); assert.notEqual(CANDIDATE, retainedRecord.candidate_digest);
  const targetEvents = registry.events.filter((item) => item.cohort_id === TARGET);
  assert.deepEqual(targetEvents.map((item) => item.state), ["PUBLISHED_UNQUALIFIED", "VERIFIED", "QUALIFIED"], "Require a fresh real A-to-B qualification before consumer observation.");
  const qualified = targetEvents.at(-1), QUALIFIED = qualified.event_digest;
  positive(qualified.sequence, "Actual QUALIFIED sequence");
  assert.equal(cohort.cohortEventDigest(qualified), QUALIFIED);
  const CALLER_DIGEST = record.assets.caller_workflow.rendered_digest;
  const expectedRecord = structuredClone(retainedRecord);
  expectedRecord.cohort_id = TARGET;
  expectedRecord.reusable_workflow.revision = WORKFLOW_SHA;
  expectedRecord.assets.caller_workflow.rendered_digest = CALLER_DIGEST;
  expectedRecord.evidence_references = retainedRecord.evidence_references.map((ref) => ref.startsWith("https://") ? ref : ref.replace("/" + RETAINED_TARGET + "/", "/" + TARGET + "/"));
  expectedRecord.candidate_digest = CANDIDATE; expectedRecord.record_digest = RECORD;
  assert.deepEqual(record, expectedRecord, "V4 must retain all immutable v3 package, publication, policy, closure and rollout boundaries.");
  assert.deepEqual(record.canary_repositories, [{ repository_id: CONSUMER.id, repository: CONSUMER.name }]);
  assert.deepEqual(record.packages.map((item) => item.name), COORDINATE_NAMES);
  assert.deepEqual(record.packages.map((item) => item.version), Object.values(COORDINATES));
  assert.equal(record.reusable_workflow.revision, WORKFLOW_SHA); assert.equal(record.reusable_workflow.blob_sha, WORKFLOW_BLOB);
  assert.equal(record.assets.caller_workflow.rendered_digest, CALLER_DIGEST);
  const consumerRepo = await readJson(o.repository, "consumer.repository");
  const before = await readJson(o.branchBefore, "consumer.branchBefore"), after = await readJson(o.branchAfter, "consumer.branchAfter");
  const consumerCommit = await readJson(o.commit, "consumer.commit");
  bindRepository(consumerRepo, before, consumerCommit, CONSUMER);
  bindRepository(consumerRepo, after, consumerCommit, CONSUMER);
  assert.ok(timestamp(consumerCommit.committer.date, "Consumer commit time") <= observedMs);
  const revision = consumerCommit.sha;
  const consumerTree = treeEntries(await readJson(o.tree, "consumer.tree"), consumerCommit);
  const run = await readJson(o.run, "consumer.run"), jobsPayload = await readJson(o.jobs, "consumer.jobs");
  const checksPayload = await readJson(o.checks, "consumer.checks"), artifacts = await readJson(o.artifacts, "consumer.artifacts");
  positive(run.id, "Run ID"); positive(run.run_attempt, "Latest attempt"); positive(run.workflow_id, "Caller workflow ID");
  assert.equal(run.repository.id, CONSUMER.id); assert.equal(run.repository.full_name, CONSUMER.name);
  assert.equal(run.head_sha, revision); assert.equal(run.head_branch, "main"); assert.equal(run.event, "push");
  assert.equal(run.status, "completed"); assert.equal(run.conclusion, "success"); assert.equal(run.path, CALLER_PATH);
  assert.ok(timestamp(run.updated_at, "Run updated_at") <= observedMs);
  assert.equal(run.referenced_workflows?.length, 1);
  assert.equal(run.referenced_workflows[0].sha, WORKFLOW_SHA);
  assert.equal(run.referenced_workflows[0].path, CENTRAL.name + "/" + WORKFLOW_PATH + "@" + WORKFLOW_SHA);
  assert.equal(jobsPayload.total_count, 4); assert.equal(jobsPayload.jobs.length, 4);
  const jobs = jobsPayload.jobs, roles = ["trusted-authorize", "trusted-structural", "trusted-qualification", "docs-protocol-check"];
  assert.equal(new Set(jobs.map((job) => job.id)).size, 4);
  assert.deepEqual(jobs.map((job) => job.name.split(" / ").at(-1)).sort(), [...roles].sort());
  for (const job of jobs) {
    positive(job.id); assert.equal(job.run_id, run.id); assert.equal(job.run_attempt, run.run_attempt);
    assert.equal(job.head_sha, revision); assert.equal(job.status, "completed"); assert.equal(job.conclusion, "success");
    assert.equal(job.html_url, "https://github.com/" + CONSUMER.name + "/actions/runs/" + run.id + "/job/" + job.id);
    assert.ok(timestamp(job.completed_at, "Job completion") <= observedMs);
    assert.ok(Array.isArray(job.steps));
  }
  const jobByRole = Object.fromEntries(jobs.map((job) => [job.name.split(" / ").at(-1), job]));
  step(jobByRole["trusted-authorize"], "Authorize exact consumer snapshot without executing consumer code");
  step(jobByRole["trusted-authorize"], "Publish bounded structural authorization for the non-OIDC verifier");
  step(jobByRole["trusted-structural"], "Bind checkout bytes to central authorization");
  step(jobByRole["trusted-structural"], "Confirm current controller authority stayed stable through structural validation");
  step(jobByRole["trusted-qualification"], "Run Cohort v2 or v3 qualification through the trusted base-owned runner");
  step(jobByRole["trusted-qualification"], "Bind Cohort v2 or v3 authorized consumer receipt without asserting central CANARY");
  step(jobByRole["trusted-qualification"], "Confirm current controller authority stayed stable through qualification");
  step(jobByRole["trusted-qualification"], "Retain verified nonsecret generation3 qualification evidence");
  step(jobByRole["docs-protocol-check"], "Run repository semantic documentation gate");
  for (const name of ["Run only the exact installed agent-teams-docs qualify CLI", "Run Cohort v2 qualification through the trusted base-owned runner"]) {
    for (const item of jobByRole["trusted-qualification"].steps.filter((item) => item.name === name)) assert.equal(item.conclusion, "skipped");
  }
  assert.equal(checksPayload.total_count, checksPayload.check_runs.length, "Supply all paginated check-runs.");
  const relevant = decisive(checksPayload.check_runs.filter((check) => check.head_sha === revision && check.name === CONTEXT && check.app?.id === 15368));
  assert.ok(relevant.length > 0 && relevant.every((check) => check.status === "completed" && check.conclusion === "success"), "Every decisive main Docs check must succeed.");
  const check = relevant.find((item) => item.id === jobByRole["docs-protocol-check"].id);
  assert.ok(check, "Semantic job/check identity mismatch."); assert.equal(check.html_url, jobByRole["docs-protocol-check"].html_url);
  const compare = await readJson(o.comparePrior, "consumer.comparePrior");
  const oldRevision = compare.base_commit.sha;
  immutableSha(oldRevision, "Comparison source SHA missing.");
  if (mode === "observed") assert.equal(oldRevision, prior.observed_default_branch_evidence.revision);
  assert.equal(compare.base_commit.sha, oldRevision); assert.equal(compare.merge_base_commit.sha, oldRevision);
  assert.ok(["ahead", "identical"].includes(compare.status));
  assert.equal(compare.html_url, "https://github.com/" + CONSUMER.name + "/compare/" + oldRevision + "..." + revision);
  const authorizationBytes = await readDescriptor(o.authorization, "consumer.authorization", 4 * 1024 * 1024);
  const receiptBytes = await readDescriptor(o.receipt, "consumer.receipt", 4 * 1024 * 1024);
  const installBytes = await readDescriptor(o.installEvidence, "consumer.installEvidence", 4 * 1024 * 1024);
  const authorizationEnvelope = JSON.parse(sourceText(authorizationBytes));
  const receipt = JSON.parse(sourceText(receiptBytes)), install = JSON.parse(sourceText(installBytes));
  keys(authorizationEnvelope, ["authorization", "authorizationDigest"], "Authorization envelope");
  const authorization = authorizationEnvelope.authorization;
  assert.equal(authorizationEnvelope.authorizationDigest, authorizationDigest(authorization));
  assert.equal(authorization.repositoryId, CONSUMER.id); assert.equal(authorization.repository, CONSUMER.name);
  assert.equal(authorization.callerSha, revision); assert.equal(authorization.schemaVersion, 3);
  assert.equal(authorization.cohortId, TARGET); assert.equal(authorization.qualificationProfile, "cohort-v3");
  immutableSha(authorization.controllerSnapshotSha, "Actual authorization controller snapshot missing.");
  assert.deepEqual(authorization.workflowIdentity, {
    sha: WORKFLOW_SHA, ref: CENTRAL.name + "/" + WORKFLOW_PATH + "@" + WORKFLOW_SHA,
    repository: CENTRAL.name, filePath: WORKFLOW_PATH,
  });
  assert.equal(authorization.qualificationAuthority.recordDigest, RECORD);
  assert.equal(authorization.qualificationAuthority.candidateDigest, CANDIDATE);
  assert.deepEqual(authorization.qualificationAuthority.reusableWorkflow, record.reusable_workflow);
  assert.deepEqual(authorization.qualificationAuthority.registryRecord, record);
  assert.deepEqual(authorization.qualificationAuthority.qualificationEvent, qualified);
  assert.deepEqual(authorization.expectedPackages, record.packages.map(({ name, version, integrity, role }) => ({ name, version, integrity, role })));
  assert.equal(authorization.qualificationPackageManager, "pnpm@11.20.0");
  object(authorization.fileDigests, "Authorization file digests missing.");
  keys(o.files, Object.keys(authorization.fileDigests), "Supply every actual authorized consumer file.");
  const consumerFiles = {};
  for (const [path, descriptor] of Object.entries(o.files)) {
    const bytes = await readDescriptor(descriptor, "consumer.file:" + path);
    bindFile(consumerTree, path, bytes); assert.equal(sha256(bytes), authorization.fileDigests[path]);
    consumerFiles[path] = bytes;
  }
  for (const path of REQUIRED_PATHS) assert.ok(consumerTree.has(path), "Committed qualification evidence path missing: " + path);
  assert.equal(sha256(consumerFiles[CALLER_PATH]), CALLER_DIGEST);
  const integration = JSON.parse(sourceText(consumerFiles[INTEGRATION_PATH]));
  assert.equal(integration.schemaVersion, 4);
  const projection = JSON.parse(sourceText(consumerFiles[MANAGED_PATH]));
  const expectedProjection = cohort.qualifiedCohortProjection(registry, TARGET, { asOf: input.observedAt });
  for (const field of ["schemaVersion", "cohortId", "packages", "schemas", "runtime"]) assert.deepEqual(projection[field], expectedProjection[field], "Managed projection " + field);
  const projectedAuthority = projection.cohortAuthority ?? projection;
  for (const field of ["channel", "recordDigest", "qualificationEventDigest", "eligibleAfter", "upgradeFrom", "rollbackTo", "candidateDigest"]) assert.deepEqual(projectedAuthority[field], expectedProjection[field], "Managed authority " + field);
  for (const [field, value] of Object.entries(expectedProjection.assets)) assert.deepEqual(projection.assets[field], value);
  assert.deepEqual(projection.repository, { provider: "github", id: String(CONSUMER.id), nameWithOwner: CONSUMER.name });
  keys(install, ["schemaVersion", "authorizationDigest", "packages"], "Install evidence");
  assert.equal(install.schemaVersion, 1); assert.equal(install.authorizationDigest, authorizationEnvelope.authorizationDigest);
  assert.equal(install.packages.length, 5); assert.equal(new Set(install.packages.map((item) => item.name)).size, 5);
  for (const installed of install.packages) {
    keys(installed, ["name", "version", "integrity", "role", "treeDigest"], "Installed package evidence");
    const expected = record.packages.find((item) => item.name === installed.name); assert.ok(expected);
    for (const field of ["version", "integrity", "role"]) assert.equal(installed[field], expected[field]);
    assert.match(installed.treeDigest, /^sha256:(?!0{64}$)[a-f0-9]{64}$/u);
  }
  // This expected binding exists only for validation. It is never exported as an
  // observed execution-envelope artifact; the published job does not upload one.
  const expectedEnvelopeBody = {
    schemaVersion: 1, domain: "agent-teams.docs-cohort-v2-execution-envelope/v1", callerSha: revision,
    checkout: { repository: CONSUMER.name, repositoryId: CONSUMER.id, revision },
    workflow: { repository: CENTRAL.name, path: WORKFLOW_PATH, revision: WORKFLOW_SHA, blobSha: WORKFLOW_BLOB, runId: run.id, runAttempt: run.run_attempt },
    authorizationDigest: authorizationEnvelope.authorizationDigest, installEvidenceDigest: sha256(installBytes), receiptDigest: receipt.receiptDigest,
  };
  const verifiedReceipt = receiptVerifier.verifyDocsCohortV2SupportingEvidence({
    receipt, record, qualificationEvent: qualified,
    executionEnvelope: { ...expectedEnvelopeBody, envelopeDigest: receiptVerifier.docsCohortV2ExecutionEnvelopeDigest(expectedEnvelopeBody) },
  });
  assert.equal(verifiedReceipt.evidenceClass, "cohort-v3-supporting-canary");
  assert.equal(verifiedReceipt.centralCanaryEvidenceSatisfied, false);
  assert.equal(artifacts.total_count, artifacts.artifacts.length, "Supply all artifact pages.");
  const artifactEvidence = [];
  for (const [kind, prefix, descriptor, members] of [
    ["authorization", "docs-gate-authorization", o.authorizationZip, { "docs-gate-authorization.json": authorizationBytes }],
    ["qualification", "docs-cohort-qualification", o.qualificationZip, { "docs-qualification-receipt.json": receiptBytes, "docs-qualification-install-evidence.json": installBytes }],
  ]) {
    const expectedName = prefix + "-" + run.id + "-" + run.run_attempt;
    const matches = artifacts.artifacts.filter((item) => item.name === expectedName);
    assert.equal(matches.length, 1, "Missing or ambiguous artifact: " + expectedName);
    const artifact = matches[0]; positive(artifact.id); assert.equal(artifact.expired, false);
    assert.equal(artifact.workflow_run.id, run.id); assert.equal(artifact.workflow_run.repository_id, CONSUMER.id);
    assert.equal(artifact.workflow_run.head_repository_id, CONSUMER.id); assert.equal(artifact.workflow_run.head_sha, revision);
    assert.equal(artifact.workflow_run.head_branch, "main");
    const zipBytes = await readDescriptor(descriptor, "consumer." + kind + "Zip");
    assert.equal(artifact.digest, sha256(zipBytes), "Artifact download digest differs.");
    assert.equal(artifact.size_in_bytes, zipBytes.length, "Artifact size differs.");
    const inspected = JSON.parse(execFileSync("python3", ["-c", ZIP_PROBE, descriptor.path], { encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024 }));
    assert.deepEqual(inspected.map((item) => item.name).sort(), Object.keys(members).sort(), "ZIP file inventory differs.");
    for (const item of inspected) {
      assert.equal(item.sha256, sha256(members[item.name])); assert.equal(item.bytes, members[item.name].length);
    }
    assert.equal(sha256(await bytesAt(descriptor.path)), sha256(zipBytes), "Artifact changed during ZIP inspection.");
    artifactEvidence.push({ kind, id: artifact.id, name: artifact.name, bytes: zipBytes.length, sha256: sha256(zipBytes), members: inspected });
  }
  assert.equal(new Set(artifactEvidence.map((item) => item.id)).size, 2);
  const observed = {
    default_branch: "main", revision, required_context: CONTEXT, integration_id: 15368, conclusion: "success",
    check_run_id: check.id, check_run_url: check.html_url, workflow_run_id: run.id, workflow_id: run.workflow_id,
    caller_workflow_path: CALLER_PATH, caller_workflow_digest: CALLER_DIGEST, observed_at: input.observedAt,
  };
  keys(observed, ["default_branch", "revision", "required_context", "integration_id", "conclusion", "check_run_id", "check_run_url", "workflow_run_id", "workflow_id", "caller_workflow_path", "caller_workflow_digest", "observed_at"], "Closed twelve-field observed proof");
  const payload = [];
  let event;
  if (mode === "observed") {
    assert.equal(prior.cohort_binding_status, "rollout_pending");
    assert.equal(prior.observed_cohort_id, "docs-2026-10-03-stable31"); assert.equal(prior.observed_cohort_generation, 2);
    assert.equal(authorization.controllerSnapshotSha, centralCommit.sha, "Observed proposal base must be the actual authorized controller snapshot.");
    for (const path of [POLICY_PATH, REGISTRY_PATH, "governance/docs-protocol-exceptions.json"]) {
      assert.equal(authorization.controllerDataDigests[path], sha256(base[path].bytes), "Actual authorization/controller base bytes differ.");
    }
    const nextPolicy = structuredClone(policy), next = nextPolicy.repositories.find((row) => row.repository_id === CONSUMER.id);
    Object.assign(next, {
      cohort_binding_status: "bound", observed_cohort_id: TARGET, observed_cohort_generation: 3,
      observed_cohort_record_digest: RECORD, observed_cohort_event_digest: QUALIFIED,
      exact_package_version: "0.6.9", exact_foundation_version: "4.0.3",
      exact_cohort_v2_packages: { ...COORDINATES }, reusable_workflow_revision: WORKFLOW_SHA,
      observed_default_branch_evidence: observed,
    });
    next.qualification.observed_revision = revision;
    const allowed = ["cohort_binding_status", "observed_cohort_id", "observed_cohort_generation", "observed_cohort_record_digest", "observed_cohort_event_digest", "exact_package_version", "exact_foundation_version", "exact_cohort_v2_packages", "reusable_workflow_revision", "observed_default_branch_evidence"];
    const mask = (row) => { const copy = structuredClone(row); for (const key of allowed) delete copy[key]; delete copy.qualification.observed_revision; return copy; };
    assert.deepEqual(mask(next), mask(prior), "Observed proposal changes an unapproved row field.");
    for (let i = 0; i < policy.repositories.length; i++) if (policy.repositories[i].repository_id !== CONSUMER.id) assert.deepEqual(nextPolicy.repositories[i], policy.repositories[i]);
    assert.deepEqual({ ...nextPolicy, repositories: null }, { ...policy, repositories: null });
    assert.ok(validatePolicy(nextPolicy), JSON.stringify(validatePolicy.errors));
    cohort.validateDocsGovernanceReferences(registry, exceptions, nextPolicy, security, { asOf: input.observedAt });
    payload.push({ path: POLICY_PATH, content: pretty(nextPolicy) });
  } else {
    assert.equal(prior.cohort_binding_status, "bound"); assert.equal(prior.observed_cohort_id, TARGET);
    assert.equal(prior.observed_cohort_generation, 3); assert.equal(prior.observed_cohort_record_digest, RECORD);
    assert.equal(prior.observed_cohort_event_digest, QUALIFIED);
    assert.deepEqual(prior.exact_cohort_v2_packages, COORDINATES);
    assert.equal(prior.qualification.observed_revision, revision);
    assert.deepEqual({ ...prior.observed_default_branch_evidence, observed_at: input.observedAt }, observed, "CANARY must mirror the already merged exact observed proof.");
    assert.ok(!centralTree.has(SUPPORT_PATH), "CANARY support path already exists.");
    const support = {
      schemaVersion: 1, evidenceClass: "proposed-central-canary-from-observed-consumer-main", observedAt: input.observedAt,
      centralBase: centralCommit.sha, consumer: { repository: CONSUMER.name, repositoryId: CONSUMER.id, revision },
      cohort: { cohortId: TARGET, recordDigest: RECORD, qualificationEventDigest: QUALIFIED, candidateDigest: CANDIDATE },
      workflow: {
        runId: run.id, runAttempt: run.run_attempt, workflowId: run.workflow_id, path: CALLER_PATH,
        reusableWorkflowRevision: WORKFLOW_SHA, reusableWorkflowBlob: WORKFLOW_BLOB, callerWorkflowDigest: CALLER_DIGEST,
        semanticCheck: { id: check.id, name: CONTEXT, integrationId: 15368, htmlUrl: check.html_url },
        jobs: jobs.map((job) => ({ id: job.id, role: job.name.split(" / ").at(-1), runAttempt: job.run_attempt, conclusion: job.conclusion, completedAt: job.completed_at })),
      },
      supportingReceipt: {
        evidenceClass: verifiedReceipt.evidenceClass, receiptDigest: receipt.receiptDigest, receiptFileSha256: sha256(receiptBytes),
        installEvidenceSha256: sha256(installBytes), authorizationFileSha256: sha256(authorizationBytes),
        authorizationDigest: authorizationEnvelope.authorizationDigest, controllerSnapshotSha: authorization.controllerSnapshotSha,
        executionEnvelopeArtifactProvided: false, centralCanaryEvidenceSatisfiedByReceipt: false,
      },
      artifacts: artifactEvidence,
      rawEvidence: retained.map(({ path: _path, ...entry }) => entry),
      verificationBoundary: { suppliedRawSnapshotsVerifiedOffline: true, liveNetworkRevalidationRequired: true, centralAppendStatus: "proposed" },
    };
    const nextRegistry = structuredClone(registry);
    event = {
      sequence: registry.events.length + 1, cohort_id: TARGET, state: "CANARY", effective_at: input.observedAt, support_until: null,
      evidence_references: [SUPPORT_PATH, "https://github.com/" + CONSUMER.name + "/actions/runs/" + run.id + "/attempts/" + run.run_attempt, check.html_url],
      canary_evidence: [{
        repository_id: CONSUMER.id, repository: CONSUMER.name, merge_revision: revision,
        observed_cohort_id: TARGET, observed_record_digest: RECORD, observed_event_digest: QUALIFIED,
        required_context: CONTEXT, integration_id: 15368, conclusion: "success",
        check_run_id: check.id, check_run_url: check.html_url, workflow_run_id: run.id, workflow_id: run.workflow_id,
        caller_workflow_path: CALLER_PATH, caller_workflow_digest: CALLER_DIGEST,
      }],
      previous_event_digest: registry.events.at(-1).event_digest,
    };
    keys(event.canary_evidence[0], ["repository_id", "repository", "merge_revision", "observed_cohort_id", "observed_record_digest", "observed_event_digest", "required_context", "integration_id", "conclusion", "check_run_id", "check_run_url", "workflow_run_id", "workflow_id", "caller_workflow_path", "caller_workflow_digest"], "Closed fifteen-field CANARY proof");
    event.event_digest = cohort.cohortEventDigest(event); nextRegistry.events.push(event);
    cohort.validateDocsQualifiedCohorts(nextRegistry, registrySchema, { asOf: input.observedAt });
    cohort.assertDocsCohortAppendOnly(registry, nextRegistry);
    cohort.validateDocsGovernanceReferences(nextRegistry, exceptions, policy, security, { asOf: input.observedAt });
    payload.push({ path: REGISTRY_PATH, content: pretty(nextRegistry) }, { path: SUPPORT_PATH, content: pretty(support) });
  }
  const manifest = {
    schemaVersion: 1, mode, status: "proposed", generatedAt: new Date().toISOString(), observedAt: input.observedAt,
    centralBase: centralCommit.sha, centralTree: centralCommit.tree.sha, consumerMain: revision,
    runId: run.id, runAttempt: run.run_attempt, semanticCheckRunId: check.id,
    recordDigest: RECORD, qualificationEventDigest: QUALIFIED, ...(event ? { appendedEvent: event } : {}),
    repairedWorkflowSource: { revision: WORKFLOW_SHA, blob: WORKFLOW_BLOB, pullRequest: REPAIR.pullRequest, mergedRepairTree: mergeCommit.tree.sha },
    inputManifest: { path: inputPath, sha256: sha256(inputBytes), bytes: inputBytes.length },
    inputs: retained, validators: PINNED_VALIDATORS, artifacts: artifactEvidence,
    files: payload.map(({ path, content }) => { const bytes = Buffer.from(content); return { path, mode: "100644", bytes: bytes.length, sha256: sha256(bytes), gitBlob: blob(bytes) }; }),
    boundaries: { remoteMutations: false, liveNetworkRevalidationRequired: true, executionEnvelopeArtifactProvided: false, centralMergeClaimed: false, globalRecoveryCompleted: false, globalRecoveryAuthorityChanged: false, physicalLifecycleQualifiedByThisBuilder: false },
  };
  // No output exists before every prerequisite, artifact binding and native validation passed.
  await mkdir(output, { recursive: false, mode: 0o700 });
  for (const file of payload) {
    const target = join(output, "files", file.path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, file.content, { flag: "wx", mode: 0o644 });
  }
  await writeFile(join(output, "proposal-manifest.json"), pretty(manifest), { flag: "wx", mode: 0o600 });
  console.log(pretty({ output, mode, status: "proposed", centralBase: centralCommit.sha, consumerMain: revision, files: manifest.files }));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
