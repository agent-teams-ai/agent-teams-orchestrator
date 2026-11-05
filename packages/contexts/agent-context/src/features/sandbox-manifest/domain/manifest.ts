export interface ManifestFacts {
  readonly name: string;
  readonly workspace: string;
  readonly agentProfileVersion: string;
  readonly runPolicySnapshot: string;
  readonly instructionRef: string;
  readonly roleKey?: string;
  readonly workSnapshotRef?: string;
  readonly createdAt: string;
}
/** Exact immutable source references are provenance, never execution authority or paths. */
export function manifestFingerprint(facts: ManifestFacts): string {
  return JSON.stringify([
    facts.name,
    facts.workspace,
    facts.agentProfileVersion,
    facts.runPolicySnapshot,
    facts.instructionRef,
    facts.roleKey ?? null,
    facts.workSnapshotRef ?? null,
    facts.createdAt,
  ]);
}
