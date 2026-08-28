import { lstat } from "node:fs/promises";
import path from "node:path";

import { readOpenedBoundedFile } from "./opened-bounded-file.mjs";

const scaffoldingJournalPath =
  ".agent-teams-local/scaffolding-transaction.json";
const maximumScaffoldingJournalBytes = 32 * 1024 * 1024;

export async function pendingScaffoldingJournalExists(repositoryRoot) {
  const pathname = path.join(repositoryRoot, scaffoldingJournalPath);
  try {
    await lstat(pathname);
    return true;
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function assertRecoveryPlanIdentity(plan, expected) {
  if (
    plan?.authority?.configPath !== expected.configPath ||
    plan?.composition?.id !== expected.compositionId
  ) {
    throw new Error(
      "Pending Plan is not bound to the canonical Orchestrator Composition",
    );
  }
}

export async function inspectPendingScaffoldingRecovery(
  repositoryRoot,
  expected,
) {
  if (!(await pendingScaffoldingJournalExists(repositoryRoot))) {
    return;
  }
  let journal;
  try {
    const source = await readOpenedBoundedFile({
      filePath: path.join(repositoryRoot, scaffoldingJournalPath),
      maximumBytes: maximumScaffoldingJournalBytes,
      rootPath: repositoryRoot,
    });
    journal = JSON.parse(source.toString("utf8"));
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return;
    }
    throw new Error(
      "Pending scaffolding journal is not a bounded canonical JSON file",
      { cause: error },
    );
  }
  if (!journal?.plan) {
    throw new Error("Pending scaffolding journal does not contain a Plan");
  }
  assertRecoveryPlanIdentity(journal.plan, expected);
}
