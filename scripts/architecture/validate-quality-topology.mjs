import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  EXPECTED_STANDARD,
  readProductionFeaturePaths,
  validateConstructActivation,
} from "./validate-feature-module-standard-profile.mjs";

export const QUALITY_TOPOLOGY_PATH = "architecture/foundation/quality-feature-topology.json";

// Foundation 1.7.2 accepts only the flat v1 input. FMS v1.1 retains the same
// obligations while its new constructs are absent; this is a reader-format
// projection, never a second authority or permission to omit production scope.
const FLAT_READER_STANDARD = Object.freeze({
  id: "agent-teams.feature-module-standard",
  version: "v1",
  repository: "agent-teams-ai/.github",
  path: "docs/architecture/feature-module-standard/v1.md",
  git_blob_sha: "d0bfff2033faf544fe65268c1dcdfd524d093015",
  sha256: "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa",
});

export async function checkQualityTopology(root = process.cwd()) {
  const read = (name) => readFile(resolve(root, name), "utf8");
  const authority = JSON.parse(await read("architecture/feature-module-standard-profile.json"));
  assert.deepEqual(
    authority.standard,
    EXPECTED_STANDARD,
    "Quality compatibility projection requires the exact accepted FMS v1.1 authority.",
  );
  validateConstructActivation(
    authority.adoption.constructs,
    await readProductionFeaturePaths(root, ["apps", "packages"]),
  );
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
    assert.notEqual(
      entry.role,
      "app",
      "Materialized applications require explicit quality adoption.",
    );
    for (const directory of ["src", "tests"]) {
      assert.ok(
        (await stat(resolve(root, entry.path, directory))).isDirectory(),
        `Quality topology requires ${entry.path}/${directory}.`,
      );
    }
    modules.push({
      root: entry.path,
      sourceRoot: `${entry.path}/src`,
      testRoots: [`${entry.path}/tests`],
    });
  }
  assert.ok(modules.length > 0, "Quality topology requires a materialized module.");
  assert.deepEqual(
    JSON.parse(await read(QUALITY_TOPOLOGY_PATH)),
    {
      schemaVersion: 1,
      standard: FLAT_READER_STANDARD,
      productionRoots: authority.adoption.scope.production_roots,
      applicationRoots: [],
      excludedRoots: authority.adoption.scope.excluded_roots,
      topology: { sourcePolicy: "architecture/foundation/source-dependencies.yaml" },
      modules,
    },
    "Quality topology projection has drifted from accepted authority or materialized packages.",
  );
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkQualityTopology();
  console.log("Foundation quality topology projection matches Orchestrator authority.");
}
