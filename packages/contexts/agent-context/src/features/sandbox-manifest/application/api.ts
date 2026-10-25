export interface ManifestRequestContext {
  readonly tenantId: string;
  readonly projectId: string;
  readonly principalId: string;
}
export interface SandboxManifest {
  readonly name: string;
  readonly workspace: string;
  readonly agentProfileVersion: string;
  readonly runPolicySnapshot: string;
  readonly instructionRef: string;
  readonly roleKey?: string;
  readonly workSnapshotRef?: string;
  readonly createdAt: string;
}
export interface SandboxManifestApi {
  getManifest(
    context: ManifestRequestContext,
    input: { readonly name: string },
  ): Promise<SandboxManifest>;
}
export class SandboxManifestError extends Error {
  constructor(
    readonly code:
      | "INVALID_ARGUMENT"
      | "PERMISSION_DENIED"
      | "NOT_FOUND"
      | "CONFLICT"
      | "UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "SandboxManifestError";
  }
}
