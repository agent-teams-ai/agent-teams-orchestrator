// Observe only the actual published installation used by the disposable preflight.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");
assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.GITHUB_REPOSITORY_ID, "1310245598");
const tooling = await realpath(process.cwd());
assert.equal(tooling, resolve(process.env.PREFLIGHT_ROOT, "controller"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
for (const [name,version,integrity] of [
  ["@agent-teams/docs-protocol-agent-teams","0.8.0","sha512-BixlYEalI0/j4auoSLBSBlKJGUXyZeuKS3WI+5nxdiAPg/yyAtKHjhmxuo059YZPn0+R931M0sdpNHRkpgDUDg=="],
  ["@agent-teams/repository-mutation","0.5.2","sha512-eK/HsE/1qt+TXzrrbggXykZJXloFZfZD0ZlwdGbm2Jc9O6lAlhu7+w9BdSeryX/vCyMYWeRLv38S/7V717RPMg=="],
  ["corepack","0.36.0","sha512-SiiJsBhZqdBiPHTEl6OT3sASrRrKIcYTQMsVGXx6EE/gM8WFMwYjeIX8Tt8RiU4Iv2J6LbT8KpGfCOsBpRWB/w=="]
]) {
  const item = lock.packages["node_modules/" + name];
  assert.equal(item.version, version); assert.equal(item.integrity, integrity);
}
const kernelRoot = await realpath("node_modules/@agent-teams/repository-mutation");
const kernelPackage = JSON.parse(await readFile(kernelRoot + "/package.json", "utf8"));
const entry = kernelPackage.exports["."].import;
assert.equal(typeof entry,"string");
const { computeInstalledArtifactBuildIdentity } = await import(pathToFileURL(resolve(kernelRoot, entry)).href);
const controllerRoot = await realpath("node_modules/@agent-teams/docs-protocol-agent-teams");
const controller = await computeInstalledArtifactBuildIdentity({packageRoot:controllerRoot,roots:["dist","assets","schemas"]});
const kernel = await computeInstalledArtifactBuildIdentity({packageRoot:kernelRoot,roots:["dist","schemas"]});
assert.equal(controller, "sha256:5d5563eb771de586b7d43e58aa68d1e62d92a58bff87a362ff5b8b7d582dac80");
assert.equal(kernel, "sha256:89c1df01b0fd3ea5d8db6adf51fa65a92f8509aaffde78217cb31a2c9084e8e1");
const runtimes = {};
for (const [key,version] of [["NODE24","24.22.3"],["NODE26","26.12.1"]]) {
  const path = await realpath(process.env[key]);
  assert.equal(path, process.env[key]);
  assert.equal(execFileSync(path,["--version"],{encoding:"utf8"}).trim(),"v"+version);
  runtimes[key] = {path,version,sha256:sha(await readFile(path))};
}
const corepack = await realpath("node_modules/corepack/dist/corepack.js");
assert.equal(sha(await readFile(corepack)), "sha256:3655bc798f300951f2070fee411b337d626b0c3ae80c2d24c46ccac4595d4bf9");
console.log(JSON.stringify({schemaVersion:1,scope:"prepared-host-preflight-installation",qualificationAuthority:false,
  controllerBuildIdentity:controller,kernelBuildIdentity:kernel,runtimes,corepackSha256:sha(await readFile(corepack))},null,2));
