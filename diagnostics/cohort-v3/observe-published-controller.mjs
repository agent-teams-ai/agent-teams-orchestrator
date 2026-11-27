// Actual isolated installation observation only. Never invokes a consumer or lifecycle CLI.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, lstat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const exec = promisify(execFile);
const sha = (bytes) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const encode = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const json = (bytes) => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
const digest = (bytes) => ({ bytes: bytes.length, sha256: sha(bytes) });
const publicEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !name.toLowerCase().startsWith("npm_config_") &&
  !/^(?:GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GITHUB_ENTERPRISE_TOKEN|NPM_TOKEN|NODE_AUTH_TOKEN|ACTIONS_RUNTIME_TOKEN|ACTIONS_ID_TOKEN_REQUEST_TOKEN)$/iu.test(name)));

async function main(argv) {
  const names = ["collection", "controller-root", "node24", "node26"];
  const args = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i]?.slice(2), value = argv[i + 1];
    assert.ok(argv[i]?.startsWith("--") && names.includes(name) && value && !args.has(name), "Unknown, missing or duplicate argument.");
    args.set(name, value);
  }
  assert.equal(args.size, names.length);
  assert.ok(!process.env.NODE_OPTIONS && !process.env.NODE_PATH, "Runtime loader overrides are not admitted.");
  assert.deepEqual({ node: process.versions.node, platform: process.platform, architecture: process.arch }, { node: "24.22.3", platform: "linux", architecture: "x64" });
  const collection = await realpath(args.get("collection"));
  const node24 = await realpath(args.get("node24")), node26 = await realpath(args.get("node26"));
  assert.equal(node24, await realpath(process.execPath));
  const target = resolve(args.get("controller-root"));
  const root = join(await realpath(dirname(target)), basename(target));
  assert.ok(root !== collection && !root.startsWith(collection + "/") && !collection.startsWith(root + "/"), "Controller installation must be separate from all collected artifacts.");
  const preparedBytes = await readFile(join(collection, "preparation-manifest.json"));
  const prepared = json(preparedBytes);
  assert.equal(prepared.target, "docs-2026-11-27-orchestrator-v3");
  assert.equal(prepared.qualified, false);
  assert.deepEqual(prepared.appendedStates, ["PUBLISHED_UNQUALIFIED"]);
  for (const field of ["actualPublicationObserved", "signatureAuditExecuted", "sourceWorkflowProvenanceCheckedAgainstActualApi", "actualPinnedRuntimeClosureResolved"]) assert.equal(prepared.verificationScope[field], true);
  const candidatePath = "governance/evidence/docs-cohorts/docs-2026-11-27-orchestrator-v3/candidate-input.json";
  const candidateBytes = await readFile(join(collection, candidatePath));
  assert.equal(sha(candidateBytes), prepared.candidateDigest);
  const candidate = json(candidateBytes), packages = candidate.proposedRecord.packages;
  const adapter = packages.find((pkg) => pkg.name === "@agent-teams/docs-protocol-agent-teams");
  const mutation = packages.find((pkg) => pkg.name === "@agent-teams/repository-mutation");
  assert.equal(adapter?.version, "0.8.0"); assert.equal(mutation?.version, "0.5.2");
  for (const pkg of [adapter, mutation]) {
    assert.match(pkg.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
    assert.equal(pkg.registry, "https://registry.npmjs.org/");
    assert.equal(pkg.provenance.signature_verified, true);
  }
  await mkdir(root, { mode: 0o700 }); // exclusive fresh directory, outside the artifact tree
  const config = join(root, "isolated-config"); await mkdir(config, { mode: 0o700 });
  await writeFile(join(config, "user.npmrc"), "", { flag: "wx" });
  await writeFile(join(config, "global.npmrc"), "", { flag: "wx" });
  const env = { ...publicEnv, PATH: `${dirname(node24)}:${publicEnv.PATH ?? ""}`, NPM_CONFIG_USERCONFIG: join(config, "user.npmrc"), NPM_CONFIG_GLOBALCONFIG: join(config, "global.npmrc") };
  const npm = await realpath(join(dirname(node24), "../lib/node_modules/npm/bin/npm-cli.js"));
  const command = async (program, arguments_, options = {}) => exec(program, arguments_, { cwd: root, env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 15 * 60_000, ...options });
  const save = async (name, bytes) => writeFile(join(collection, name), bytes, { flag: "wx", mode: 0o600 });
  const startedAt = new Date().toISOString();
  try {
    const installManifest = encode({ name: "orchestrator-v3-controller-observation", private: true });
    await writeFile(join(root, "package.json"), installManifest, { flag: "wx" });
    const installArgs = [npm, "install", "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", "--registry=https://registry.npmjs.org/", `${adapter.name}@${adapter.version}`, `${mutation.name}@${mutation.version}`, "corepack@0.36.0"];
    let install;
    try { install = await command(node24, installArgs); }
    catch (error) {
      if (typeof error.stdout === "string") await save("controller-install.stdout.log", error.stdout);
      if (typeof error.stderr === "string") await save("controller-install.stderr.log", error.stderr);
      throw new Error(`Actual published-controller install failed (exit ${error.code ?? "unknown"}); retained logs contain its output.`);
    }
    await save("controller-install.stdout.log", install.stdout); await save("controller-install.stderr.log", install.stderr);
    const lockBytes = await readFile(join(root, "package-lock.json")), lock = json(lockBytes);
    for (const pkg of [adapter, mutation]) {
      const entry = lock.packages[`node_modules/${pkg.name}`];
      assert.equal(entry.version, pkg.version); assert.equal(entry.integrity, pkg.integrity);
      assert.equal(entry.resolved, `https://registry.npmjs.org/${pkg.name}/-/${pkg.name.split("/")[1]}-${pkg.version}.tgz`);
    }
    const corepackEntry = lock.packages["node_modules/corepack"];
    assert.equal(corepackEntry.version, "0.36.0");
    assert.match(corepackEntry.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
    assert.equal(corepackEntry.resolved, "https://registry.npmjs.org/corepack/-/corepack-0.36.0.tgz");
    const controllerRoot = await realpath(join(root, "node_modules/@agent-teams/docs-protocol-agent-teams"));
    const kernelRoot = await realpath(join(root, "node_modules/@agent-teams/repository-mutation"));
    const corepack = await realpath(join(root, "node_modules/corepack/dist/corepack.js"));
    assert.equal((await command(node24, [corepack, "--version"])).stdout.trim(), "0.36.0");
    const installedRequire = createRequire(pathToFileURL(join(root, "package.json")));
    const { computeInstalledArtifactBuildIdentity } = await import(pathToFileURL(installedRequire.resolve("@agent-teams/repository-mutation")));
    const controllerBuildIdentity = await computeInstalledArtifactBuildIdentity({ packageRoot: controllerRoot, roots: ["dist", "assets", "schemas"] });
    const kernelBuildIdentity = await computeInstalledArtifactBuildIdentity({ packageRoot: kernelRoot, roots: ["dist", "schemas"] });
    assert.match(controllerBuildIdentity, /^sha256:(?!0{64}$)[0-9a-f]{64}$/u);
    assert.match(kernelBuildIdentity, /^sha256:(?!0{64}$)[0-9a-f]{64}$/u);
    const observe = async (path, version) => {
      assert.equal(await realpath(path), path); assert.ok((await lstat(path)).isFile());
      const actual = JSON.parse((await command(path, ["-p", "JSON.stringify({node:process.versions.node,platform:process.platform,architecture:process.arch})"])).stdout);
      assert.deepEqual(actual, { node: version, platform: "linux", architecture: "x64" });
      return { ...actual, path, sha256: sha(await readFile(path)) };
    };
    const runtimes = { node24: await observe(node24, "24.22.3"), node26: await observe(node26, "26.12.1"),
      corepack: { version: "0.36.0", entrypoint: corepack, sha256: sha(await readFile(corepack)), integrity: corepackEntry.integrity },
      controllerBuildIdentity, kernelBuildIdentity,
      observationClass: "actual-isolated-published-controller-installation", qualified: false,
      startedAt, completedAt: new Date().toISOString(), collectionManifest: digest(preparedBytes), candidateDigest: prepared.candidateDigest,
      controllerRoot, kernelRoot, installer: { node: node24, npm: (await command(node24, [npm, "--version"])).stdout.trim(), ignoreScripts: true } };
    const runtimeBytes = encode(runtimes);
    await save("controller-package-lock.json", lockBytes);
    await save("controller-package.json", await readFile(join(root, "package.json")));
    await save("runtimes.json", runtimeBytes);
    const summary = { outcome: "observed-only", qualified: false, consumerExecuted: false, lifecycleExecuted: false,
      sourceCollection: digest(preparedBytes), installedController: { lock: { path: "controller-package-lock.json", ...digest(lockBytes) }, runtimes: { path: "runtimes.json", ...digest(runtimeBytes) } }, controllerBuildIdentity, kernelBuildIdentity };
    await save("controller-observation.json", encode(summary));
    console.log("COHORT_V3_CONTROLLER_RESULT " + JSON.stringify(summary));
  } catch (error) {
    await save("controller-observation-failure.json", encode({ qualified: false, failedAt: new Date().toISOString(), message: error.message }));
    throw error;
  }
}

main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
