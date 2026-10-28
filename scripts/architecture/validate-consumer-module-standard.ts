import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const prefix = "architecture/consumer-module-standard/";
const expected = {
  schemaVersion: 1,
  status: "proposed",
  repository: "agent-teams-ai/get-modular",
  standardPath: "docs/architecture/common-assembly.md",
  anchor: "consumer-module-standard",
  commit: "081ae02b49123e14121e100eccfe99f2e74c3600",
  gitBlob: "df4eff7235ac781ec574903c6b2aec13bcd7bfaa",
  sha256: "3c5814ebf1ab1bd17688e49955aa0baa2ee91dd3a369adcea4d38aaccd53ba86",
  predecessorCommit: "a3a079baca2c6af48c9d45bc08992825be1c2bbd",
  predecessorSha256: "e5cb510c5ea83e54a6833cc40b6ad31fc5cf8c70d9838e4e0c6923edc6f70919",
  scopeDecision: "ADR-0113",
  scopeDecisionSha256: "ebb66ba34de14a9285754afbd922553e65616184c6ec28617d4f4151c39de173",
  scopeReconciliationDecision: "ADR-0117",
  scopeReconciliationDecisionSha256: "98cefbd73b08e95c4107bc877668a2c3b84584c362571af19d7e2d6a63361c21",
  historicalReviewSha256: "ead73607331bbc9c67bc4258705e13a7388b5890b9d5452e5fbba2bd474d1c6a",
  acceptingDecision: null,
  productionAdopted: false,
  firstHost: "hold",
  sandboxOwner: "agent-context",
  sandboxClassification: "proposed-test-only-public-composition",
  sandboxPath:
    "packages/contexts/agent-context/src/features/sandbox-manifest/composition/feature-module-factory.ts",
  manualSha256: "9d8a2ba79d21ccc032000ca14d0b0f38255e213c1c198fdde0cb5fae134fe606",
  reviewSha256: "1f46e96553b7efb009e5f00213adcd1b5aed42b161a8284b282244eaa2d1c6b5",
  exportsSha256: "245dcc342805c90bc1424bd3a7596b3514dea9cb5d5a05901886959a51b78062",
  publicBarrelSha256: "d2b3aca36e94578c12536c72830dfa91659687900d16f16b914e224d2cd670fc",
  featureBarrelSha256: "a354fb3a2c93f5e8e159878e36a872726611f483f058b2315127a021d69d3991",
};
export interface CMSInput {
  readonly profile: unknown;
  readonly snapshot: Uint8Array;
  readonly review: Uint8Array;
  readonly priorDecision: Uint8Array;
  readonly scopeReconciliationDecision: Uint8Array;
  readonly historicalReview: Uint8Array;
  readonly factory: Uint8Array;
  readonly manual: string;
  readonly exports: Record<string, unknown>;
  readonly publicBarrel: Uint8Array;
  readonly featureBarrel: Uint8Array;
}
const digest = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
function record(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), "cms.shape");
  return value as Record<string, unknown>;
}
export function inspectCMS(input: CMSInput): void {
  assert.deepEqual(input.profile, expected, "cms.candidate.metadata");
  assert.equal(digest(input.snapshot), expected.sha256, "cms.candidate.complete-source");
  assert.equal(digest(input.review), expected.reviewSha256, "cms.candidate.review");
  assert.equal(digest(input.scopeReconciliationDecision), expected.scopeReconciliationDecisionSha256, "cms.scope-reconciliation");
  assert.equal(digest(input.historicalReview), expected.historicalReviewSha256, "cms.historical-review");
  assert.equal(digest(input.priorDecision), expected.scopeDecisionSha256, "cms.prior-decision");
  assert.equal(
    digest(input.factory),
    "309fea5d0583d2dfcdef2929820e3d1879a6fe05beb2e8af76eca1515f6e1471",
    "cms.sandbox-source",
  );
  const targets = new TextEncoder().encode(JSON.stringify(input.exports));
  assert.equal(digest(targets), expected.exportsSha256, "cms.public-sandbox-exports");
  assert.equal(digest(input.publicBarrel), expected.publicBarrelSha256, "cms.public-barrel");
  assert.equal(digest(input.featureBarrel), expected.featureBarrelSha256, "cms.feature-barrel");
  assert.equal(digest(Buffer.from(input.manual)), expected.manualSha256, "cms.live-profile");
}
// Evidence inspection does not grant acceptance or activate a production Host.
export function assertCMSAccepted(input: CMSInput): never {
  inspectCMS(input);
  throw new Error("cms.preacceptance:081 remains proposed; ADR-0113/A3 remains accepted");
}
export async function readCMS(root: string): Promise<CMSInput> {
  const read = (path: string) => readFile(resolve(root, path));
  const metadata: unknown = JSON.parse(
    (await read("packages/contexts/agent-context/package.json")).toString(),
  );
  const profile: unknown = JSON.parse((await read(prefix + "profile.json")).toString());
  return {
    profile,
    snapshot: await read(prefix + "guide/common-assembly-081.md"),
    review: await read(prefix + "reviews/current-981d-to-081-proposed.json"),
    historicalReview: await read(prefix + "reviews/a3-to-081-proposed.json"),
    scopeReconciliationDecision: await read("docs/decisions/0117-reconcile-mandatory-module-composition.md"),
    priorDecision: await read("docs/decisions/0113-canonical-module-and-composition-adoption.md"),
    factory: await read(expected.sandboxPath),
    manual: (await read("docs/architecture/composition-and-dependency-injection.md")).toString(),
    exports: record(record(metadata).exports),
    publicBarrel: await read("packages/contexts/agent-context/src/index.ts"),
    featureBarrel: await read(
      "packages/contexts/agent-context/src/features/sandbox-manifest/index.ts",
    ),
  };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assertCMSAccepted(await readCMS(resolve(process.argv[2] ?? ".")));
}
