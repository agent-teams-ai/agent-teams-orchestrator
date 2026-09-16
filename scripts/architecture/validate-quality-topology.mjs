import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const QUALITY_TOPOLOGY_PATH = "architecture/foundation/quality-feature-topology.json";

// Adapt the accepted organization profile and materialized catalog, without
// making the Foundation reader's flat representation a second authority.
export async function checkQualityTopology(root = process.cwd()) {
  const read = (name) => readFile(resolve(root, name), "utf8");
  const authority = JSON.parse(await read("architecture/feature-module-standard-profile.json"));
  const catalog = parse(await read("architecture/package-catalog.yaml"));
  const modules = [];
  for (const entry of catalog.packages) {
    try {
      await stat(resolve(root, entry.path, "package.json"));
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    assert.notEqual(entry.role, "app", "Materialized applications require explicit quality adoption.");
    for (const directory of ["src", "tests"]) {
      assert.ok((await stat(resolve(root, entry.path, directory))).isDirectory(),
        `Quality topology requires ${entry.path}/${directory}.`);
    }
    modules.push({
      root: entry.path,
      sourceRoot: `${entry.path}/src`,
      testRoots: [`${entry.path}/tests`],
    });
  }
  assert.ok(modules.length > 0, "Quality topology requires a materialized module.");
  assert.deepEqual(JSON.parse(await read(QUALITY_TOPOLOGY_PATH)), {
    schemaVersion: 1,
    standard: authority.standard,
    productionRoots: authority.adoption.scope.production_roots,
    applicationRoots: [],
    excludedRoots: authority.adoption.scope.excluded_roots,
    topology: { sourcePolicy: "architecture/foundation/source-dependencies.yaml" },
    modules,
  }, "Quality topology projection has drifted from accepted authority or materialized packages.");
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkQualityTopology();
  console.log("Foundation quality topology projection matches Orchestrator authority.");
}
