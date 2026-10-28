import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertCMSAccepted, inspectCMS, readCMS } from "./validate-consumer-module-standard.ts";

const input = await readCMS(fileURLToPath(new URL("../../", import.meta.url)));
void test("complete proposed evidence validates without activating the accepted pin", () => {
  inspectCMS(input);
  assert.throws(() => assertCMSAccepted(input), /cms.preacceptance/u);
});
void test("candidate metadata rejects identity, scope and placeholder acceptance drift", () => {
  const mutations: readonly (readonly [string, unknown])[] = [
    ["commit", "main"],
    ["sha256", "section-only"],
    ["gitBlob", "wrong"],
    ["reviewSha256", "wrong"],
    ["anchor", "wrong"],
    ["repository", "wrong"],
    ["standardPath", "../outside.md"],
    ["predecessorCommit", "wrong"],
    ["scopeDecision", "ADR-0000"],
    ["scopeReconciliationDecision", "ADR-0110"],
    ["scopeReconciliationDecisionSha256", "wrong"],
    ["historicalReviewSha256", "wrong"],
    ["manualSha256", "cb5d4c635d3ae7a4ef4f8cbb9356edadb4f4048e203f74258c4df31323fd8d17"],
    ["acceptingDecision", "ADR-9999"],
    ["status", "accepted"],
    ["productionAdopted", true],
    ["firstHost", "active"],
    ["sandboxClassification", "private-helper"],
    ["sandboxOwner", "wrong"],
    ["sandboxPath", "wrong"],
    ["unexpected", true],
  ];
  for (const [key, value] of mutations) {
    const profile = Object.assign({}, input.profile, { [key]: value });
    assert.throws(() => inspectCMS({ ...input, profile }), /cms.candidate.metadata/u, key);
  }
});
void test("complete source, historical authority and public sandbox cannot be substituted", () => {
  assert.throws(
    () => inspectCMS({ ...input, snapshot: input.snapshot.slice(1) }),
    /complete-source/u,
  );
  const changed = Uint8Array.from(input.snapshot);
  changed[0] = changed[0] === 0 ? 1 : 0;
  assert.throws(() => inspectCMS({ ...input, snapshot: changed }), /complete-source/u);
  assert.throws(() => inspectCMS({ ...input, priorDecision: new Uint8Array() }), /prior-decision/u);
  assert.throws(() => inspectCMS({ ...input, scopeReconciliationDecision: new Uint8Array() }), /scope-reconciliation/u);
  assert.throws(() => inspectCMS({ ...input, historicalReview: new Uint8Array() }), /historical-review/u);
  assert.throws(() => inspectCMS({ ...input, review: new Uint8Array() }), /candidate.review/u);
  assert.throws(() => inspectCMS({ ...input, factory: new Uint8Array() }), /sandbox-source/u);
  assert.throws(() => inspectCMS({ ...input, exports: { ".": {} } }), /public-sandbox-exports/u);
  assert.throws(() => inspectCMS({ ...input, manual: "candidate081" }), /live-profile/u);
});
void test("same export keys cannot hide a repointed module or changed barrel", () => {
  const exports = structuredClone(input.exports);
  const module = exports["./module"];
  assert.ok(typeof module === "object" && module !== null && "import" in module);
  module.import = "./dist/unrelated.js";
  assert.deepEqual(Object.keys(exports), Object.keys(input.exports));
  assert.throws(() => inspectCMS({ ...input, exports }), /public-sandbox-exports/u);
  assert.throws(() => inspectCMS({ ...input, publicBarrel: new Uint8Array() }), /public-barrel/u);
  assert.throws(() => inspectCMS({ ...input, featureBarrel: new Uint8Array() }), /feature-barrel/u);
});
