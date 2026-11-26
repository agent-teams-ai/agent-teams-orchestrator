import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  projectQualitySourceTopology,
  type QualitySourceTopology,
} from "@agent-teams/feature-module-standard/quality-topology";
import {
  EXPECTED_STANDARD,
  readProductionFeaturePaths,
  validateConstructActivation,
} from "./validate-feature-module-standard-profile.mjs";

export const QUALITY_TOPOLOGY_PATH = "architecture/foundation/quality-source-topology.json";
export const QUALITY_PROFILE_PATH = "architecture/foundation/quality-source-coverage.yaml";
const AUTHORITY_PATH = "architecture/feature-module-standard-profile.json";
const CATALOG_PATH = "architecture/package-catalog.yaml";
const ADAPTER_PATH = "scripts/architecture/validate-quality-topology.ts";
const PROJECTION_INPUTS = [AUTHORITY_PATH, CATALOG_PATH, QUALITY_PROFILE_PATH, ADAPTER_PATH];

type MaterializedModule = {
  readonly root: string;
  readonly sourceRoot: string;
  readonly testRoots: readonly string[];
};
type QualityProjection = QualitySourceTopology & {
  readonly derivedFrom: readonly { readonly path: string; readonly sha256: string }[];
};

function record(value: unknown, label: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), label);
  return Object.fromEntries(Object.entries(value));
}

function strings(value: unknown): readonly string[] {
  assert.ok(Array.isArray(value), "Quality topology requires an explicit path list.");
  return value.map((path: unknown) => {
    assert.ok(typeof path === "string", "Quality topology paths must be strings.");
    return path;
  });
}

async function materializedModules(root: string, value: unknown): Promise<MaterializedModule[]> {
  assert.ok(Array.isArray(value), "Quality topology requires the package catalog.");
  const modules: MaterializedModule[] = [];
  for (const item of value) {
    const entry = record(item, "Package catalog entries must be records.");
    const packageRoot = entry["path"];
    assert.ok(typeof packageRoot === "string", "Package catalog paths must be strings.");
    try {
      await stat(resolve(root, packageRoot, "package.json"));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    assert.notEqual(
      entry["role"],
      "app",
      "Materialized applications require explicit quality adoption.",
    );
    for (const directory of ["src", "tests"]) {
      assert.ok(
        (await stat(resolve(root, packageRoot, directory))).isDirectory(),
        `Quality topology requires ${packageRoot}/${directory}.`,
      );
    }
    modules.push({
      root: packageRoot,
      sourceRoot: `${packageRoot}/src`,
      testRoots: [`${packageRoot}/tests`],
    });
  }
  assert.ok(modules.length > 0, "Quality topology requires a materialized module.");
  return modules;
}

// The primary local FMS profile remains authoritative. This adapter translates
// its materialized package facts into the public mapper's supported input, then
// records neutral quality roots rather than forging another standard identity.
export async function deriveQualityTopology(root = process.cwd()): Promise<QualityProjection> {
  const inputs = new Map(
    await Promise.all(
      PROJECTION_INPUTS.map(
        async (path) => [path, await readFile(resolve(root, path), "utf8")] as const,
      ),
    ),
  );
  const read = (path: string): string => {
    const source = inputs.get(path);
    assert.ok(source !== undefined, `Missing quality projection input ${path}.`);
    return source;
  };
  const authority = record(JSON.parse(read(AUTHORITY_PATH)), "FMS authority must be a record.");
  assert.deepEqual(
    authority["standard"],
    EXPECTED_STANDARD,
    "Quality topology projection requires the exact accepted FMS v1.1 authority.",
  );
  const adoption = record(authority["adoption"], "FMS adoption must be a record.");
  const scope = record(adoption["scope"], "FMS scope must be a record.");
  const productionRoots = strings(scope["production_roots"]);
  validateConstructActivation(
    adoption["constructs"],
    await readProductionFeaturePaths(root, productionRoots),
  );
  const catalog = record(parse(read(CATALOG_PATH)), "Package catalog must be a record.");
  const quality = record(parse(read(QUALITY_PROFILE_PATH)), "Quality profile must be a record.");
  assert.equal(
    quality["schemaVersion"],
    5,
    "Quality topology requires quality-source-coverage v5.",
  );
  assert.equal(
    quality["topologyPath"],
    QUALITY_TOPOLOGY_PATH,
    "Quality topology path has drifted.",
  );
  const sourcePolicyPath = quality["sourcePolicyPath"];
  assert.ok(typeof sourcePolicyPath === "string", "Quality source policy must be explicit.");
  const topology = projectQualitySourceTopology(
    {
      schemaVersion: 1,
      standard: authority["standard"],
      productionRoots,
      applicationRoots: [],
      excludedRoots: strings(scope["excluded_roots"]),
      topology: { sourcePolicy: sourcePolicyPath },
      modules: await materializedModules(root, catalog["packages"]),
    },
    sourcePolicyPath,
  );
  return {
    ...topology,
    derivedFrom: [...inputs]
      .map(([path, source]) => ({
        path,
        sha256: createHash("sha256").update(source).digest("hex"),
      }))
      .toSorted((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function checkQualityTopology(root = process.cwd()): Promise<void> {
  assert.deepEqual(
    JSON.parse(await readFile(resolve(root, QUALITY_TOPOLOGY_PATH), "utf8")),
    await deriveQualityTopology(root),
    "Quality topology projection has drifted from accepted authority or materialized packages.",
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkQualityTopology();
  console.log("Foundation quality topology projection matches Orchestrator authority.");
}
