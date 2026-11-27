// Local one-off preparation. No publication, GitHub mutation, qualification or consumer mutation.
// The cryptographic audit and closure are the existing exact Central implementations.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const CENTRAL = "agent-teams-ai/.github";
const PRODUCER = "agent-teams-ai/engineering-foundation";
const REGISTRY = "https://registry.npmjs.org/";
const REGISTRY_PATH = "governance/docs-qualified-cohorts.json";
const WORKFLOW = ".github/workflows/docs-protocol-check.yml";
const SHA = /^[0-9a-f]{40}$/u;
const SHA512 = /^sha512-[A-Za-z0-9+/]{86}==$/u;
const encode = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
export const sha256 = (bytes) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const gitBlob = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const describe = (bytes) => ({ bytes: bytes.length, sha256: sha256(bytes), gitBlob: gitBlob(bytes) });
const decode = (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const parse = (bytes) => JSON.parse(decode(bytes));
const clone = (value) => structuredClone(value);
const publicChildEnv = (env) => Object.fromEntries(Object.entries(env).filter(([name]) =>
  !/^(?:GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GITHUB_ENTERPRISE_TOKEN|NPM_TOKEN|NODE_AUTH_TOKEN|ACTIONS_RUNTIME_TOKEN|ACTIONS_ID_TOKEN_REQUEST_TOKEN)$/iu.test(name)));
const report = (phase, details = {}) => console.log("COHORT_V3_PHASE " + JSON.stringify({ phase, observedAt: new Date().toISOString(), qualified: false, ...details }));

export function assertRuntime(intent, observed) {
  assert.deepEqual(observed, {
    node: "v" + intent.runtime.qualificationNode,
    platform: intent.runtime.platform,
    architecture: intent.runtime.architecture,
  }, "Producer preparation must run on the exact intended Node/platform/architecture.");
}

export function deriveProvenance(entry, metadata, times, rawAttestations, now) {
  const spec = `${entry.name}@${entry.version}`;
  assert.equal(metadata.name, entry.name, `${spec}: registry package identity changed.`);
  assert.equal(metadata.version, entry.version, `${spec}: registry version changed.`);
  assert.match(metadata.dist?.integrity ?? "", SHA512, `${spec}: actual SHA512 SRI is required.`);
  const publishedAt = times[entry.version];
  assert.ok(typeof publishedAt === "string" && Number.isFinite(Date.parse(publishedAt)), `${spec}: actual publication time is missing.`);
  assert.equal(new Date(publishedAt).toISOString().replace(".000", ""), publishedAt, `${spec}: noncanonical publication timestamp.`);
  assert.ok(Date.parse(publishedAt) <= Date.parse(now), `${spec}: future publication time.`);
  const attestationUrl = `${REGISTRY}-/npm/v1/attestations/${entry.name.replace("/", "%2f")}@${entry.version}`;
  assert.equal(metadata.dist?.attestations?.url, attestationUrl, `${spec}: exact registry attestation URL is required.`);
  const matches = rawAttestations.attestations?.filter((row) => row.predicateType === "https://slsa.dev/provenance/v1");
  assert.equal(matches?.length, 1, `${spec}: exactly one actual SLSA provenance statement is required.`);
  const payload = matches[0].bundle?.dsseEnvelope?.payload;
  assert.ok(typeof payload === "string" && Buffer.from(payload, "base64").toString("base64") === payload, `${spec}: noncanonical attestation payload.`);
  const statement = parse(Buffer.from(payload, "base64"));
  const digest = Buffer.from(metadata.dist.integrity.slice(7), "base64").toString("hex");
  const subjects = statement.subject?.filter((row) => row.name?.endsWith(`@${entry.version}`) && row.digest?.sha512 === digest);
  assert.equal(subjects?.length, 1, `${spec}: provenance does not bind the actual tarball SRI.`);
  const build = statement.predicate?.buildDefinition;
  assert.equal(build?.externalParameters?.workflow?.repository, `https://github.com/${PRODUCER}`);
  assert.equal(build?.externalParameters?.workflow?.path, ".github/workflows/release.yml");
  const commits = build?.resolvedDependencies?.filter((row) => row.digest?.gitCommit).map((row) => row.digest.gitCommit);
  assert.equal(commits?.length, 1, `${spec}: ambiguous source commit.`);
  assert.match(commits[0], SHA);
  const invocation = statement.predicate?.runDetails?.metadata?.invocationId;
  const match = /^https:\/\/github\.com\/agent-teams-ai\/engineering-foundation\/actions\/runs\/([1-9][0-9]*)\/attempts\/([1-9][0-9]*)$/u.exec(invocation ?? "");
  assert.ok(match, `${spec}: exact successful release run/attempt must be independently checked.`);
  const runId = Number(match[1]), attempt = Number(match[2]);
  assert.ok(Number.isSafeInteger(runId) && Number.isSafeInteger(attempt));
  return {
    ...entry, integrity: metadata.dist.integrity, registry: REGISTRY, published_at: publishedAt,
    provenance: {
      source_repository: PRODUCER, source_repository_id: 1316243988,
      source_workflow: ".github/workflows/release.yml", source_commit: commits[0],
      workflow_run_id: runId, workflow_run_attempt: attempt,
      registry_attestation_url: attestationUrl,
      workflow_run_url: `https://github.com/${PRODUCER}/actions/runs/${runId}`,
      // This field is assigned only after the actual Central audit succeeds below.
    },
  };
}

export function assertRelease(packageEntry, run) {
  const p = packageEntry.provenance;
  assert.deepEqual({
    id: run.id, run_attempt: run.run_attempt, head_sha: run.head_sha,
    head_branch: run.head_branch, event: run.event, status: run.status, conclusion: run.conclusion,
    path: run.path, html_url: run.html_url, repository_id: run.repository?.id,
    repository: run.repository?.full_name,
  }, {
    id: p.workflow_run_id, run_attempt: p.workflow_run_attempt, head_sha: p.source_commit,
    head_branch: "main", event: "push", status: "completed", conclusion: "success",
    path: p.source_workflow, html_url: p.workflow_run_url, repository_id: 1316243988,
    repository: PRODUCER,
  }, `${packageEntry.name}: actual origin release attempt is not terminal success. No producer resolution is allowed yet.`);
}

export function assertPublishedEdges(packages, manifests, edges) {
  for (const entry of packages) {
    const manifest = manifests.get(entry.name);
    assert.equal(manifest?.name, entry.name);
    assert.equal(manifest?.version, entry.version);
    const actual = packages.filter((pkg) => Object.hasOwn(manifest.dependencies ?? {}, pkg.name)).map((pkg) => pkg.name).sort();
    const expected = edges.filter((edge) => edge.from === entry.name).map((edge) => edge.to).sort();
    assert.deepEqual(actual, expected, `${entry.name}: published managed dependency edges changed.`);
    for (const name of expected) {
      assert.equal(manifest.dependencies[name], packages.find((pkg) => pkg.name === name).version, `${entry.name}: dependency ${name} is not the exact selected version.`);
    }
  }
}

async function command(program, args, options = {}) {
  return exec(program, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60_000, env: publicChildEnv(process.env), ...options });
}

