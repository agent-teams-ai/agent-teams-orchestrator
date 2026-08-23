import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import {
  writeCatalog,
  writeDossier,
  writePlatformOwner,
  writeRootReferences,
} from "./topology-fixture-lib.mjs";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../..");
const scaffolder = path.join(
  repositoryRoot,
  "scripts/architecture/scaffold-package.mjs",
);
const schemaPaths = {
  catalog: path.join(repositoryRoot, "architecture/package-catalog.schema.json"),
  dependencyPolicy: path.join(
    repositoryRoot,
    "architecture/source-dependency-policy.schema.json",
  ),
  materializationPolicy: path.join(
    repositoryRoot,
    "architecture/package-materialization-policy.schema.json",
  ),
};
const targetId = "context.work-coordination";
const targetPath = "packages/contexts/work-coordination";
const planPath = `.agent-teams-local/scaffolding-plans/${targetId}.json`;

function run(root, ...arguments_) {
  return spawnSync(
    process.execPath,
    [scaffolder, ...arguments_, "--root", root],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
}

async function exists(pathname) {
  try {
    await stat(pathname);
    return true;
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

const root = await mkdtemp(path.join(os.tmpdir(), "scaffold-policy-"));
try {
  await Promise.all([
    writeCatalog(root, schemaPaths),
    writeDossier(root, "accepted"),
    writePlatformOwner(root),
    writeRootReferences(root, []),
  ]);
  const planned = run(
    root,
    "plan",
    "--id",
    targetId,
    "--plan",
    planPath,
    "--json",
  );
  assert.equal(planned.status, 0, `${planned.stdout}\n${planned.stderr}`);

  await writeFile(
    path.join(root, "architecture/package-materialization-policy.yaml"),
    YAML.stringify({
      version: 1,
      entries: [
        { package_id: targetId, state: "allowed", blocked_by: [], decision: null },
        {
          package_id: targetId,
          state: "deferred",
          blocked_by: ["OD-999"],
          decision: null,
        },
      ],
    }),
  );
  const applied = run(root, "apply", "--plan", planPath, "--json");
  assert.notEqual(applied.status, 0, "invalid policy unexpectedly applied a Plan");
  assert.match(`${applied.stdout}\n${applied.stderr}`, /duplicate package_id/u);
  assert.equal(await exists(path.join(root, targetPath)), false);
  console.log("Package scaffolding policy qualification passed.");
} finally {
  await rm(root, { recursive: true, force: true });
}
