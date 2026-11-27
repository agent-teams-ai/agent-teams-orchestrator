#!/usr/bin/env node
// Disposable dependency preflight only. Prepared images are inert fixture inputs.
// No lifecycle summary, completion receipt, document success narrative, or final Host export is produced.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { chmod, lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createSelectedLockDraft } from "./orchestrator-selected-lock.mjs";

import { assertDisjoint, applyTextEdits, reconcilePackage, reconcileWorkspace, emitTextFrames, boundedCommandFailure } from "./orchestrator-host-integration.mjs";
const BASE = "c01efb6813f0c048497caeefbb8235cead480cb2";
const SOURCE = "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67";
const SOURCE_TREE = "a24da96493edd1c6fe3bd5868d4cf636007bcf04";
const COHORT = "docs-2026-11-27-orchestrator-v3";
const RECORD = "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c";
const REQUIRED_HASH = "a26ff983529afb2b492706253293664df596705bdaae7882aa6b030c16905f35";
const EVIDENCE_PATH = "docs/research/evidence/managed-docs-orchestrator-v3-2026-11-27";
const INPUT_BINDING = {
  "sourceRevision": "ccc73331a2ca4f498a51fb6ee0f50b5d0cecff67",
  "sourceTree": "a24da96493edd1c6fe3bd5868d4cf636007bcf04",
  "sourceLockSha256": "sha256:0ebee389b33d6ee41beb3f4a3dd28e20f956c177b17a2911d5a812160ea07044",
  "sourceLockGitBlob": "596614ef81a97d2b825e06d15086ca36dd20656a",
  "originalMainRevision": "3dccf2c53bf11f3939a19734a58f5e64d96673d0",
  "sourceAdmission": {
    "metaSha256": "sha256:94296a4fcdec10ce7e4eb054edb8341a54478a695a4df930d1e138f9bb1dd1a5",
    "stdoutSha256": "sha256:75d35e87cbc93c3016584bb8a19f73a422488932447e9fb486ad034a2d178977",
    "preparationSha256": "sha256:b7849c93c324c184c2aaccfc9c86a98e1a2a62c5957e4fabb75b6c09f247cae7",
    "replayable": false,
    "finalPhysicalConsumerQualified": false
  },
  "authoritySnapshotRevision": "d167b2360524474240a43e3ff70e35eb94e109c7",
  "target": {
    "cohortId": "docs-2026-11-27-orchestrator-v3",
    "recordDigest": "sha256:f61e98c96fcc7beab30b6956312dead50a363c403fd67cdce4d0f18e8e69424c",
    "qualificationEventDigest": "sha256:4451ea715ef68048c01e182fe4755acc4639d7d2e106e536e2b240834e7084c0",
    "policy": {
      "id": "agent-teams.docs-protocol-current-policy",
      "version": "3.1.0",
      "digest": "sha256:18db0135d1d6191ef78c1feb243f5dc672aaed9985f52be1a72af4fdd7e9bb4e"
    },
    "workflow": {
      "repository": "agent-teams-ai/.github",
      "path": ".github/workflows/docs-protocol-check.yml",
      "revision": "997f24396598f93cf1b03bb26436a5ec7686ddef",
      "blobSha": "714af12998ef140dd55a2ec3057f67775586cfd7"
    },
    "callerDigest": "sha256:2ce33590e2d5d36a14bcdf3f16e6ca5422c4b3ebe300f3ac4d94343cc022e1ac",
    "closure": {
      "digest": "sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475",
      "path": "governance/docs-runtime-closures/sha256-7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475.json",
      "packageCount": 88
    },
    "packages": {
      "repositoryMutation": {
        "name": "@agent-teams/repository-mutation",
        "version": "0.5.2",
        "integrity": "sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg=="
      },
      "documentAuthoring": {
        "name": "@agent-teams/document-authoring",
        "version": "0.3.9",
        "integrity": "sha512-a6SOuytNOoKJVW+pp51AUMhrjzTvbYvro6nUuAFqmu0l0G63xkSAnhpwlaPJbHSbSBvoIawm8z+nL8OVMFIY3A=="
      },
      "docsProtocol": {
        "name": "@agent-teams/docs-protocol",
        "version": "0.6.9",
        "integrity": "sha512-rZ7Ie43dmN+m8LjCdXt5iqOP5h41M/TWNFg7bwvV05/XuSJrJF4udBLXIReqqVfeqdoYrFNxPbTknKJ30N6aTA=="
      },
      "docsProtocolAgentTeams": {
        "name": "@agent-teams/docs-protocol-agent-teams",
        "version": "0.8.0",
        "integrity": "sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg=="
      },
      "engineeringFoundation": {
        "name": "@agent-teams/engineering-foundation",
        "version": "4.0.3",
        "integrity": "sha512-D/q979O6OOhsS3IpkwKwb1wNDcXcJESKbYATz7Gk8biiXYxC2tIGi5S9er/DQDbghOnzrilipKxvTMJZ1GGolg=="
      }
    }
  },
  "controller": {
    "version": "0.8.0",
    "integrity": "sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg==",
    "buildIdentity": "sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80"
  },
  "kernel": {
    "version": "0.5.2",
    "integrity": "sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg==",
    "buildIdentity": "sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1"
  },
  "runtime": {
    "node24": "24.22.3",
    "node26": "26.12.1",
    "sourcePin": "26.11.1\n",
    "targetPin": "26.12.1\n",
    "sourcePnpm": "11.18.0",
    "targetPnpm": "11.20.0"
  },
  "selectedLock": {
    "path": "/workspace/scratch/e36de90adcfd/iam-e2e-resume-20261127/selected-lock-v3-preparation/actual-7957/selected-target/selected-target-lock.yaml",
    "bytes": 320228,
    "sha256": "sha256:a8080107bb13e2170fee5e3f25f30ff5df835cd5e540e66f177a0ef0e57c264b",
    "gitBlob": "5b452244b3d74dd49432e659abd575efca49c4c2"
  },
  "selectedLockReportSha256": "sha256:4e04cf99c102c94f4289922a0bfb9a710ef6a7b6f578b126cbcaa3e26c716cdf"
};
const ASSETS = [
  ".github/workflows/docs-protocol.yml",
  ".node-version",
  "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
].sort();
const FULL_ASSETS = [".github/workflows/docs-protocol.yml", ".node-version",
  "architecture/foundation/docs-consumer-integration.json",
  "architecture/foundation/docs-protocol-managed-state.json"];
