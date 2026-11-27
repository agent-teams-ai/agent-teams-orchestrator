#!/usr/bin/env node
// Local operator aid only. It constructs no authority, preparation, or receipt.
// Foreign-scope semantics follow the owner at EF 23acc1283caa576d2303a588eaaeb6ddc2911eb0:
// packages/docs-protocol-agent-teams/src/consumer-integration/adapters/node-consumer-restoration-lock.ts.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const exec = promisify(execFile);
const ROOTS = ["@agent-teams/docs-protocol", "@agent-teams/docs-protocol-agent-teams", "@agent-teams/engineering-foundation"];
const COORDINATES = ["@agent-teams/repository-mutation", "@agent-teams/document-authoring", ...ROOTS];
const SECTIONS = ["dependencies", "devDependencies", "optionalDependencies"];
const OWNER = "https://github.com/agent-teams-ai/engineering-foundation/blob/23acc1283caa576d2303a588eaaeb6ddc2911eb0/packages/docs-protocol-agent-teams/src/consumer-integration/adapters/node-consumer-restoration-lock.ts";
const sha = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const blob = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const object = (value, label) => {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be a mapping`);
  return value;
};
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => {
    assert(!["__proto__", "prototype", "constructor"].includes(key), "Prototype-bearing keys are refused");
    return [key, sorted(value[key])];
  }));
}
const json = (value) => JSON.stringify(sorted(value));
const same = (a, b) => json(a) === json(b);
const digestPattern = /^sha256:[a-f0-9]{64}$/u;

function argumentsFor(argv) {
  const [mode, ...rest] = argv;
  assert(mode === "inspect" || mode === "construct", "First argument must be inspect or construct");
  const names = new Set(["source-lock", "source-lock-sha256", "source-repository", "source-revision", "canonical-closure", "closure-sha256", "yaml-module", "output-dir"]);
  const result = { mode };
  assert(rest.length % 2 === 0, "Each named argument requires one value");
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i].replace(/^--/u, "");
    assert(rest[i].startsWith("--") && names.has(key) && !(key in result), `Unknown or duplicate argument ${rest[i]}`);
    result[key] = rest[i + 1];
  }
  for (const name of names) assert(typeof result[name] === "string" && result[name].length > 0, `Missing --${name}`);
  assert(digestPattern.test(result["source-lock-sha256"]) && digestPattern.test(result["closure-sha256"]), "Both input SHA256 selections are mandatory");
  assert(/^[a-f0-9]{40}$/u.test(result["source-revision"]), "Source revision must be an exact Git SHA");
  return result;
}

async function readStable(path, limit, expected) {
  assert(isAbsolute(path) && resolve(path) === path && await realpath(path) === path, "Input path must be absolute and canonical");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat({ bigint: true });
    assert(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(limit), "Input must be one bounded regular file without hardlinks");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    const selected = await lstat(path, { bigint: true });
    assert(!selected.isSymbolicLink() && selected.dev === before.dev && selected.ino === before.ino && selected.nlink === 1n, "Input path changed");
    for (const key of ["size", "mtimeNs", "ctimeNs"]) assert(before[key] === after[key] && after[key] === selected[key], "Input changed during read");
    assert(bytes.length === Number(before.size), "Incomplete input read");
    const digest = sha(bytes);
    if (expected !== undefined) assert.equal(digest, expected, "Input SHA256 selection differs");
    return { bytes, identity: { path, sha256: digest, gitBlob: blob(bytes), bytes: bytes.length } };
  } finally { await handle.close(); }
}

function commentsOf(document, yaml) {
  const comments = [document.commentBefore, document.comment].filter((value) => typeof value === "string");
  yaml.visit(document, (_key, node) => {
    if (yaml.isAlias(node)) throw new Error("YAML aliases are refused");
    if (!yaml.isNode(node)) return;
    for (const value of [node.commentBefore, node.comment]) if (typeof value === "string") comments.push(value);
  });
  return comments.sort();
}

function parseLock(bytes, yaml) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const document = yaml.parseDocument(text, { uniqueKeys: true, keepSourceTokens: true });
  assert.equal(document.errors.length, 0, "Lock YAML must parse without errors");
  assert.equal(document.warnings.length, 0, "Unsupported lock YAML warnings are refused");
  const comments = commentsOf(document, yaml);
  const value = object(document.toJS({ maxAliasCount: 0 }), "Lock");
  json(value); // Reject prototype-bearing keys before cloning/mutation.
  assert.equal(String(value.lockfileVersion), "9.0", "Only pnpm lockfileVersion9 is supported");
  for (const key of ["importers", "packages", "snapshots"]) object(value[key], key);
  return { document, comments, value };
}

// The following four functions reproduce the owner's bounded non-owned projection,
// not a new runtime/qualification API. Missing snapshots for foreign links remain verbatim.
function locator(lock, name, version) {
  assert.equal(typeof version, "string", "Importer/dependency resolution must be a string");
  return Object.hasOwn(lock.snapshots, version) ? version : `${name}@${version}`;
}
function reach(lock, roots, requiredOnly = false) {
  const pending = [...roots], visited = new Set();
  while (pending.length) {
    const key = pending.pop();
    if (visited.has(key) || !Object.hasOwn(lock.snapshots, key)) continue;
    assert(visited.size < 8192, "Lock graph exceeds the owner's bounded scope");
    visited.add(key);
    const snapshot = object(lock.snapshots[key], key);
    for (const section of requiredOnly ? ["dependencies"] : ["dependencies", "optionalDependencies"]) {
      for (const [name, version] of Object.entries(object(snapshot[section] ?? {}, section))) pending.push(locator(lock, name, version));
    }
  }
  return visited;
}
function rootsFor(lock) {
  const owned = [], foreign = [];
  for (const [path, importer] of Object.entries(lock.importers)) {
    for (const section of SECTIONS) {
      for (const [name, binding] of Object.entries(object(importer[section] ?? {}, section))) {
        const isOwned = path === "." && section === "devDependencies" && ROOTS.includes(name);
        (isOwned ? owned : foreign).push(locator(lock, name, object(binding, name).version));
      }
    }
  }
  return { owned, foreign };
}
function nonOwnedProjection(lock) {
  const copy = structuredClone(lock), roots = rootsFor(lock);
  for (const [path, importer] of Object.entries(copy.importers)) {
    for (const section of SECTIONS) {
      const entries = object(importer[section] ?? {}, section);
      if (path === "." && section === "devDependencies") for (const name of ROOTS) delete entries[name];
      if (Object.keys(entries).length === 0) delete importer[section];
    }
  }
  const managed = reach(lock, roots.owned), preserved = reach(lock, roots.foreign);
  const preservedPackages = new Set([...preserved].map((key) => key.split("(", 1)[0]));
  for (const key of managed) {
    if (!preserved.has(key)) delete copy.snapshots[key];
    const physical = key.split("(", 1)[0];
    if (!preservedPackages.has(physical)) delete copy.packages[physical];
  }
  return { value: copy, managed, preserved, preservedPackages };
}

function withoutOptional(snapshot) {
  const result = structuredClone(snapshot);
  delete result.optional; // Only runtime-closure's cohort-relative optional flag is normalized.
  return result;
}
function differences(before, after, path = "", result = []) {
  if (same(before, after)) return result;
  if (before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) differences(before[key], after[key], path ? `${path}.${key}` : key, result);
  } else result.push({ path, before: before ?? null, after: after ?? null });
  return result;
}

function inspectClosure(bytes, expectedDigest) {
  const projection = object(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), "Closure");
  assert.equal(`${json(projection)}\n`, bytes.toString("utf8"), "Closure input must be the exact canonical JSON artifact");
  assert.equal(sha(bytes), expectedDigest);
  assert.equal(projection.domain, "agent-teams.docs-runtime-closure/v2");
  assert.equal(projection.schemaVersion, 2);
  assert.equal(projection.packageManager, "pnpm@11.20.0");
  assert(Array.isArray(projection.coordinates) && projection.coordinates.length === 5, "Expected the five managed coordinates");
  assert.deepEqual(projection.coordinates.map((x) => x.name).sort(), [...COORDINATES].sort());
  for (const coordinate of projection.coordinates) {
    assert.equal(coordinate.role, ROOTS.includes(coordinate.name) ? "direct" : "transitive");
    assert(/^\d+\.\d+\.\d+$/u.test(coordinate.version) && /^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(coordinate.integrity), "Non-exact coordinate");
  }
  const lock = object(projection.pnpmLock, "Closure pnpmLock");
  assert.equal(String(lock.lockfileVersion), "9.0");
  assert.deepEqual(Object.keys(lock.importers), ["."]);
  assert.deepEqual(Object.keys(lock.importers["."]), ["devDependencies"]);
  assert.deepEqual(Object.keys(lock.importers["."].devDependencies).sort(), [...ROOTS].sort());
  const owned = rootsFor(lock).owned, graph = reach(lock, owned);
  assert.equal(graph.size, projection.packageCount);
  assert.deepEqual([...graph].sort(), Object.keys(lock.snapshots).sort(), "Closure contains unvisited snapshots");
  assert.deepEqual([...new Set([...graph].map((key) => key.split("(", 1)[0]))].sort(), Object.keys(lock.packages).sort(), "Closure contains unrelated package metadata");
  for (const coordinate of projection.coordinates) assert.equal(lock.packages[`${coordinate.name}@${coordinate.version}`]?.resolution?.integrity, coordinate.integrity);
  return projection;
}

function inspectCollisions(source, projection, preserved) {
  const target = projection.pnpmLock, collisions = [];
  for (const key of ["autoInstallPeers", "excludeLinksFromLockfile"]) {
    if (!same(source.settings?.[key], target.settings[key])) collisions.push({ kind: "settings", key, differences: differences(source.settings?.[key], target.settings[key], key) });
  }
  for (const [key, value] of Object.entries(target.snapshots)) {
    const existing = preserved.value.snapshots[key];
    if (existing !== undefined && !same(withoutOptional(existing), withoutOptional(value))) {
      collisions.push({ kind: "snapshot", locator: key, foreignReachable: preserved.preserved.has(key), differences: differences(withoutOptional(existing), withoutOptional(value)) });
    }
  }
  for (const [key, value] of Object.entries(target.packages)) {
    const existing = preserved.value.packages[key];
    if (existing !== undefined && !same(existing, value)) collisions.push({ kind: "package", locator: key, foreignReachable: preserved.preservedPackages.has(key), differences: differences(existing, value) });
  }
  return collisions;
}

function construct(source, projection, preserved, yaml) {
  const document = source.document.clone(), target = projection.pnpmLock;
  for (const section of ["snapshots", "packages"]) {
    for (const key of Object.keys(source.value[section])) if (!Object.hasOwn(preserved.value[section], key)) document.deleteIn([section, key]);
    for (const [key, value] of Object.entries(target[section])) if (!Object.hasOwn(preserved.value[section], key)) document.setIn([section, key], value);
  }
  for (const name of ROOTS) {
    const binding = object(source.value.importers["."]?.devDependencies?.[name], `Source managed root ${name}`);
    assert.deepEqual(Object.keys(binding).sort(), ["specifier", "version"], "Unknown managed root binding fields require owner review");
    for (const key of ["specifier", "version"]) {
      const node = document.getIn(["importers", ".", "devDependencies", name, key], true);
      assert(yaml.isScalar(node), "Managed root binding must use ordinary scalars");
      node.value = target.importers["."].devDependencies[name][key];
    }
  }
  const bytes = Buffer.from(document.toString({ lineWidth: 0 }), "utf8");
  const candidate = parseLock(bytes, yaml);
  assert.deepEqual(candidate.comments, source.comments, "Construction would lose or merge a source comment; refuse for owner review");
  assert(same(nonOwnedProjection(candidate.value).value, preserved.value), "Construction changes the owner's non-owned lock projection");
  const roots = rootsFor(candidate.value).owned, graph = reach(candidate.value, roots), required = reach(candidate.value, roots, true);
  const snapshots = Object.fromEntries([...graph].sort().map((key) => {
    const snapshot = structuredClone(candidate.value.snapshots[key]);
    if (required.has(key)) delete snapshot.optional;
    else snapshot.optional = true;
    return [key, snapshot];
  }));
  const packages = Object.fromEntries([...new Set([...graph].map((key) => key.split("(", 1)[0]))].sort().map((key) => [key, candidate.value.packages[key]]));
  assert(same(snapshots, target.snapshots) && same(packages, target.packages), "Constructed managed graph differs from the selected canonical input");
  assert(bytes.length <= 32 * 1024 * 1024, "Constructed lock exceeds the public input bound");
  return bytes;
}

// Pure operator-aid interface for the Host reconciliation helper. This is not a
// published Docs API. The caller owns the origin/custody of its source bytes.
// In particular, a just-resolved Host lock is not relabelled as a committed source.
export function createSelectedLockDraft({ sourceLockBytes, closureBytes, expectedClosureDigest, yaml, mode = "inspect" }) {
  assert(mode === "inspect" || mode === "construct", "Invalid draft mode");
  assert(digestPattern.test(expectedClosureDigest), "Exact closure SHA256 selection is required");
  const sourceBytes = Buffer.from(sourceLockBytes), selectedClosureBytes = Buffer.from(closureBytes);
  assert(sourceBytes.length > 0 && sourceBytes.length <= 32 * 1024 * 1024 && selectedClosureBytes.length > 0 && selectedClosureBytes.length <= 2 * 1024 * 1024, "Draft input exceeds bounds");
  const source = parseLock(sourceBytes, yaml), projection = inspectClosure(selectedClosureBytes, expectedClosureDigest);
  const adapterVersion = projection.coordinates.find((entry) => entry.name === "@agent-teams/docs-protocol-agent-teams").version;
  const preserved = nonOwnedProjection(source.value), collisions = inspectCollisions(source.value, projection, preserved);
  const report = {
    schemaVersion: 1, kind: "orchestrator-selected-lock-draft", mode,
    outcome: collisions.length ? "collision" : "inspection-clear",
    qualificationAuthority: false, publicAdmission: "not-run", ownerSource: OWNER,
    sourceLock: { sha256: sha(sourceBytes), gitBlob: blob(sourceBytes), bytes: sourceBytes.length },
    targetClosure: { sha256: sha(selectedClosureBytes), gitBlob: blob(selectedClosureBytes), bytes: selectedClosureBytes.length, adapterVersion, packageManager: projection.packageManager, packageCount: projection.packageCount, coordinates: projection.coordinates },
    selectedLock: null,
    counts: { sourceManagedSnapshots: preserved.managed.size, sourceForeignSnapshots: preserved.preserved.size, sourcePreservedSnapshots: Object.keys(preserved.value.snapshots).length, sourcePreservedPackages: Object.keys(preserved.value.packages).length, targetManagedSnapshots: projection.packageCount, sourceComments: source.comments.length },
    collisions,
  };
  let bytes;
  if (mode === "construct" && adapterVersion !== "0.8.0") {
    report.outcome = "unsupported-construction-input";
    report.error = "Construction requires the actual hash-bound 0.8.0 canonical closure; historical inputs are inspect-only.";
  } else if (mode === "construct" && collisions.length === 0) {
    try {
      bytes = construct(source, projection, preserved, yaml);
      report.selectedLock = { sha256: sha(bytes), gitBlob: blob(bytes), bytes: bytes.length };
      report.outcome = "constructed-unadmitted";
      report.inspection = { commentsPreserved: true, nonOwnedProjectionPreserved: true, managedGraphMatchesSelectedInput: true };
    } catch (error) {
      report.outcome = "construction-refused";
      report.error = error.message;
    }
  }
  return { report, ...(bytes === undefined ? {} : { bytes }) };
}

async function gitSource(repository, revision, bytes) {
  assert(isAbsolute(repository) && await realpath(repository) === repository, "Source repository path must be canonical");
  const git = async (...args) => (await exec("git", ["--no-replace-objects", "-C", repository, ...args], { encoding: "buffer", maxBuffer: 40 * 1024 * 1024 })).stdout;
  assert.equal((await git("rev-parse", "--verify", `${revision}^{commit}`)).toString().trim(), revision);
  const tree = (await git("rev-parse", `${revision}^{tree}`)).toString().trim();
  const entry = (await git("ls-tree", "-z", revision, "--", "pnpm-lock.yaml")).toString();
  const match = /^(100644|100755) blob ([a-f0-9]{40})\tpnpm-lock\.yaml\0$/u.exec(entry);
  assert(match, "Selected source must contain an ordinary committed pnpm-lock.yaml");
  assert.equal(blob(bytes), match[2], "Source input does not equal the selected Git lock blob");
  assert((await git("cat-file", "blob", match[2])).equals(bytes));
  return { repository, revision, tree, mode: match[1] };
}

function contains(parent, child) {
  const part = relative(parent, child);
  return part === "" || (!isAbsolute(part) && part !== ".." && !part.startsWith(`..${sep}`));
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  const output = args["output-dir"];
  assert(isAbsolute(output) && resolve(output) === output && await realpath(output) === output && (await lstat(output)).isDirectory(), "Output directory must already exist with canonical parents");
  for (const root of [args["source-repository"], dirname(args["source-lock"]), dirname(args["canonical-closure"]), dirname(args["yaml-module"])]) {
    assert(!contains(await realpath(root), output), "Outputs must remain outside source, authority artifact and parser installation");
  }
  const [sourceInput, targetInput, parserInput] = await Promise.all([
    readStable(args["source-lock"], 32 * 1024 * 1024, args["source-lock-sha256"]),
    readStable(args["canonical-closure"], 2 * 1024 * 1024, args["closure-sha256"]),
    readStable(args["yaml-module"], 1024 * 1024),
  ]);
  const yaml = await import(pathToFileURL(parserInput.identity.path).href);
  const git = await gitSource(args["source-repository"], args["source-revision"], sourceInput.bytes);
  const result = createSelectedLockDraft({ sourceLockBytes: sourceInput.bytes, closureBytes: targetInput.bytes, expectedClosureDigest: targetInput.identity.sha256, yaml, mode: args.mode });
  const candidate = result.bytes;
  const report = {
    ...result.report,
    sourceLock: { ...sourceInput.identity, git },
    targetClosure: { ...result.report.targetClosure, path: targetInput.identity.path },
    parser: parserInput.identity,
    selectedLock: result.report.selectedLock === null ? null : { ...result.report.selectedLock, path: `${output}/selected-target-lock.yaml` },
  };
  // Recheck inputs before any artifact write. The aid never modifies a source file.
  await Promise.all([
    readStable(args["source-lock"], 32 * 1024 * 1024, sourceInput.identity.sha256),
    readStable(args["canonical-closure"], 2 * 1024 * 1024, targetInput.identity.sha256),
  ]);
  const reportPath = `${output}/selected-target-lock-report.json`;
  if (candidate) await writeFile(report.selectedLock.path, candidate, { flag: "wx", mode: 0o600 });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ outcome: report.outcome, report: reportPath, collisions: report.collisions.length, selectedLock: report.selectedLock, qualificationAuthority: false, publicAdmission: "not-run" })}\n`);
  if (!["inspection-clear", "constructed-unadmitted"].includes(report.outcome)) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Selected-lock draft refused: ${error.message}\n`);
    process.exitCode = 1;
  });
}
