import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ownerPath, planPath } from "./package-catalog-scaffolding-fixture.mjs";
import {
  journalPath,
  pathExists,
  writeJournal,
  writeOperationPostimage,
} from "./scaffolding-transaction-fixture.mjs";

function output(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function parseJsonOutput(label, result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${label} did not emit JSON:\n${output(result)}`, {
      cause: error,
    });
  }
}

function foundationCatalogSchemaPath(root) {
  return path.join(
    root,
    "node_modules/@agent-teams/engineering-foundation/schemas/scaffold-target-catalog/v1.schema.json",
  );
}

export async function verifyRecoveryAuthorityPrecedence({
  createFixture,
  planTarget,
  requireFailure,
  requireSuccess,
  runWrapper,
}) {
  const recoveryEntry = {
    id: "platform.recovery-probe",
    role: "platform",
    path: "packages/platform/recovery-probe",
    package_name: "@agent-teams/recovery-probe",
    owner_document: "architecture.recovery-probe",
  };
  const root = await createFixture([recoveryEntry]);
  const plan = planTarget(root, recoveryEntry.id);
  await writeJournal(root, plan);
  await rm(foundationCatalogSchemaPath(root));

  const recovered = requireSuccess(
    "journal recovery with missing Foundation schema authority",
    runWrapper(root, ["recover", "--json"]),
  );
  assert.doesNotMatch(output(recovered), /orchestrator\.catalog\.authority/u);
  const receipt = parseJsonOutput("journal recovery", recovered);
  assert.equal(receipt.outcome, "failed-recovered");
  for (const operation of plan.operations) {
    assert.equal(await pathExists(path.join(root, operation.path)), true);
  }
  assert.equal(await pathExists(journalPath(root)), false);
  const empty = requireSuccess(
    "recovery after journal finalization",
    runWrapper(root, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("empty recovery", empty).outcome,
    "no-pending-transaction",
  );

  const partialEntry = {
    id: "platform.partial-recovery",
    role: "platform",
    path: "packages/platform/partial-recovery",
    package_name: "@agent-teams/partial-recovery",
    owner_document: "architecture.partial-recovery",
  };
  const partialRoot = await createFixture([partialEntry]);
  const partialPlan = planTarget(partialRoot, partialEntry.id);
  await writeOperationPostimage(partialRoot, partialPlan.operations[0]);
  await writeJournal(partialRoot, partialPlan, (_operation, index) =>
    index === 0 ? "published" : index === 1 ? "publishing" : "pending",
  );
  const partialRecovery = requireSuccess(
    "partial publication recovery",
    runWrapper(partialRoot, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("partial publication recovery", partialRecovery).outcome,
    "failed-recovered",
  );
  for (const operation of partialPlan.operations) {
    assert.equal(await pathExists(path.join(partialRoot, operation.path)), true);
  }

  const conflictEntry = {
    id: "platform.recovery-conflict",
    role: "platform",
    path: "packages/platform/recovery-conflict",
    package_name: "@agent-teams/recovery-conflict",
    owner_document: "architecture.recovery-conflict",
  };
  const conflictRoot = await createFixture([conflictEntry]);
  const conflictPlan = planTarget(conflictRoot, conflictEntry.id);
  await writeJournal(conflictRoot, conflictPlan);
  await writeOperationPostimage(
    conflictRoot,
    conflictPlan.operations[0],
    "conflicting third-party bytes\n",
  );
  const conflictRecovery = requireFailure(
    "recovery with conflicting output",
    runWrapper(conflictRoot, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("conflicting recovery", conflictRecovery).outcome,
    "recovery-required",
  );
  assert.equal(await pathExists(journalPath(conflictRoot)), true);

  const staleEntry = {
    id: "platform.stale-recovery",
    role: "platform",
    path: "packages/platform/stale-recovery",
    package_name: "@agent-teams/stale-recovery",
    owner_document: "architecture.stale-recovery",
  };
  const staleRoot = await createFixture([staleEntry]);
  const stalePlan = planTarget(staleRoot, staleEntry.id);
  await writeOperationPostimage(staleRoot, stalePlan.operations[0]);
  await writeJournal(staleRoot, stalePlan, (_operation, index) =>
    index === 0 ? "published" : "pending",
  );
  const staleOwner = path.join(staleRoot, ownerPath(staleEntry.owner_document));
  await writeFile(
    staleOwner,
    `${await readFile(staleOwner, "utf8")}# changed after publication\n`,
  );
  const staleRecovery = requireFailure(
    "stale authority after partial publication",
    runWrapper(staleRoot, ["recover", "--json"]),
  );
  assert.equal(
    parseJsonOutput("stale recovery", staleRecovery).outcome,
    "recovery-required",
  );
  assert.equal(await pathExists(journalPath(staleRoot)), true);
  assert.equal(
    await pathExists(path.join(staleRoot, stalePlan.operations[1].path)),
    false,
  );

  const pendingEntries = [
    {
      id: "platform.pending-a",
      role: "platform",
      path: "packages/platform/pending-a",
      package_name: "@agent-teams/pending-a",
      owner_document: "architecture.pending-a",
    },
    {
      id: "platform.pending-b",
      role: "platform",
      path: "packages/platform/pending-b",
      package_name: "@agent-teams/pending-b",
      owner_document: "architecture.pending-b",
    },
  ];
  const pendingRoot = await createFixture(pendingEntries);
  const pendingPlanA = planTarget(pendingRoot, pendingEntries[0].id);
  planTarget(pendingRoot, pendingEntries[1].id);
  await writeJournal(pendingRoot, pendingPlanA);
  await rm(foundationCatalogSchemaPath(pendingRoot));
  for (const [label, entry] of [
    ["same Plan", pendingEntries[0]],
    ["different Plan", pendingEntries[1]],
  ]) {
    const pending = requireFailure(
      `${label} while recovery is pending`,
      runWrapper(pendingRoot, [
        "apply",
        "--plan",
        planPath(entry.id),
        "--json",
      ]),
      /orchestrator\.scaffold\.recovery-required/u,
    );
    const pendingResult = parseJsonOutput(`${label} pending result`, pending);
    assert.deepEqual(pendingResult, {
      diagnostics: [
        {
          message:
            "A pending scaffolding transaction requires recovery. Run pnpm architecture:scaffold-package -- recover before retrying Apply.",
          ruleId: "orchestrator.scaffold.recovery-required",
        },
      ],
      outcome: "recovery-required",
    });
    assert.doesNotMatch(output(pending), /orchestrator\.catalog\.authority/u);
  }
  assert.equal(await pathExists(journalPath(pendingRoot)), true);
  for (const entry of pendingEntries) {
    assert.equal(await pathExists(path.join(pendingRoot, entry.path)), false);
  }

  const temporaryEntry = {
    id: "platform.journal-temporary",
    role: "platform",
    path: "packages/platform/journal-temporary",
    package_name: "@agent-teams/journal-temporary",
    owner_document: "architecture.journal-temporary",
  };
  const temporaryRoot = await createFixture([temporaryEntry]);
  planTarget(temporaryRoot, temporaryEntry.id);
  const journalTemporary = `${journalPath(temporaryRoot)}.tmp`;
  await writeFile(journalTemporary, "unresolved journal temporary\n");
  requireFailure(
    "unresolved journal temporary",
    runWrapper(temporaryRoot, ["recover", "--json"]),
    /temporary/u,
  );
  await rm(journalTemporary);
}
