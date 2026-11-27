// Task-local preparation only. Supplied API captures are not live network reads.
// No remote writes, package execution, qualification, policy edit, or consumer mutation.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const REPOSITORY = "agent-teams-ai/.github";
const REPOSITORY_ID = 1316243981;
const TARGET = "docs-2026-11-27-orchestrator-v4";
const RETAINED = "docs-2026-11-27-orchestrator-v3";
const BASE = "d167b2360524474240a43e3ff70e35eb94e109c7";
const HEAD = "611cd2a78d1f9104dbf46bab69c3ff0e30ac6d8f";
const TREE = "31561be538b5dc4b4aa02e53278047d79ff4dbaa";
const REGISTRY_PATH = "governance/docs-qualified-cohorts.json";
const WORKFLOW_PATH = ".github/workflows/docs-protocol-check.yml";
const EVIDENCE_PATH = `governance/evidence/docs-cohorts/${TARGET}`;
const RETAINED_PATH = `governance/evidence/docs-cohorts/${RETAINED}`;
const RETAINED_RECORD = "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c";
const RETAINED_CANDIDATE =
  "sha256:235e0dbecb12f8af83ea2524a3ebe706385c866637ca49ccbcbf07a540b53110";
const RETAINED_PUBLICATION =
  "sha256:c0ea6427b1f5fc8c7ed58bf3ee1ee035ca8f63911a0f6bb6fbf8f1823f22792d";
const CLOSURE = "sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475";
const WORKFLOW_BLOB = "714af12998ef140dd55a2ec3057f67775586cfd7";
const RECEIPT_PATH = "scripts/verify-docs-cohort-v2-receipt.mjs";
const RECEIPT_BLOB = "15090b6ce1ca77f3591f3337137d564b4c82dc87";
const SHA = /^(?!0{40}$)[0-9a-f]{40}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const gitBlob = (bytes) =>
  createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const describe = (bytes) => ({
  bytes: bytes.length,
  sha256: sha256(bytes),
  gitBlob: gitBlob(bytes),
});
const parse = (bytes) => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const within = (parent, child) => child === parent || child.startsWith(parent + sep);

async function regularFile(descriptor) {
  assert.ok(object(descriptor) && isAbsolute(descriptor.path) && DIGEST.test(descriptor.sha256));
  assert.equal(await realpath(descriptor.path), descriptor.path, "Input paths must be canonical.");
  const info = await lstat(descriptor.path);
  assert.ok(info.isFile() && !info.isSymbolicLink(), "Input must be a regular file.");
  assert.ok(info.size <= 8 * 1024 * 1024, "Input exceeds the bounded capture size.");
  const bytes = await readFile(descriptor.path);
  assert.equal(sha256(bytes), descriptor.sha256, `Changed input: ${descriptor.path}`);
  if (descriptor.bytes !== undefined) assert.equal(bytes.length, descriptor.bytes);
  return bytes;
}

