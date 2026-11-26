import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { observeAdvisoryGraph, requireCompleteAcyclicGraph } from "./run-advisory-graph.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const fixtureBase = "tooling/architecture-conformance-fixtures";

await test("public Foundation graph observes the existing valid fixture without claiming external resolution", async () => {
  const root = `${fixtureBase}/core-valid`;
  const report = await observeAdvisoryGraph(repositoryRoot, [root]);
  assert.deepEqual(report.files, [`${root}/src/features/task-model/adapters/outbound/read-file.ts`]);
  assert.deepEqual(report.cycles, []);
  assert.deepEqual(report.unresolved, []);
  assert.deepEqual(report.parseFailures, []);
  assert.deepEqual(report.external.map(({ specifier }) => specifier), ["node:fs/promises"]);
  assert.match(report.limits, /tsconfig aliases remain external/u);
  assert.doesNotThrow(() => { requireCompleteAcyclicGraph(report); });
});

await test("public Foundation graph reports the existing real two-file cycle", async () => {
  const root = `${fixtureBase}/cycles/src/features/task-model/application`;
  const report = await observeAdvisoryGraph(repositoryRoot, [root]);
  assert.equal(report.localEdges, 2);
  assert.deepEqual(report.cycles, [[`${root}/first.ts`, `${root}/second.ts`]]);
  assert.deepEqual(report.unresolved, []);
  assert.throws(() => { requireCompleteAcyclicGraph(report); }, /no-circular-dependencies/u);
});

await test("unresolved and computed imports remain visible rather than a successful empty graph", async () => {
  const root = await mkdtemp(join(tmpdir(), "orchestrator-advisory-graph-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/entry.ts"), [
      'import "./missing.js";',
      'import "external-package";',
      'const target = "./computed.js"; void import(target);',
    ].join("\n"));
    const report = await observeAdvisoryGraph(root, ["src"]);
    assert.deepEqual(report.files, ["src/entry.ts"]);
    assert.deepEqual(report.unresolved.map(({ specifier }) => specifier), ["./missing.js"]);
    assert.deepEqual(report.external.map(({ specifier }) => specifier), ["external-package"]);
    assert.equal(report.unresolvedRuntimeReferences.length, 1);
    assert.deepEqual(report.parseFailures, []);
    assert.throws(() => { requireCompleteAcyclicGraph(report); }, /incomplete-local-source-graph/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
