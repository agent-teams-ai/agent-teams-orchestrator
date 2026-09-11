import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { inspectFoundationTransactionAwareMode } from "@agent-teams/engineering-foundation";

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

// Kill a real disposable publication at a supported public phase. Never forge
// Foundation-owned journals or reach into its private transaction representation.
export function interruptScaffold(root, plan, phase = "after-journal-prepared", occurrence = 1) {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `
    import { runScaffoldCrashQualification } from "@agent-teams/engineering-foundation/scaffolding/qualification";
    let source = "";
    for await (const chunk of process.stdin) source += chunk;
    const { root, plan, phase, occurrence } = JSON.parse(source);
    let seen = 0;
    await runScaffoldCrashQualification(root, plan, point => {
      if (point.phase === phase && ++seen === occurrence) process.exit(73);
    });
    throw new Error("Requested scaffold crash cut was not reached");
  `], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    input: JSON.stringify({ root, plan, phase, occurrence }),
    encoding: "utf8",
    timeout: 60000,
  });
  assert.equal(result.signal, null, `Scaffold crash cut signaled: ${result.error}`);
  assert.equal(result.status, 73, `Scaffold crash cut failed: ${result.stderr}`);
  console.log(`Scaffold crash cut: ${phase} occurrence=${occurrence} exit=73`);
}

export async function assertPendingScaffold(root) {
  const { transaction } = await inspectFoundationTransactionAwareMode(root);
  assert.equal(transaction?.state, "pending");
  assert.equal(transaction.operationKind, "scaffolding");
  assert.equal(transaction.recovery.commandId, "scaffold-recover");
}

export async function assertPublishedPrefix(root, plan, count) {
  for (const [index, operation] of plan.operations.entries()) {
    const pathname = path.join(root, operation.path);
    if (index < count) {
      assert.deepEqual(await readFile(pathname), Buffer.from(operation.after.contentBase64, "base64"));
    } else {
      assert.equal(await pathExists(pathname), false, `${operation.path} published before its crash cut`);
    }
  }
}

export async function writeOperationPostimage(root, operation, source) {
  const pathname = path.join(root, operation.path);
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(
    pathname,
    source ?? Buffer.from(operation.after.contentBase64, "base64"),
  );
}
