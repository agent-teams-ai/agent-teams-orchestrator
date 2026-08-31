import assert from "node:assert/strict";
import path from "node:path";

export async function verifyPendingApplyRecoveryPrecedence({
  pendingRoot,
  pendingEntries,
  planPath,
  runWrapper,
  pathExists,
}) {
  const recovered = runWrapper(pendingRoot, [
    "apply", "--plan", planPath(pendingEntries[1].id), "--json",
  ]);
  assert.equal(recovered.status, 0, "pending recovery did not take precedence");
  assert.equal(JSON.parse(recovered.stdout).outcome, "failed-recovered");
  assert.equal(await pathExists(path.join(pendingRoot, pendingEntries[0].path)), true);
  assert.equal(await pathExists(path.join(pendingRoot, pendingEntries[1].path)), false);

  const applied = runWrapper(pendingRoot, [
    "apply", "--plan", planPath(pendingEntries[1].id), "--json",
  ]);
  assert.equal(applied.status, 0, "Plan did not apply after recovery finalized");
  assert.equal(JSON.parse(applied.stdout).outcome, "applied");
}
