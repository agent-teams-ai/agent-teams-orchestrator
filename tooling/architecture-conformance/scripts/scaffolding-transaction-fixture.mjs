import { lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function operationSources(plan) {
  return new Map(
    plan.operations.map((operation) => [
      operation.path,
      Buffer.from(operation.after.contentBase64, "base64").toString("utf8"),
    ]),
  );
}

export function operationBytes(plan) {
  return new Map(
    plan.operations.map((operation) => [
      operation.path,
      Buffer.from(operation.after.contentBase64, "base64"),
    ]),
  );
}

export async function pathExists(pathname) {
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

export function journalPath(root) {
  return path.join(root, ".agent-teams-local/scaffolding-transaction.json");
}

export async function writeJournal(root, plan, stateFor = () => "pending") {
  const journal = {
    schemaVersion: 1,
    state: "PREPARED",
    plan,
    operations: plan.operations.map((operation, index) => ({
      operationId: operation.id,
      path: operation.path,
      state: stateFor(operation, index),
    })),
  };
  await writeFile(journalPath(root), `${JSON.stringify(journal, null, 2)}\n`);
}

export async function writeOperationPostimage(root, operation, source) {
  const pathname = path.join(root, operation.path);
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(
    pathname,
    source ?? Buffer.from(operation.after.contentBase64, "base64"),
  );
}
