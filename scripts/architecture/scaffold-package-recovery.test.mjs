import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  inspectPendingScaffoldingRecovery,
  pendingScaffoldingJournalExists,
} from "./scaffold-package-recovery.mjs";

const expected = {
  compositionId: "orchestrator-library-boundary",
  configPath: "architecture/foundation/scaffolding.yaml",
};

async function createFixture(t, plan) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "orchestrator-scaffold-recovery-unit-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  if (plan !== undefined) {
    const stateRoot = path.join(root, ".agent-teams-local");
    await mkdir(stateRoot);
    await writeFile(
      path.join(stateRoot, "scaffolding-transaction.json"),
      `${JSON.stringify({ plan })}\n`,
    );
  }
  return root;
}

function canonicalPlan(overrides = {}) {
  return {
    authority: { configPath: expected.configPath },
    composition: { id: expected.compositionId },
    ...overrides,
  };
}

test("recognizes a canonical pending recovery without current catalog authority", async (t) => {
  const root = await createFixture(t, canonicalPlan());
  assert.equal(await pendingScaffoldingJournalExists(root), true);
  await inspectPendingScaffoldingRecovery(root, expected);
});

test("does not turn a missing journal into recovery work", async (t) => {
  const root = await createFixture(t);
  assert.equal(await pendingScaffoldingJournalExists(root), false);
  await inspectPendingScaffoldingRecovery(root, expected);
});

test("rejects noncanonical and malformed pending recovery journals", async (t) => {
  await t.test("alternate Composition", async (caseContext) => {
    const root = await createFixture(
      caseContext,
      canonicalPlan({ composition: { id: "alternate" } }),
    );
    await assert.rejects(
      inspectPendingScaffoldingRecovery(root, expected),
      /canonical Orchestrator Composition/u,
    );
  });
  await t.test("missing Plan", async (caseContext) => {
    const root = await createFixture(caseContext, null);
    await assert.rejects(
      inspectPendingScaffoldingRecovery(root, expected),
      /does not contain a Plan/u,
    );
  });
});
