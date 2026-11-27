import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "3dccf2c53bf11f3939a19734a58f5e64d96673d0";
const TREE = "a92524845b6d7915e37b61ef40b72bd71634d193";
const SOURCE_LOCK = "sha256:5b411a3b054017041ad9ebb5f4d42eb9d5c39ceddb7242885831ee7bca80df13";
const CLOSURE = "sha256:7957b8b2b7e20efc6f940b77ca596670d2a8555a9ccf10dc00926ad270eae475";
const CONSTRUCTOR = "sha256:3d92a90ceb47e50dc64e04e27c996bed48caa0514165e64b398c8081d00b0e8e";
const PNPM_BUNDLE = "sha256:d34a7b439643e7b8680a817387ec3692c7097ae7a85865c2c15ad6211143d506";
const SELECTORS = ["@napi-rs/wasm-runtime", "@tybys/wasm-util", "fast-uri", "tslib"];
const OLD_FIVE = [
  ["@agent-teams/repository-mutation", "0.2.2"],
  ["@agent-teams/document-authoring", "0.3.2"],
  ["@agent-teams/docs-protocol", "0.6.2"],
  ["@agent-teams/docs-protocol-agent-teams", "0.3.2"],
  ["@agent-teams/engineering-foundation", "1.7.2"],
] as const;
type JsonRecord = Record<string, unknown>;
type FileImage = { path: string; bytes: number; sha256: string; mode: number };
const sha = (bytes: Uint8Array) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const blob = (bytes: Buffer) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