function assertNativeCI(run, jobs, checks, revision, path, jobName, now) {
  assert.equal(run.repository?.id, REPOSITORY_ID);
  assert.equal(run.repository?.full_name, REPOSITORY);
  assert.equal(run.event, "push");
  assert.equal(run.head_branch, "main");
  assert.equal(run.head_sha, revision);
  assert.equal(run.path, path);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.ok(
    Number.isSafeInteger(run.id) &&
      run.id > 0 &&
      Number.isSafeInteger(run.run_attempt) &&
      run.run_attempt > 0,
  );
  assert.equal(run.html_url, `https://github.com/${REPOSITORY}/actions/runs/${run.id}`);
  assert.ok(Number.isFinite(Date.parse(run.updated_at)) && Date.parse(run.updated_at) <= now);
  assert.equal(jobs.total_count, 1);
  assert.equal(jobs.jobs?.length, 1, "The complete current-attempt native job census is required.");
  const job = jobs.jobs[0];
  assert.equal(job.name, jobName);
  assert.equal(job.run_id, run.id);
  assert.equal(job.run_attempt, run.run_attempt);
  assert.equal(job.head_sha, revision);
  assert.equal(job.status, "completed");
  assert.equal(job.conclusion, "success");
  assert.equal(
    job.html_url,
    `https://github.com/${REPOSITORY}/actions/runs/${run.id}/job/${job.id}`,
  );
  assert.ok(Number.isFinite(Date.parse(job.completed_at)) && Date.parse(job.completed_at) <= now);
  assert.ok(
    Array.isArray(job.steps) &&
      job.steps.some(
        (step) =>
          step.name === "Run pnpm check" &&
          step.status === "completed" &&
          step.conclusion === "success",
      ),
  );
  assert.ok(
    job.steps.every(
      (step) => step.status === "completed" && ["success", "skipped"].includes(step.conclusion),
    ),
  );
  assert.ok(
    Array.isArray(checks.check_runs) && checks.total_count === checks.check_runs.length,
    "Complete check-run capture required.",
  );
  const found = checks.check_runs.filter((check) => check.id === job.id);
  assert.equal(found.length, 1);
  const check = found[0];
  assert.equal(check.app?.id, 15368);
  assert.equal(check.name, jobName);
  assert.equal(check.head_sha, revision);
  assert.equal(check.status, "completed");
  assert.equal(check.conclusion, "success");
  assert.equal(check.details_url, job.html_url);
  return {
    workflow: path,
    runId: run.id,
    runAttempt: run.run_attempt,
    jobId: job.id,
    checkId: check.id,
    completedAt: job.completed_at,
  };
}