async function boundedGet(url, limit = 16 * 1024 * 1024) {
  const parsed = new URL(url);
  assert.equal(parsed.protocol, "https:");
  assert.equal(parsed.hostname, "registry.npmjs.org");
  assert.equal(parsed.username + parsed.password + parsed.hash, "");
  const response = await fetch(parsed, { redirect: "error", signal: AbortSignal.timeout(90_000) });
  assert.equal(response.status, 200, `Actual registry publication prerequisite failed: ${url} returned HTTP${response.status}.`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    assert.ok(size <= limit, `Registry response exceeds its bound: ${url}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function main(argv) {
  const allowed = ["central-root", "central-revision", "workflow-revision", "pnpm-bin", "output"];
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index]?.slice(2), value = argv[index + 1];
    assert.ok(argv[index]?.startsWith("--") && allowed.includes(name) && value && !args.has(name), "Unknown, missing or duplicate argument.");
    args.set(name, value);
  }
  assert.equal(args.size, allowed.length, `Required: ${allowed.map((name) => "--" + name).join(" ")}`);
  const intentBytes = await readFile(join(HERE, "selection-intent.json"));
  const intent = parse(intentBytes);
  assert.ok(!process.env.NODE_OPTIONS && !process.env.NODE_PATH, "Runtime loader overrides are not admitted.");
  assertRuntime(intent, { node: process.version, platform: process.platform, architecture: process.arch });
  const central = await realpath(args.get("central-root"));
  const revision = args.get("central-revision"), workflowRevision = args.get("workflow-revision");
  assert.match(revision, SHA); assert.match(workflowRevision, SHA);
  // Explicit flags permit a genuine newer protected main while preserving every new record/event.
  const git = async (...options) => (await command("git", ["-C", central, ...options])).stdout;
  assert.equal((await git("rev-parse", "HEAD")).trim(), revision);
  assert.equal((await git("status", "--porcelain", "--untracked-files=no")).trim(), "", "Trusted Central checkout has tracked edits.");
  await git("merge-base", "--is-ancestor", intent.centralSourceRevision, revision);
  await git("merge-base", "--is-ancestor", workflowRevision, revision);
  const pnpm = await realpath(args.get("pnpm-bin"));
  assert.ok(isAbsolute(pnpm) && (await stat(pnpm)).isFile());
  const npmCli = await realpath(join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"));
  const pinnedEnv = { ...publicChildEnv(process.env), PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ""}` };
  const githubEnv = { ...pinnedEnv };
  for (const name of ["GH_TOKEN", "GITHUB_TOKEN"]) if (process.env[name]) githubEnv[name] = process.env[name];
  const npmVersion = (await command(process.execPath, [npmCli, "--version"], { env: pinnedEnv })).stdout.trim();
  assert.match(npmVersion, /^[0-9]+\.[0-9]+\.[0-9]+$/u);
  const managerProbeRoot = await mkdtemp(join(tmpdir(), "orchestrator-v3-pnpm-preflight-"));
  try {
    // A source consumer packageManager must not select 11.18 during this 11.20 probe.
    assert.equal((await command(pnpm, ["--version"], { cwd: managerProbeRoot, env: pinnedEnv })).stdout.trim(), intent.runtime.pnpm);
  } finally {
    await rm(managerProbeRoot, { recursive: true, force: true });
  }
  const requestedOutput = resolve(args.get("output"));
  const output = join(await realpath(dirname(requestedOutput)), basename(requestedOutput));
  assert.ok(output !== central && !output.startsWith(central + "/") && !central.startsWith(output + "/"), "Output must be separate from the trusted checkout.");
  await mkdir(output, { mode: 0o700 }); // exclusive; a partial previous attempt is never reused
  const files = [];
  const save = async (path, bytes, mode = 0o600) => {
    assert.ok(!isAbsolute(path) && !path.split("/").some((part) => ["", ".", ".."].includes(part)));
    const body = typeof bytes === "string" ? Buffer.from(bytes) : bytes;
    await mkdir(dirname(join(output, path)), { recursive: true, mode: 0o700 });
    await writeFile(join(output, path), body, { flag: "wx", mode });
    files.push({ path, ...describe(body) });
    return body;
  };
  let phase = "read-only-publication-prerequisites";
  const previousCwd = process.cwd();
  process.chdir(central); // Existing Central import-time checks intentionally read their own checkout.
  try {
    const startedAt = new Date().toISOString();
    await save("selection-intent.json", intentBytes);
    const ghCache = new Map();
    let ghSequence = 0;
    const github = async (endpoint) => {
      assert.ok(/^repos\/agent-teams-ai\/(?:engineering-foundation|\.github|agent-teams-orchestrator)(?:\/|$)/u.test(endpoint) && !/\/\.\.?(?:\/|$)/u.test(endpoint));
      if (!ghCache.has(endpoint)) {
        const path = `observations/github/${String(++ghSequence).padStart(3, "0")}.json`;
        const raw = Buffer.from((await command("gh", ["api", "--method", "GET", endpoint], { env: githubEnv })).stdout);
        const value = parse(raw);
        await save(path, raw);
        ghCache.set(endpoint, { value, path, observedAt: new Date().toISOString() });
      }
      return ghCache.get(endpoint).value;
    };
    const [centralRepository, centralBranch, producerRepository, producerBranch, consumerRepository] = await Promise.all([
      github(`repos/${CENTRAL}`), github(`repos/${CENTRAL}/branches/main`),
      github(`repos/${PRODUCER}`), github(`repos/${PRODUCER}/branches/main`),
      github("repos/agent-teams-ai/agent-teams-orchestrator"),
    ]);
    assert.equal(centralRepository.id, 1316243981); assert.equal(centralRepository.full_name, CENTRAL);
    assert.equal(centralRepository.default_branch, "main");
    assert.equal(centralBranch.protected, true); assert.equal(centralBranch.commit?.sha, revision);
    assert.equal(producerRepository.id, 1316243988); assert.equal(producerRepository.full_name, PRODUCER);
    assert.equal(producerRepository.default_branch, "main"); assert.equal(producerBranch.protected, true);
    assert.match(producerBranch.commit?.sha ?? "", SHA);
    assert.equal(consumerRepository.id, 1310245598); assert.equal(consumerRepository.full_name, "agent-teams-ai/agent-teams-orchestrator");
    const policy = await import(pathToFileURL(join(central, "scripts/docs-cohort-policy.mjs")));
    const verifier = await import(pathToFileURL(join(central, "scripts/verify-docs-cohort-evidence.mjs")));
    const runtimePolicy = await import(pathToFileURL(join(central, "scripts/docs-managed-runtime-policy.ts")));
    assert.deepEqual(intent.packages.map(({ name, role }) => ({ name, role })), policy.DOCS_COHORT_V2_PACKAGES);
    const registryBytes = await readFile(join(central, REGISTRY_PATH));
    const registry = parse(registryBytes);
    assert.ok(registryBytes.equals(encode(registry)), "Registry is not canonical JSON; preserve/inspect exact base first.");
    const schema = parse(await readFile(join(central, "governance/docs-qualified-cohorts.schema.json")));
    policy.validateDocsQualifiedCohorts(registry, schema);
    assert.ok(!registry.cohorts.some((row) => row.cohort_id === intent.cohortId), "Target ID already exists.");
    const retained = registry.cohorts.find((row) => row.cohort_id === "docs-2026-11-27-orchestrator-v2");
    assert.ok(retained && retained.cohort_generation === 3);
    assert.deepEqual(retained.canary_repositories, intent.canaryRepositories);
    assert.deepEqual(retained.upgrade_from, intent.upgradeFrom);
    const packages = [], rawByName = new Map();
    // Establish all actual publication and successful origin-run prerequisites before any producer install.
    for (const [index, entry] of intent.packages.entries()) {
      const slug = entry.name.replace("@", "").replace("/", "-");
      const packageUrl = REGISTRY + entry.name.replace("/", "%2f");
      const metadataBytes = await boundedGet(`${packageUrl}/${entry.version}`);
      const packumentBytes = await boundedGet(packageUrl);
      const metadata = parse(metadataBytes), packument = parse(packumentBytes);
      const attestationUrl = `${REGISTRY}-/npm/v1/attestations/${entry.name.replace("/", "%2f")}@${entry.version}`;
      const attestationBytes = await boundedGet(attestationUrl);
      const attestations = parse(attestationBytes);
      await save(`observations/npm/${slug}/metadata.json`, metadataBytes);
      await save(`observations/npm/${slug}/packument.json`, packumentBytes);
      await save(`observations/npm/${slug}/attestations.json`, attestationBytes);
      const published = deriveProvenance(entry, metadata, packument.time ?? {}, attestations, new Date().toISOString());
      const p = published.provenance;
      const run = await github(`repos/${PRODUCER}/actions/runs/${p.workflow_run_id}/attempts/${p.workflow_run_attempt}`);
      assertRelease(published, run);
      const ancestry = await github(`repos/${PRODUCER}/compare/${p.source_commit}...${producerBranch.commit.sha}`);
      assert.ok(["ahead", "identical"].includes(ancestry.status), `${entry.name}: provenance source is not protected-main ancestor.`);
      if (index >= 3) {
        const releaseSource = await github(`repos/${PRODUCER}/compare/${intent.producerVersioningRevision}...${p.source_commit}`);
        assert.ok(["ahead", "identical"].includes(releaseSource.status), `${entry.name}: source predates the selected release implementation/versioning.`);
      }
      packages.push(published); rawByName.set(entry.name, { metadata, attestations, slug });
      report("actual-publication-prerequisite-passed", { package: entry.name, version: entry.version, integrity: published.integrity, publishedAt: published.published_at, sourceCommit: p.source_commit, releaseRun: p.workflow_run_id, releaseAttempt: p.workflow_run_attempt });
    }
    phase = "real-cryptographic-signature-audit";
    let producerLock;
    const run = async (program, arguments_, options = {}) => {
      const env = { ...publicChildEnv(options.env ?? pinnedEnv), PATH: pinnedEnv.PATH };
      const result = program === "npm"
        ? await command(process.execPath, [npmCli, ...arguments_], { ...options, env })
        : await command(program, arguments_, { ...options, env });
      if (program === pnpm && arguments_[0] === "install") {
        assert.equal(producerLock, undefined, "Ambiguous producer install invocation.");
        assert.equal(arguments_[1], "--dir");
        assert.equal(arguments_[2], options.cwd);
        producerLock = await readFile(join(options.cwd, "pnpm-lock.yaml"));
        await save("producer/pnpm-lock.yaml", producerLock);
        await save("producer/package.json", await readFile(join(options.cwd, "package.json")));
        await save("producer/.npmrc", await readFile(join(options.cwd, ".npmrc")));
      }
      return result;
    };
    const verified = await verifier.verifyInstalledPackageSignatures(packages, run);
    await save("observations/npm/cryptographically-verified.json", encode(verified));
    for (const entry of packages) {
      const matches = verified.filter((row) => row.name === entry.name && row.version === entry.version);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].registry, REGISTRY);
      assert.equal(matches[0].attestations?.url, entry.provenance.registry_attestation_url);
      assert.deepEqual(matches[0].attestationBundles, rawByName.get(entry.name).attestations.attestations, `${entry.name}: raw and cryptographically verified attestations differ.`);
      entry.provenance.signature_verified = true;
    }
    report("actual-central-signature-audit-passed", { packages: packages.length, npmVersion, audit: describe(encode(verified)) });
    phase = "actual-published-tarballs-and-assets";
    const manifests = new Map(), adapterFiles = new Map();
    const assetPaths = ["skills/docs/SKILL.md", "assets/docs-protocol.yml", "assets/catalog.json", "assets/transition-catalog.json", "assets/runtime-policy.v1.json"];
    for (const entry of packages) {
      const { metadata, slug } = rawByName.get(entry.name);
      const expectedUrl = `${REGISTRY}${entry.name}/-/${entry.name.split("/")[1]}-${entry.version}.tgz`;
      assert.equal(metadata.dist.tarball, expectedUrl, `${entry.name}: unexpected tarball URL.`);
      const tarball = await boundedGet(expectedUrl, 64 * 1024 * 1024);
      assert.equal("sha512-" + createHash("sha512").update(tarball).digest("base64"), entry.integrity);
      const tarballPath = `packages/${slug}-${entry.version}.tgz`;
      await save(tarballPath, tarball);
      const paths = ["package.json", ...(entry.name === "@agent-teams/docs-protocol-agent-teams" ? assetPaths : [])];
      for (const path of paths) {
        const bytes = (await command("tar", ["-xOf", join(output, tarballPath), `package/${path}`], { encoding: null })).stdout;
        assert.ok(bytes.length <= 2 * 1024 * 1024, `${path}: published member exceeds bound.`);
        await save(`published/${slug}/${path}`, bytes);
        if (path === "package.json") manifests.set(entry.name, parse(bytes));
        if (entry.name === "@agent-teams/docs-protocol-agent-teams") adapterFiles.set(path, bytes);
      }
    }
    assertPublishedEdges(packages, manifests, policy.DOCS_COHORT_V2_DEPENDENCY_EDGES);
    const packedPolicy = parse(adapterFiles.get("assets/runtime-policy.v1.json"));
    assert.equal(packedPolicy.policyId, intent.policy.id); assert.equal(packedPolicy.policyVersion, intent.policy.version);
    assert.equal(packedPolicy.sourceDigest, intent.policy.sourceDigest, "Published policy is not the reviewed policy source.");
    const identity = { id: packedPolicy.policyId, version: packedPolicy.policyVersion, digest: packedPolicy.sourceDigest };
    const selectedRuntime = runtimePolicy.docsCohortV3Runtime(identity);
    assert.deepEqual(packedPolicy.managedRuntime.lanes[selectedRuntime.selectedLane].qualificationRuntime, selectedRuntime.qualificationRuntime);
    assert.equal(packedPolicy.managedRuntime.lanes[selectedRuntime.selectedLane].node, selectedRuntime.node);
    assert.equal(packedPolicy.managedRuntime.pnpm, selectedRuntime.pnpm);
    assert.equal(packedPolicy.compatibilityLane.qualificationVersion, intent.runtime.controllerNode);
    report("actual-tarballs-manifests-and-policy-passed", { packages: packages.length, policy: identity });
    phase = "actual-pinned-runtime-producer-resolution";
    const closure = await verifier.resolvePublishedRuntimeClosure(packages, run, { cohortGeneration: 3, pnpmBinary: pnpm });
    assert.ok(producerLock, "Existing producer helper did not expose an actual generated lockfile.");
    assert.equal(sha256(closure.source), closure.authority.digest);
    await save(closure.authority.projection_path, closure.source, 0o644);
    await save("producer/runtime-closure.json", encode({ observedAt: new Date().toISOString(), runtime: { node: process.version, pnpm: intent.runtime.pnpm, platform: process.platform, architecture: process.arch }, helper: "scripts/verify-docs-cohort-evidence.mjs#resolvePublishedRuntimeClosure", sourceRevision: revision, authority: closure.authority, producerLock: describe(producerLock) }));
    report("actual-producer-closure-resolved", { authority: closure.authority, lock: describe(producerLock) });
    phase = "initial-unqualified-candidate-assembly";
    const workflowSource = Buffer.from(await git("show", `${workflowRevision}:${WORKFLOW}`));
    assert.ok(workflowSource.equals(await readFile(join(central, WORKFLOW))), "Pinned workflow blob must equal current protected main.");
    const reusable = { repository: CENTRAL, repository_id: 1316243981, path: WORKFLOW, revision: workflowRevision, blob_sha: gitBlob(workflowSource) };
    const proposed = {
      cohort_generation: 3, cohort_id: intent.cohortId, channel: "stable", policy_identity: identity,
      packages, dependency_edges: clone(policy.DOCS_COHORT_V2_DEPENDENCY_EDGES), reusable_workflow: reusable,
      schemas: clone(retained.schemas), assets: {},
      runtime: { selected_lane: selectedRuntime.selectedLane, node: selectedRuntime.node, pnpm: selectedRuntime.pnpm,
        qualification_runtime: { node_version: selectedRuntime.qualificationRuntime.nodeVersion, pnpm_version: selectedRuntime.qualificationRuntime.pnpmVersion, platform: selectedRuntime.qualificationRuntime.platform, architecture: selectedRuntime.qualificationRuntime.architecture } },
      runtime_closure: closure.authority,
      eligible_after: new Date(Math.max(...packages.map((pkg) => Date.parse(pkg.published_at))) + 1000).toISOString().replace(".000", ""),
      upgrade_from: intent.upgradeFrom, rollback_to: intent.rollbackTo, canary_repositories: intent.canaryRepositories,
      evidence_references: [],
    };
    for (const [label, path] of [["skill", assetPaths[0]], ["caller_workflow", assetPaths[1]], ["asset_catalog", assetPaths[2]], ["transition_catalog", assetPaths[3]]]) {
      proposed.assets[label] = { package: "@agent-teams/docs-protocol-agent-teams", path, digest: sha256(adapterFiles.get(path)) };
    }
    proposed.assets.caller_workflow.rendered_digest = sha256(verifier.renderCallerWorkflowTemplate(adapterFiles.get(assetPaths[1]), reusable));
    const evidencePath = `governance/evidence/docs-cohorts/${intent.cohortId}`;
    const releaseReferences = [...new Set(packages.map((pkg) => `${pkg.provenance.workflow_run_url}/attempts/${pkg.provenance.workflow_run_attempt}`))];
    proposed.evidence_references = [`${evidencePath}/candidate-input.json`, `${evidencePath}/publication.json`, ...releaseReferences];
    const preparedAt = new Date().toISOString();
    const source = { repository: CENTRAL, revision, registryBlob: gitBlob(registryBytes), registrySha256: sha256(registryBytes) };
    const verificationScope = { actualPublicationObserved: true, signatureAuditExecuted: true, sourceWorkflowProvenanceCheckedAgainstActualApi: true, actualPinnedRuntimeClosureResolved: true, unchangedFullLiveVerifierCompleted: false, hostedTrustedQualificationCompleted: false, consumerCanaryExecuted: false, defaultBranchDeliveryClaimed: false };
    const candidateBytes = encode({ evidenceClass: "preparatory-published-cohort-candidate", qualified: false, assembledAt: preparedAt,
      source, producer: { node: process.version, pnpm: intent.runtime.pnpm, npm: npmVersion }, verificationScope,
      selectionIntent: { ...describe(intentBytes), note: "Explicit five-package selection; no foreign FMS or Stack upgrade." },
      actualEvidence: files, proposedRecord: proposed });
    const record = { ...proposed, candidate_digest: sha256(candidateBytes) };
    record.record_digest = policy.cohortRecordDigest(record);
    const publicationAt = packages.map((pkg) => pkg.published_at).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1);
    const event = { sequence: registry.events.length + 1, cohort_id: intent.cohortId, state: "PUBLISHED_UNQUALIFIED", effective_at: publicationAt, support_until: null,
      evidence_references: [`${evidencePath}/publication.json`, ...releaseReferences], canary_evidence: [], previous_event_digest: registry.events.at(-1)?.event_digest ?? null };
    event.event_digest = policy.cohortEventDigest(event);
    const next = clone(registry); next.cohorts.push(record); next.events.push(event);
    policy.validateDocsQualifiedCohorts(next, schema);
    policy.assertDocsCohortAppendOnly(registry, next);
    assert.deepEqual(next.cohorts.slice(0, -1), registry.cohorts); assert.deepEqual(next.events.slice(0, -1), registry.events);
    assert.equal((await git("status", "--porcelain", "--untracked-files=no")).trim(), "");
    // A fresh read avoids using a cached pre-resolution protected-main observation.
    const endBranchRaw = Buffer.from((await command("gh", ["api", "--method", "GET", `repos/${CENTRAL}/branches/main`], { env: githubEnv })).stdout);
    const endBranch = parse(endBranchRaw);
    assert.equal(endBranch.protected, true); assert.equal(endBranch.commit?.sha, revision, "Central main changed during preparation; rebuild on actual current main.");
    await save("observations/github/final-central-main.json", endBranchRaw);
    await save("observations/github/index.json", encode([...ghCache].map(([endpoint, value]) => ({ endpoint, path: value.path, observedAt: value.observedAt }))));
    const pending = ["Unchanged trusted base-owned full live verification of this exact initial record.", "Actual source-A hosted success, followed by a separately reviewed append of VERIFIED/QUALIFIED and fresh source-B checks.", "Separate desired selection, physical controller migration/recovery, preserved foreign graph and Host integration; actual consumer main checks.", "Actual observed selection and CANARY evidence; no recommendation change."];
    await save(`${evidencePath}/candidate-input.json`, candidateBytes, 0o644);
    await save(`${evidencePath}/publication.json`, encode({ evidenceClass: "preparatory-published-cohort-candidate", qualified: false, cohortId: intent.cohortId,
      state: event.state, preparedAt, base: source, candidateInputPath: `${evidencePath}/candidate-input.json`, candidateInputDigest: record.candidate_digest,
      recordDigest: record.record_digest, eventDigest: event.event_digest,
      publicationTimeSemantics: "Exact latest observed publication timestamp of the five actual packages; preparation time is separate.",
      verificationScope, pending }), 0o644);
    await save(REGISTRY_PATH, encode(next), 0o644);
    const manifest = { schemaVersion: 1, evidenceClass: "local-only-initial-cohort-preparation", qualified: false, startedAt, preparedAt, source,
      target: intent.cohortId, appendedStates: [event.state], recordDigest: record.record_digest, candidateDigest: record.candidate_digest,
      initialEventDigest: event.event_digest, initialEventSequence: event.sequence, runtimeClosure: closure.authority,
      producerLock: { path: "producer/pnpm-lock.yaml", ...describe(producerLock) }, verificationScope, pending,
      builder: describe(await readFile(fileURLToPath(import.meta.url))), files };
    await save("preparation-manifest.json", encode(manifest));
    console.log("COHORT_V3_RESULT " + JSON.stringify({ outcome: "prepared-unqualified", qualified: false, output, target: intent.cohortId, recordDigest: record.record_digest, runtimeClosure: closure.authority.digest }));
  } catch (error) {
    await save("failed-preparation.json", encode({ qualified: false, outcome: "failed", phase, failedAt: new Date().toISOString(), message: error.message, completedFiles: files }));
    throw new Error(`Preparation stopped in ${phase}: ${error.message}`);
  } finally {
    process.chdir(previousCwd);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