function object(value: unknown, label: string): JsonRecord {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), label);
  return value as JsonRecord;
}
function disjoint(a: string, b: string): void {
  const inside = (root: string, child: string) => child === root || child.startsWith(root + "/");
  assert.ok(!inside(a, b) && !inside(b, a), `Overlapping roots: ${a}, ${b}`);
}
function git(root: string, ...args: string[]): Buffer {
  const result = spawnSync("git", ["--no-replace-objects", "-C", root, ...args], { maxBuffer: 8_388_608 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr?.toString());
  return result.stdout;
}
async function json(path: string): Promise<JsonRecord> {
  return object(JSON.parse(await readFile(path, "utf8")) as unknown, path);
}
async function write(path: string, value: string | Buffer): Promise<void> {
  await writeFile(path, value, { flag: "wx", mode: 0o644 });
}
async function writeJson(path: string, value: unknown): Promise<void> {
  await write(path, JSON.stringify(value, null, 2) + "\n");
}
async function inventory(root: string): Promise<FileImage[]> {
  const names = git(root, "ls-files", "-z").toString().split("\0").filter(Boolean).sort();
  const result: FileImage[] = [];
  for (const path of names) {
    const full = join(root, path), info = await lstat(full);
    assert.ok(info.isFile() && !info.isSymbolicLink(), "Tracked input must be a regular file: " + path);
    const bytes = await readFile(full);
    result.push({ path, bytes: bytes.length, sha256: sha(bytes), mode: info.mode & 0o777 });
  }
  return result;
}
async function moduleDirectories(root: string): Promise<string[]> {
  const found: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.name === ".git") continue;
      const path = join(directory, item.name);
      if (item.name === "node_modules") found.push(path);
      else if (item.isDirectory()) await visit(path);
    }
  }
  await visit(root);
  return found.sort();
}
function frames(path: string, bytes: Buffer): JsonRecord {
  const encoded = bytes.toString("base64"), chunks = Math.ceil(encoded.length / 12_000);
  const item = { path, mode: "100644", bytes: bytes.length, sha256: sha(bytes), gitBlob: blob(bytes), chunks };
  console.log("ORCHESTRATOR_SOURCE_FILE " + JSON.stringify(item));
  for (let index = 0; index < chunks; index++) {
    console.log("ORCHESTRATOR_SOURCE_CHUNK " + JSON.stringify({ path, index, data: encoded.slice(index * 12_000, (index + 1) * 12_000) }));
  }
  console.log("ORCHESTRATOR_SOURCE_END " + JSON.stringify({ path, chunks, sha256: item.sha256 }));
  return item;
}
async function run(root: string, tools: string, evidence: string): Promise<JsonRecord> {
  const pnpm = join(tools, "node_modules/pnpm/bin/pnpm.mjs");
  const argv = ["--max-old-space-size=2048", pnpm, "update", "--recursive", "--include-workspace-root",
    ...SELECTORS, "--depth", "Infinity", "--no-save", "--lockfile-only", "--no-changeset",
    "--ignore-scripts", "--ignore-pnpmfile", "--engine-strict",
    "--config.strict-peer-dependencies=true", "--config.frozen-lockfile=false",
    "--config.prefer-frozen-lockfile=false", "--config.verify-store-integrity=true",
    "--store-dir", join(dirname(evidence), "cache/store"), "--network-concurrency", "4", "--reporter", "append-only"];
  const env: NodeJS.ProcessEnv = { ...process.env, XDG_CACHE_HOME: join(dirname(evidence), "cache"),
    TMPDIR: join(dirname(evidence), "tmp"), CI: "true", PNPM_DISABLE_SELF_UPDATE_CHECK: "true" };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "GITHUB_TOKEN", "GH_TOKEN", "CENTRAL_READ_TOKEN"]) delete env[key];
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, argv, { cwd: root, env, timeout: 600_000, maxBuffer: 8_388_608 });
  const stdout = result.stdout ?? Buffer.alloc(0), stderr = result.stderr ?? Buffer.alloc(0);
  await write(join(evidence, "refresh.stdout.txt"), stdout);
  await write(join(evidence, "refresh.stderr.txt"), stderr);
  const meta = { argv: [process.execPath, ...argv], cwd: root, startedAt, completedAt: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, error: result.error?.message ?? null,
    stdout: { bytes: stdout.length, sha256: sha(stdout) }, stderr: { bytes: stderr.length, sha256: sha(stderr) } };
  await writeJson(join(evidence, "refresh.meta.json"), meta);
  console.log(stdout.toString());
  if (stderr.length) console.log(stderr.toString());
  return meta;
}
async function main(): Promise<void> {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, "agent-teams-ai/agent-teams-orchestrator");
  assert.equal(process.version, "v24.22.3");
  const [rawSource, rawTools, rawEvidence, rawClosure] = process.argv.slice(2);
  assert.ok(rawSource && rawTools && rawEvidence && rawClosure && process.argv.length === 6);
  const source = await realpath(rawSource), tools = await realpath(rawTools), closurePath = await realpath(rawClosure);
  const evidence = resolve(rawEvidence);
  assert.equal(await realpath(dirname(evidence)), dirname(evidence));
  disjoint(source, tools); disjoint(source, evidence); disjoint(source, closurePath); disjoint(tools, evidence);
  await mkdir(evidence, { recursive: false });
  await mkdir(join(dirname(evidence), "cache"), { recursive: true });
  await mkdir(join(dirname(evidence), "tmp"), { recursive: true });
  assert.equal(git(source, "rev-parse", "HEAD").toString().trim(), SOURCE);
  assert.equal(git(source, "rev-parse", "HEAD^{tree}").toString().trim(), TREE);
  assert.equal(git(source, "status", "--porcelain=v1", "--untracked-files=all").length, 0);
  assert.equal(git(source, "ls-files", "--others", "--ignored", "--exclude-standard", "-z").length, 0);
  assert.deepEqual(await moduleDirectories(source), []);
  assert.equal(await readFile(join(source, ".node-version"), "utf8"), "26.11.1\n");
  assert.equal((await json(join(source, "package.json"))).packageManager, "pnpm@11.18.0");
  assert.equal((await json(join(tools, "node_modules/pnpm/package.json"))).version, "11.18.0");
  assert.equal((await json(join(tools, "node_modules/yaml/package.json"))).version, "2.9.0");
  assert.equal(sha(await readFile(join(tools, "node_modules/pnpm/dist/pnpm.mjs"))), PNPM_BUNDLE);
  const lockPath = join(source, "pnpm-lock.yaml"), beforeBytes = await readFile(lockPath);
  const closureBytes = await readFile(closurePath);
  assert.equal(sha(beforeBytes), SOURCE_LOCK); assert.equal(sha(closureBytes), CLOSURE);
  const scriptRoot = dirname(fileURLToPath(import.meta.url));
  const constructorPath = join(scriptRoot, "orchestrator-selected-lock.mjs");
  assert.equal(sha(await readFile(constructorPath)), CONSTRUCTOR);
  const module: unknown = await import(new URL("./orchestrator-selected-lock.mjs", import.meta.url).href);
  const build = object(module, "constructor module").createSelectedLockDraft;
  assert.ok(typeof build === "function");
  const require = createRequire(join(tools, "package.json"));
  const yaml: unknown = require("yaml");
  const parse = object(yaml, "yaml module").parse;
  assert.ok(typeof parse === "function");
  const parseLock = (bytes: Buffer) => object(Reflect.apply(parse, yaml, [bytes.toString()]) as unknown, "lock");
  const before = await inventory(source);
  await writeJson(join(evidence, "before-inventory.json"), before);
  await write(join(evidence, "source-lock-before.yaml"), beforeBytes);
  await write(join(evidence, "canonical-closure.json"), closureBytes);
  const meta = await run(source, tools, evidence);
  const createdModules = await moduleDirectories(source);
  for (const path of createdModules) await rm(path, { recursive: true, force: false });
  const after = await inventory(source), afterBytes = await readFile(lockPath);
  await writeJson(join(evidence, "after-inventory.json"), after);
  await writeJson(join(evidence, "created-modules-cleanup.json"), { paths: createdModules.map(path => relative(source, path)), removed: true });
  await write(join(evidence, "pnpm-lock.yaml"), afterBytes);
  await write(join(evidence, "source-refresh.patch"), git(source, "diff", "--binary", "HEAD", "--", "pnpm-lock.yaml"));
  assert.equal(meta.exitCode, 0, "Real source refresh did not complete successfully");
  assert.equal(meta.signal, null); assert.equal(meta.error, null);
  assert.deepEqual(after.filter(item => item.path !== "pnpm-lock.yaml"), before.filter(item => item.path !== "pnpm-lock.yaml"));
  assert.equal(after.find(item => item.path === "pnpm-lock.yaml")?.mode, 0o644);
  assert.equal(git(source, "status", "--porcelain=v1", "--untracked-files=all").toString(), " M pnpm-lock.yaml\n");
  assert.equal(git(source, "ls-files", "--others", "--ignored", "--exclude-standard", "-z").length, 0);
  const oldLock = parseLock(beforeBytes), newLock = parseLock(afterBytes);
  const policyKeys = [...new Set([...Object.keys(oldLock), ...Object.keys(newLock)])].filter(key => !["packages", "snapshots"].includes(key));
  for (const key of policyKeys) assert.deepEqual(newLock[key], oldLock[key], "Changed importer or lock policy: " + key);
  const oldPackages = object(oldLock.packages, "old packages"), newPackages = object(newLock.packages, "new packages");
  const oldFive = OLD_FIVE.map(([name, version]) => {
    const key = name + "@" + version;
    assert.ok(oldPackages[key]); assert.deepEqual(newPackages[key], oldPackages[key], "Changed original managed package: " + key);
    const resolution = object(object(newPackages[key], key).resolution, "resolution");
    return { name, version, integrity: resolution.integrity, packageEntryUnchanged: true };
  });
  const inspected = object(Reflect.apply(build, undefined,
    [{ sourceLockBytes: afterBytes, closureBytes, expectedClosureDigest: CLOSURE, yaml, mode: "inspect" }]) as unknown, "inspection result");
  const report = object(inspected.report, "inspection report");
  await writeJson(join(evidence, "selected-lock-inspection.json"), report);
  assert.equal(report.outcome, "inspection-clear"); assert.deepEqual(report.collisions, []);
  assert.equal(report.qualificationAuthority, false); assert.equal(report.publicAdmission, "not-run");
  const sourceLock = object(report.sourceLock, "inspected source lock"); assert.equal(sourceLock.sha256, sha(afterBytes));
  const result = { schemaVersion: 1, scope: "source-lock-prerequisite", outcome: "passed",
    qualificationAuthority: false, publicAdmission: "not-run", controllerExecuted: false, sourceCommitCreated: false,
    run: { id: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, workflowCommit: process.env.GITHUB_SHA },
    source: { root: source, revision: SOURCE, tree: TREE, nodePin: "26.11.1\n", lockBefore: SOURCE_LOCK,
      lockAfter: sha(afterBytes), lockBlobAfter: blob(afterBytes), changedPaths: ["pnpm-lock.yaml"], allOtherBytesAndModesUnchanged: true },
    runtime: { node: process.version, executable: process.execPath, nodeSha256: sha(await readFile(process.execPath)),
      pnpm: "11.18.0", pnpmEntrypointSha256: sha(await readFile(join(tools, "node_modules/pnpm/bin/pnpm.mjs"))),
      pnpmBundleSha256: sha(await readFile(join(tools, "node_modules/pnpm/dist/pnpm.mjs"))), yaml: "2.9.0" },
    operator: { compiledSha256: sha(await readFile(fileURLToPath(import.meta.url))), constructorSha256: CONSTRUCTOR,
      compiler: "typescript@7.0.2", strictTypecheckRequiredByWorkflow: true },
    closure: CLOSURE, selectors: SELECTORS, oldFive, importerAndPolicyUnchanged: true,
    materializedModules: createdModules.length > 0, createdModulesRemoved: true,
    inspection: { outcome: report.outcome, collisions: report.collisions },
    command: { exitCode: meta.exitCode, metadataSha256: sha(await readFile(join(evidence, "refresh.meta.json"))) },
    remaining: ["review actual source diff", "canonical source commit", "qualified target selection", "public source-admission prepare", "fresh physical lifecycle"] };
  await writeJson(join(evidence, "source-refresh.json"), result);
  const exported: JsonRecord[] = [];
  for (const name of ["pnpm-lock.yaml", "source-refresh.patch", "source-refresh.json", "selected-lock-inspection.json", "refresh.meta.json", "refresh.stdout.txt", "refresh.stderr.txt"]) {
    exported.push(frames(name, await readFile(join(evidence, name))));
  }
  await writeJson(join(evidence, "export-manifest.json"), exported);
  console.log("ORCHESTRATOR_SOURCE_RESULT " + JSON.stringify({ outcome: "passed", sourceRevision: SOURCE,
    lockSha256: result.source.lockAfter, fileCount: exported.length, qualificationAuthority: false, sourceCommitCreated: false }));
}
await main();