export async function prepare(inputDescriptor, outputPath) {
  const inputBytes = await regularFile(inputDescriptor);
  const input = parse(inputBytes);
  assert.equal(input.schemaVersion, 1);
  assert.equal(input.target, TARGET);
  const now = new Date().toISOString();
  assert.ok(
    Number.isFinite(Date.parse(input.observedAt)) &&
      Date.parse(input.observedAt) <= Date.parse(now),
  );
  const capturedAt = Date.parse(input.observedAt);
  assert.ok(isAbsolute(input.centralRoot));
  const central = await realpath(input.centralRoot);
  assert.equal(central, input.centralRoot);
  const keys = [
    "registry",
    "candidate",
    "publication",
    "closure",
    "callerTemplate",
    "workflow",
    "receiptImplementation",
    "mergedPull",
    "mainBranch",
    "mergeCommit",
    "mergeTree",
    "node26Run",
    "node26Jobs",
    "node24Run",
    "node24Jobs",
    "checks",
  ];
  assert.deepEqual(Object.keys(input.files).sort(), [...keys].sort());
  const bytes = Object.fromEntries(
    await Promise.all(keys.map(async (key) => [key, await regularFile(input.files[key])])),
  );
  const raw = Object.fromEntries(
    keys
      .filter((key) => !["callerTemplate", "workflow", "receiptImplementation"].includes(key))
      .map((key) => [key, parse(bytes[key])]),
  );
  const merge = raw.mergedPull,
    branch = raw.mainBranch,
    commit = raw.mergeCommit,
    tree = raw.mergeTree;
  assert.equal(merge.number, 467);
  assert.equal(merge.merged, true);
  assert.equal(merge.state, "closed");
  assert.equal(merge.head?.sha, HEAD);
  assert.equal(merge.base?.ref, "main");
  assert.equal(merge.base?.repo?.id, REPOSITORY_ID);
  assert.equal(merge.base?.repo?.full_name, REPOSITORY);
  const revision = merge.merge_commit_sha;
  assert.match(revision, SHA);
  assert.notEqual(revision, HEAD);
  assert.notEqual(revision, BASE);
  assert.ok(
    Number.isFinite(Date.parse(merge.merged_at)) && Date.parse(merge.merged_at) <= capturedAt,
  );
  assert.equal(commit.sha, revision);
  assert.equal(commit.tree?.sha, TREE);
  assert.deepEqual(
    commit.parents.map((parent) => parent.sha),
    [BASE],
  );
  assert.equal(branch.name, "main");
  assert.equal(branch.protected, true);
  assert.equal(branch.commit?.sha, revision);
  assert.equal(tree.sha, TREE);
  assert.equal(tree.truncated, false);
  assert.ok(Array.isArray(tree.tree));
  const entries = new Map(tree.tree.map((entry) => [entry.path, entry]));
  assert.equal(entries.size, tree.tree.length);
  for (const [path, blob] of [
    [WORKFLOW_PATH, WORKFLOW_BLOB],
    [RECEIPT_PATH, RECEIPT_BLOB],
    ["scripts/verify-docs-consumer-gate.test.mjs", "1720cb51da26b4ddfc1f14b855f81cfdfceb8f90"],
  ]) {
    assert.deepEqual(
      { mode: entries.get(path)?.mode, type: entries.get(path)?.type, sha: entries.get(path)?.sha },
      { mode: "100644", type: "blob", sha: blob },
    );
  }
  assert.equal(gitBlob(bytes.workflow), WORKFLOW_BLOB);
  assert.equal(gitBlob(bytes.receiptImplementation), RECEIPT_BLOB);
  const git = async (...args) =>
    (await exec("git", ["-C", central, ...args], { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 }))
      .stdout;
  assert.equal(
    (await git("rev-parse", "HEAD")).trim(),
    revision,
    "Native validator checkout must be exact actual merge M.",
  );
  assert.equal(
    (await git("rev-parse", "HEAD^{tree}")).trim(),
    TREE,
    "Local merge tree differs from the approved repair.",
  );
  assert.equal(
    (await git("show", "-s", "--format=%P", "HEAD")).trim(),
    BASE,
    "Local merge must have the exact sole parent.",
  );
  assert.equal(
    await git("status", "--porcelain", "--untracked-files=no"),
    "",
    "Native validator checkout is dirty.",
  );
  const registry = raw.registry;
  assert.ok(bytes.registry.equals(encode(registry)), "Canonical registry bytes required.");
  const retained = registry.cohorts.find((row) => row.cohort_id === RETAINED);
  assert.equal(retained?.record_digest, RETAINED_RECORD);
  assert.equal(retained.candidate_digest, RETAINED_CANDIDATE);
  assert.equal(sha256(bytes.candidate), RETAINED_CANDIDATE);
  assert.equal(sha256(bytes.publication), RETAINED_PUBLICATION);
  assert.equal(sha256(bytes.closure), CLOSURE);
  assert.equal(retained.runtime_closure.digest, CLOSURE);
  assert.equal(sha256(bytes.callerTemplate), retained.assets.caller_workflow.digest);
  const {
    candidate_digest: ignoredCandidate,
    record_digest: ignoredRecord,
    ...retainedProposal
  } = retained;
  assert.deepEqual(raw.candidate.proposedRecord, retainedProposal);
  assert.equal(raw.publication.recordDigest, RETAINED_RECORD);
  assert.equal(raw.publication.candidateInputDigest, RETAINED_CANDIDATE);
  assert.equal(raw.publication.qualified, false);
  assert.deepEqual(retained.upgrade_from, ["docs-2026-10-03-stable31"]);
  assert.deepEqual(retained.rollback_to, retained.upgrade_from);
  assert.equal(retained.cohort_generation, 3);
  assert.equal(retained.policy_identity.version, "3.1.0");
  assert.ok(
    !registry.cohorts.some((row) => row.cohort_id === TARGET),
    "Target cohort already exists.",
  );
  const tracked = new Map([
    ["registry", REGISTRY_PATH],
    ["candidate", `${RETAINED_PATH}/candidate-input.json`],
    ["publication", `${RETAINED_PATH}/publication.json`],
    ["closure", retained.runtime_closure.projection_path],
    ["workflow", WORKFLOW_PATH],
    ["receiptImplementation", RECEIPT_PATH],
  ]);
  for (const [key, path] of tracked)
    assert.ok(
      bytes[key].equals(Buffer.from(await git("show", `HEAD:${path}`))),
      `Supplied ${key} differs from actual merge M.`,
    );
  const mainCI = [
    assertNativeCI(
      raw.node26Run,
      raw.node26Jobs,
      raw.checks,
      revision,
      ".github/workflows/ci.yml",
      "check",
      capturedAt,
    ),
    assertNativeCI(
      raw.node24Run,
      raw.node24Jobs,
      raw.checks,
      revision,
      ".github/workflows/node24-compatibility.yml",
      "Node.js 24 compatibility",
      capturedAt,
    ),
  ];

  const priorCwd = process.cwd();
  let policy, verifier, schema;
  try {
    process.chdir(central);
    policy = await import(pathToFileURL(join(central, "scripts/docs-cohort-policy.mjs")));
    verifier = await import(
      pathToFileURL(join(central, "scripts/verify-docs-cohort-evidence.mjs"))
    );
    schema = parse(await readFile(join(central, "governance/docs-qualified-cohorts.schema.json")));
    policy.validateDocsQualifiedCohorts(registry, schema, { asOf: now });
  } finally {
    process.chdir(priorCwd);
  }
  const proposed = structuredClone(retainedProposal);
  proposed.cohort_id = TARGET;
  proposed.reusable_workflow.revision = revision; // The workflow file blob is intentionally unchanged.
  proposed.assets.caller_workflow.rendered_digest = sha256(
    verifier.renderCallerWorkflowTemplate(bytes.callerTemplate, proposed.reusable_workflow),
  );
  proposed.evidence_references = [
    `${EVIDENCE_PATH}/candidate-input.json`,
    `${EVIDENCE_PATH}/publication.json`,
    ...retained.evidence_references.filter((path) => path.startsWith("https://")),
  ];
  const source = { repository: REPOSITORY, revision, registry: describe(bytes.registry) };
  const verificationScope = {
    retainedPublishedEvidence: true,
    suppliedNewWorkflowAndMainCIObserved: true,
    independentNetworkReadByBuilder: false,
    freshSignatureAuditExecuted: false,
    freshRuntimeClosureResolved: false,
    unchangedFullLiveVerifierCompleted: false,
    hostedTrustedQualificationCompleted: false,
    consumerCanaryExecuted: false,
    defaultBranchDeliveryClaimed: false,
  };
  const candidate = encode({
    evidenceClass: "preparatory-published-cohort-candidate",
    qualified: false,
    assembledAt: now,
    source,
    retainedInputs: {
      cohortId: RETAINED,
      recordDigest: RETAINED_RECORD,
      candidate: describe(bytes.candidate),
      publication: describe(bytes.publication),
      runtimeClosure: describe(bytes.closure),
      attribution:
        "Unchanged published packages, source provenance, assets, policy and closure are retained from actual v3 producer evidence. No fresh package audit or producer resolution is claimed by this preparation.",
    },
    suppliedObservations: {
      input: describe(inputBytes),
      observedAt: input.observedAt,
      mergedPullRequest: { number: 467, revision, mergedAt: merge.merged_at },
      mainCI,
      rawInputs: Object.fromEntries(keys.map((key) => [key, describe(bytes[key])])),
    },
    verificationScope,
    proposedRecord: proposed,
  });
  const record = { ...proposed, candidate_digest: sha256(candidate) };
  record.record_digest = policy.cohortRecordDigest(record);
  const previousPublication = registry.events.find(
    (event) => event.cohort_id === RETAINED && event.state === "PUBLISHED_UNQUALIFIED",
  );
  const publishedAt = record.packages
    .map((entry) => entry.published_at)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .at(-1);
  assert.equal(previousPublication?.effective_at, publishedAt);
  assert.ok(Date.parse(publishedAt) <= Date.parse(now));
  const event = {
    sequence: registry.events.length + 1,
    cohort_id: TARGET,
    state: "PUBLISHED_UNQUALIFIED",
    effective_at: publishedAt,
    support_until: null,
    evidence_references: [
      `${EVIDENCE_PATH}/publication.json`,
      ...retained.evidence_references.filter((path) => path.startsWith("https://")),
    ],
    canary_evidence: [],
    previous_event_digest: registry.events.at(-1)?.event_digest ?? null,
  };
  event.event_digest = policy.cohortEventDigest(event);
  const next = {
    ...registry,
    cohorts: [...registry.cohorts, record],
    events: [...registry.events, event],
  };
  policy.assertDocsCohortAppendOnly(registry, next);
  policy.validateDocsQualifiedCohorts(next, schema, { asOf: now });
  const publication = encode({
    evidenceClass: "preparatory-published-cohort-candidate",
    qualified: false,
    cohortId: TARGET,
    state: event.state,
    preparedAt: now,
    base: source,
    candidateInputPath: `${EVIDENCE_PATH}/candidate-input.json`,
    candidateInputDigest: record.candidate_digest,
    recordDigest: record.record_digest,
    eventDigest: event.event_digest,
    publicationTimeSemantics:
      "Retained actual latest package publication timestamp; not this preparation or qualification time.",
    verificationScope,
    pending: [
      "Fresh trusted full live verification of this exact initial record on source A",
      "Separately reviewed genuine VERIFIED and QUALIFIED append",
      "Fresh final-head required checks and protected main delivery",
      "Separate desired policy and fresh authentic CCC generation2-to3 lifecycle",
      "Actual consumer main evidence and separate observed/CANARY proposals",
    ],
  });
  assert.equal((await git("rev-parse", "HEAD")).trim(), revision);
  assert.equal(await git("status", "--porcelain", "--untracked-files=no"), "");
  const output = resolve(outputPath),
    parent = await realpath(dirname(output));
  assert.equal(parent, dirname(output), "Output parent must be canonical.");
  assert.ok(
    !within(central, output) && !within(output, central),
    "Output must be disjoint from the native checkout.",
  );
  for (const descriptor of [inputDescriptor, ...Object.values(input.files)])
    assert.ok(!within(output, descriptor.path), "Output overlaps an input.");
  await mkdir(output); // Exclusive: an existing destination always refuses.
  const files = [
    [REGISTRY_PATH, encode(next)],
    [`${EVIDENCE_PATH}/candidate-input.json`, candidate],
    [`${EVIDENCE_PATH}/publication.json`, publication],
  ];
  for (const [path, data] of files) {
    const destination = join(output, "files", path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, data, { flag: "wx", mode: 0o644 });
  }
  const result = {
    schemaVersion: 1,
    evidenceClass: "prepared-unqualified-cohort",
    target: TARGET,
    base: revision,
    recordDigest: record.record_digest,
    candidateDigest: record.candidate_digest,
    appendedEvent: { sequence: event.sequence, state: event.state, digest: event.event_digest },
    sourcePrefixPreserved: true,
    qualified: false,
    files: files.map(([path, data]) => ({ path, ...describe(data) })),
    verificationScope,
  };
  await writeFile(join(output, "preparation-manifest.json"), encode(result), {
    flag: "wx",
    mode: 0o644,
  });
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Usage: prepare-orchestrator-v4.mjs /absolute/input.json sha256:<input-hash> /absolute/new-output",
  );
  console.log(
    JSON.stringify(
      await prepare({ path: process.argv[2], sha256: process.argv[3] }, process.argv[4]),
    ),
  );
}