const PREPARATION_SHA256 = "sha256:b7849c93c324c184c2aaccfc9c86a98e1a2a62c5957e4fabb75b6c09f247cae7";
const NON_DOCUMENT_EDITS = [
  ".github/workflows/architecture.yml",
  ".github/workflows/docs.yml",
  ".github/workflows/od035-native-research.yml",
  ".github/workflows/reviewrouter-interaction.yml",
  "scripts/architecture/quality-source-coverage.test.mjs",
  "scripts/docs/docs-protocol-profile.test.mjs",
  "scripts/security/validate-reviewrouter-workflow.mjs"
];
const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");
const blob = (b) => createHash("sha1").update("blob " + b.length + "\0").update(b).digest("hex");
const utf8 = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
function within(parent, child) {
  const r = relative(parent, child);
  return r === "" || (!r.startsWith(".." + sep) && r !== ".." && !isAbsolute(r));
}
function git(root, ...argv) {
  const r = spawnSync("git", ["-C", root, ...argv], { encoding: "utf8", timeout: 30_000 });
  assert.equal(r.status, 0, "Git observation failed: " + argv.join(" "));
  return r.stdout;
}
function sensitive(text) {
  return /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|https?:\/\/[^/\s]+:[^/\s]+@|Authorization:\s*(?:Bearer|Basic)\s+\S+|_authToken\s*[=:]\s*\S+)/i.test(text);
}
async function regular(root, name, limit = 1_048_576) {
  assert.ok(!isAbsolute(name) && name.split(/[\\/]/).every((p) => p !== ".." && p !== ""));
  const path = join(root, name), st = await lstat(path);
  assert.ok(st.isFile() && !st.isSymbolicLink(), "Not a regular selected file: " + name);
  assert.ok(st.size <= limit, "Selected file exceeds bounded export: " + name);
  assert.ok(within(root, await realpath(path)));
  const bytes = await readFile(path);
  assert.equal(bytes.length, st.size);
  return { bytes, mode: (st.mode & 0o111) ? "100755" : "100644", permissions: st.mode & 0o777 };
}
async function writeOwned(root, name, bytes, mode = "100644") {
  const path = join(root, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  await chmod(path, mode === "100755" ? 0o755 : 0o644);
}
function describe(path, bytes, mode = "100644") {
  return { path, bytes: bytes.length, sha256: sha(bytes), gitBlob: blob(bytes), mode };
}

function parsePreflightArgs(argv) {
  const keys = ["candidate", "source", "preparation", "controller-root", "controller", "node24", "node26", "corepack", "closure", "export"];
  assert.equal(argv.length, keys.length * 2);
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    assert.ok(argv[i].startsWith("--") && keys.includes(key) && !Object.hasOwn(args, key));
    assert.ok(isAbsolute(argv[i + 1])); args[key] = resolve(argv[i + 1]);
  }
  assert.deepEqual(Object.keys(args).sort(), keys.sort()); return args;
}
async function materializePreparedFixture(args) {
  assert.equal(git(args.candidate, "rev-parse", "HEAD").trim(), BASE);
  assert.equal(git(args.candidate, "status", "--porcelain=v1", "--untracked-files=all"), "");
  assert.equal(git(args.source, "rev-parse", "HEAD").trim(), SOURCE);
  assert.equal(git(args.source, "rev-parse", "HEAD^{tree}").trim(), SOURCE_TREE);
  assert.equal(git(args.source, "status", "--porcelain=v1", "--untracked-files=all"), "");
  const originalHostLock = await regular(args.candidate, "pnpm-lock.yaml");
  const preparation = await regular(dirname(args.preparation), basename(args.preparation), 16_777_216);
  assert.equal(sha(preparation.bytes), PREPARATION_SHA256);
  const prepared = JSON.parse(utf8(preparation.bytes));
  assert.equal(prepared.sourceRevision, SOURCE); assert.equal(prepared.sourceTree, SOURCE_TREE);
  assert.equal(prepared.controller.buildIdentity, INPUT_BINDING.controller.buildIdentity);
  assert.equal(prepared.kernel.buildIdentity, INPUT_BINDING.kernel.buildIdentity);
  assert.equal(prepared.targetCohort.cohortId, COHORT); assert.equal(prepared.targetCohort.recordDigest, RECORD);
  assert.deepEqual(prepared.plan.operations.map((x) => x.path).sort(), ASSETS);
  const images = new Map();
  for (const operation of prepared.plan.operations) {
    const image = operation.postimage, bytes = Buffer.from(image.contentBase64, "base64");
    assert.equal(bytes.toString("base64"), image.contentBase64);
    assert.equal(bytes.length, image.size); assert.equal(sha(bytes), image.digest);
    assert.ok([0o644, 0o755].includes(image.mode));
    images.set(operation.path, { bytes, mode: image.mode === 0o755 ? "100755" : "100644" });
  }
  assert.equal(sha(images.get("pnpm-lock.yaml").bytes), INPUT_BINDING.selectedLock.sha256);
  for (const path of FULL_ASSETS) {
    const image = images.get(path); await writeOwned(args.candidate, path, image.bytes, image.mode);
  }
  const hostPackage = await json(join(args.candidate, "package.json"));
  const sourcePackage = JSON.parse(git(args.source, "show", SOURCE + ":package.json"));
  const targetPackage = JSON.parse(utf8(images.get("package.json").bytes));
  await writeOwned(args.candidate, "package.json", JSON.stringify(reconcilePackage(hostPackage, sourcePackage, targetPackage), null, 2) + "\n");
  await writeOwned(args.candidate, "pnpm-workspace.yaml", reconcileWorkspace(
    await readFile(join(args.candidate, "pnpm-workspace.yaml"), "utf8"), utf8(images.get("pnpm-workspace.yaml").bytes)));
  for (const path of NON_DOCUMENT_EDITS) {
    const before = await readFile(join(args.candidate, path), "utf8");
    await writeOwned(args.candidate, path, applyTextEdits(path, before, { authorityRevision: "", runUrl: "" }));
  }
  assert.equal(sha((await regular(args.candidate, "pnpm-lock.yaml")).bytes), sha(originalHostLock.bytes));
  assert.equal(sha(await readFile(join(args.candidate, "architecture/foundation/required-quality-tests.json"))), "sha256:" + REQUIRED_HASH);
  return { preparationSha256: PREPARATION_SHA256, originalPreparationConsumer: prepared.consumer,
    preparedPlanDigest: prepared.plan.planDigest, originalHostLock: describe("pnpm-lock.yaml", originalHostLock.bytes),
    preparedImageFiles: [...images].map(([path, image]) => describe(path, image.bytes, image.mode)),
    preparationReplayed: false, physicalRootRebound: false };
}
async function executeDependencyPreflight(args, controllerRoot, fixture) {
  const commandsRoot = join(args.export, "commands"); await mkdir(commandsRoot);
  const shimDir = join(args.export, "bin");
  await mkdir(shimDir);
  const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
  await writeOwned(shimDir, "pnpm", "#!/bin/sh\nexec " + quote(args.node26) + " " + quote(args.corepack) + ' pnpm "$@"\n', "100755");
  const env = { ...process.env, PATH: shimDir + ":" + dirname(args.node26) + ":" + process.env.PATH,
    COREPACK_ENABLE_NETWORK: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0", COREPACK_DEFAULT_TO_LATEST: "0" };
  delete env.NODE_OPTIONS; delete env.NODE_PATH;
  delete env.GITHUB_TOKEN; delete env.GH_TOKEN; delete env.CENTRAL_READ_TOKEN;
  const ownResults = [];
  async function run(label, executable, argv, timeout = 1_200_000) {
    const out = join(commandsRoot, label + ".stdout.txt"), err = join(commandsRoot, label + ".stderr.txt");
    const stdout = openSync(out, "wx"), stderr = openSync(err, "wx");
    const startedAt = new Date().toISOString();
    let result;
    try { result = spawnSync(executable, argv, { cwd: args.candidate, env, stdio: ["ignore", stdout, stderr], timeout }); }
    finally { closeSync(stdout); closeSync(stderr); }
    const stdoutBytes = await readFile(out), stderrBytes = await readFile(err);
    const item = { label, argv: [executable, ...argv], cwd: args.candidate, startedAt,
      completedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal ?? null,
      executionError: result.error ? { name: result.error.name, code: result.error.code, message: result.error.message } : null,
      stdout: describe(label + ".stdout.txt", stdoutBytes), stderr: describe(label + ".stderr.txt", stderrBytes) };
    ownResults.push(item);
    await writeFile(join(commandsRoot, label + ".meta.json"), JSON.stringify(item, null, 2) + "\n", { flag: "wx" });
    if (result.status !== 0) {
      const failure = boundedCommandFailure(item, stdoutBytes, stderrBytes);
      const failureBytes = Buffer.from(JSON.stringify(failure, null, 2) + "\n", "utf8");
      await writeFile(join(commandsRoot, label + ".failure.json"), failureBytes, { flag: "wx" });
      emitTextFrames("ORCHESTRATOR_HOST_PREFLIGHT_FAILURE", "commands/" + label + ".failure.json", failureBytes);
    }
    assert.equal(result.status, 0, "Host command failed: " + label + " (see retained command output)");
    return stdoutBytes.toString("utf8");
  }
  const pnpm = (label, argv, timeout) => run(label, args.node26, [args.corepack, "pnpm", ...argv], timeout);
  assert.equal((await run("node26-version", args.node26, ["--version"])).trim(), "v26.12.1");
  assert.equal((await run("node24-version", args.node24, ["--version"])).trim(), "v24.22.3");
  assert.equal((await pnpm("pnpm-version", ["--version"])).trim(), "11.20.0");
  await pnpm("lock-generation", ["install", "--lockfile-only", "--ignore-scripts", "--config.engine-strict=true", "--strict-peer-dependencies"]);

  const closureInput = await regular(dirname(args.closure), basename(args.closure), 2_097_152);
  assert.equal(sha(closureInput.bytes), INPUT_BINDING.target.closure.digest);
  const yamlEntry = await realpath(createRequire(args.controller).resolve("yaml"));
  assert.ok(within(controllerRoot, yamlEntry), "YAML parser must come from the retained controller installation");
  const yaml = await import(pathToFileURL(yamlEntry).href);
  const initialHostLock = await regular(args.candidate, "pnpm-lock.yaml");
  let lockDraft = createSelectedLockDraft({ sourceLockBytes: initialHostLock.bytes,
    closureBytes: closureInput.bytes, expectedClosureDigest: INPUT_BINDING.target.closure.digest,
    yaml, mode: "construct" });
  let foreignDependencyRefresh = null;
  async function hostForeignInventory() {
    const paths = [...new Set(git(args.candidate, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
      .split("\0").filter((path) => path && path !== "pnpm-lock.yaml"))].sort();
    const rows = [];
    for (const path of paths) {
      const file = await regular(args.candidate, path);
      rows.push({ ...describe(path, file.bytes, file.mode), filesystemMode: file.permissions });
    }
    const pending = [args.candidate];
    let visited = 0;
    while (pending.length) {
      const directory = pending.pop();
      assert.ok(++visited <= 10_000, "Candidate directory inventory exceeded its bound");
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === ".git") continue;
        assert.notEqual(entry.name, "node_modules", "Lock-only refresh must not materialize a workspace installation");
        if (entry.isDirectory()) pending.push(join(directory, entry.name));
      }
    }
    return rows;
  }
  const refreshedNames = new Set();
  for (let pass = 1; lockDraft.report.collisions.length && pass <= 2; pass += 1) {
    const collisions = lockDraft.report.collisions;
    const names = new Set();
    const targetClosure = JSON.parse(utf8(closureInput.bytes));
    for (const collision of collisions) {
      assert.equal(collision.kind, "snapshot", "Only observed dependency-edge conflicts permit a package-manager refresh");
      assert.equal(collision.foreignReachable, true);
      for (const difference of collision.differences) {
        const match = /^(?:dependencies|optionalDependencies)\.(.+)$/.exec(difference.path);
        assert.ok(match && typeof difference.before === "string" && typeof difference.after === "string",
          "Non-dependency snapshot changes require explicit review");
        const name = match[1];
        assert.match(name, /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/);
        const version = difference.after.split("(", 1)[0];
        assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
        assert.ok(Object.hasOwn(targetClosure.pnpmLock.packages, name + "@" + version),
          "Refresh destination must exist in the actual canonical closure");
        names.add(name);
      }
    }
    assert.ok(names.size > 0, "Refresh selection must be nonempty");
    for (const name of names) {
      assert.ok(!refreshedNames.has(name), "Repeated unresolved refresh selection requires explicit review: " + name);
      refreshedNames.add(name);
    }
    assert.ok(refreshedNames.size <= 8, "Cumulative refresh selection must remain bounded");
    const protectedDiff = git(args.candidate, "diff", "--binary", "HEAD", "--", ".", ":(exclude)pnpm-lock.yaml");
    const protectedUntracked = git(args.candidate, "ls-files", "--others", "--exclude-standard", "-z");
    const protectedInventory = await hostForeignInventory();
    const beforeRefresh = await regular(args.candidate, "pnpm-lock.yaml");
    const selectors = [...names].sort();
    const command = "host-transitive-lock-refresh-" + pass;
    await writeFile(join(commandsRoot, command + ".before-report.json"), JSON.stringify(lockDraft.report, null, 2) + "\n", { flag: "wx" });
    await pnpm(command, ["update", "--recursive", "--include-workspace-root", ...selectors, "--depth", "Infinity",
      "--no-save", "--lockfile-only", "--no-changeset", "--ignore-scripts", "--ignore-pnpmfile",
      "--engine-strict", "--config.strict-peer-dependencies=true", "--config.frozen-lockfile=false",
      "--config.prefer-frozen-lockfile=false", "--config.verify-store-integrity=true"]);
    assert.equal(git(args.candidate, "diff", "--binary", "HEAD", "--", ".", ":(exclude)pnpm-lock.yaml"), protectedDiff);
    assert.equal(git(args.candidate, "ls-files", "--others", "--exclude-standard", "-z"), protectedUntracked);
    assert.deepEqual(await hostForeignInventory(), protectedInventory,
      "Dependency refresh changed non-lock candidate bytes or modes");
    const refreshed = await regular(args.candidate, "pnpm-lock.yaml");
    foreignDependencyRefresh ??= { maxPasses: 2, passes: [] };
    foreignDependencyRefresh.passes.push({ pass, selectors, before: describe("pnpm-lock.yaml", beforeRefresh.bytes),
      after: describe("pnpm-lock.yaml", refreshed.bytes), command });
    lockDraft = createSelectedLockDraft({ sourceLockBytes: refreshed.bytes,
      closureBytes: closureInput.bytes, expectedClosureDigest: INPUT_BINDING.target.closure.digest,
      yaml, mode: "construct" });
    await writeFile(join(commandsRoot, command + ".after-report.json"), JSON.stringify(lockDraft.report, null, 2) + "\n", { flag: "wx" });
  }
  await writeFile(join(commandsRoot, "host-selected-lock-report.json"), JSON.stringify(lockDraft.report, null, 2) + "\n", { flag: "wx" });
  if (lockDraft.report.outcome !== "constructed-unadmitted" || lockDraft.report.collisions.length || !lockDraft.bytes) {
    emitTextFrames("ORCHESTRATOR_HOST_PREFLIGHT_FAILURE", "commands/host-selected-lock-report.json",
      Buffer.from(JSON.stringify(lockDraft.report, null, 2) + "\n"));
    throw new Error("Host selected lock construction refused; canonical closure and foreign projection remain enforced");
  }
  await writeOwned(args.candidate, "pnpm-lock.yaml", lockDraft.bytes);
  const selectedHostLock = describe("pnpm-lock.yaml", lockDraft.bytes);
  await pnpm("frozen-install", ["install", "--frozen-lockfile", "--config.engine-strict=true", "--strict-peer-dependencies"]);
  assert.equal(sha((await regular(args.candidate, "pnpm-lock.yaml")).bytes), selectedHostLock.sha256,
    "Frozen installation changed the selected Host lock");
  await pnpm("installed-peers", ["peers", "check"]);

  const checked = JSON.parse(await run("managed-check", args.node26, [args.controller, "check", "--consumer", args.candidate, "--json"]));
  assert.equal(checked.outcome, "current"); assert.deepEqual(checked.issues, []);
  const changed = [...new Set([...git(args.candidate, "diff", "--name-only", "-z", "HEAD").split("\0"),
    ...git(args.candidate, "ls-files", "--others", "--exclude-standard", "-z").split("\0")].filter(Boolean))].sort();
  const expected = [...new Set([...ASSETS, ...NON_DOCUMENT_EDITS])].sort();
  assert.deepEqual(changed, expected);
  assert.equal(sha(await readFile(join(args.candidate, "architecture/foundation/required-quality-tests.json"))), "sha256:" + REQUIRED_HASH);
  assert.equal(git(args.source, "status", "--porcelain=v1", "--untracked-files=all"), "");
  const result = { schemaVersion: 1, scope: "prepared-host-dependency-preflight", outcome: "passed",
    qualificationAuthority: false, preparationReplayed: false, finalPhysicalLifecycleQualified: false,
    finalHostExport: false, candidateCommitCreated: false, documentNarrativeUpdated: false,
    candidateParent: BASE, preparationSource: SOURCE, candidateRoot: args.candidate, fixture,
    canonicalRuntimeClosureDigest: INPUT_BINDING.target.closure.digest, selectedHostLock,
    foreignDependencyRefresh, publicManagedCheck: checked, commands: ownResults, changedPaths: changed };
  const bytes = Buffer.from(JSON.stringify(result, null, 2) + "\n");
  await writeFile(join(args.export, "preflight-result.json"), bytes, { flag: "wx" });
  console.log("ORCHESTRATOR_HOST_PREFLIGHT_RESULT " + JSON.stringify({ scope: result.scope, outcome: result.outcome,
    qualificationAuthority: false, finalPhysicalLifecycleQualified: false, finalHostExport: false,
    resultSha256: sha(bytes), selectedHostLock, commands: ownResults.length }));
}
async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, "true", "Draft preflight runs only in an explicitly selected hosted job");
  assert.equal(process.env.GITHUB_REPOSITORY, "agent-teams-ai/agent-teams-orchestrator");
  const args = parsePreflightArgs(process.argv.slice(2));
  for (const key of Object.keys(args).filter((key) => key !== "export")) args[key] = await realpath(args[key]);
  args.export = join(await realpath(dirname(args.export)), basename(args.export));
  const controllerRoot = args["controller-root"];
  assert.ok(within(controllerRoot, args.controller) && within(controllerRoot, args.corepack));
  for (const protectedPath of [args.source, args.preparation, controllerRoot, args.closure, args.export]) assertDisjoint(args.candidate, protectedPath, "Candidate");
  for (const protectedPath of [args.source, args.preparation, controllerRoot, args.closure]) assertDisjoint(args.export, protectedPath, "Preflight output");
  const here = dirname(fileURLToPath(import.meta.url));
  assert.equal(sha(await readFile(join(here, "orchestrator-host-integration.mjs"))), "sha256:944ad54ec304a0fc8e410c28b4a559e4236387f7e25582ca04cdd7eddb337157");
  assert.equal(sha(await readFile(join(here, "orchestrator-selected-lock.mjs"))), "sha256:3d92a90ceb47e50dc64e04e27c996bed48caa0514165e64b398c8081d00b0e8e");
  await mkdir(args.export, { recursive: false });
  const fixture = await materializePreparedFixture(args);
  await writeFile(join(args.export, "fixture-inputs.json"), JSON.stringify(fixture, null, 2) + "\n", { flag: "wx" });
  await executeDependencyPreflight(args, controllerRoot, fixture);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
