import { SandboxManifestError } from "./api.js";
import type { ManifestRequestContext, SandboxManifest } from "./api.js";
const segment = /^[A-Za-z0-9_-]+$/u;
export function assertManifestScope(context: ManifestRequestContext): void {
  const parts = context.projectId.split("/");
  if (
    parts.length !== 4 ||
    parts[0] !== "tenants" ||
    parts[2] !== "projects" ||
    parts[1] !== context.tenantId ||
    !segment.test(parts[1]) ||
    !segment.test(parts[3] ?? "") ||
    !context.principalId.trim()
  ) {
    throw new SandboxManifestError(
      "PERMISSION_DENIED",
      "Manifest scope does not match authenticated authority",
    );
  }
}
export function assertManifestResource(
  context: ManifestRequestContext,
  name: string,
  collection: string,
): void {
  assertManifestScope(context);
  const prefix = `${context.projectId}/${collection}/`;
  if (
    typeof name !== "string" ||
    !name.startsWith(prefix) ||
    !segment.test(name.slice(prefix.length))
  ) {
    throw new SandboxManifestError(
      "INVALID_ARGUMENT",
      "Manifest source must be an exact scoped resource",
    );
  }
}
export function assertManifest(context: ManifestRequestContext, value: SandboxManifest): void {
  const fields = [
    "name",
    "workspace",
    "agentProfileVersion",
    "runPolicySnapshot",
    "instructionRef",
    "roleKey",
    "workSnapshotRef",
    "createdAt",
  ];
  if (Object.keys(value).some((key) => !fields.includes(key))) {
    throw new SandboxManifestError(
      "INVALID_ARGUMENT",
      "Manifest accepts only declared immutable source references",
    );
  }
  assertManifestResource(context, value.name, "contextManifests");
  assertManifestResource(context, value.workspace, "workspaces");
  assertManifestResource(context, value.agentProfileVersion, "agentProfileVersions");
  assertManifestResource(context, value.runPolicySnapshot, "runPolicySnapshots");
  if (
    typeof value.instructionRef !== "string" ||
    !/^[A-Za-z0-9:._-]{1,256}$/u.test(value.instructionRef) ||
    (value.roleKey !== undefined &&
      (typeof value.roleKey !== "string" || !segment.test(value.roleKey))) ||
    (value.workSnapshotRef !== undefined &&
      (typeof value.workSnapshotRef !== "string" ||
        !/^[A-Za-z0-9:._-]{1,256}$/u.test(value.workSnapshotRef))) ||
    typeof value.createdAt !== "string" ||
    !/^-?(?:0|[1-9][0-9]*)$/u.test(value.createdAt) ||
    value.createdAt === "-0"
  ) {
    throw new SandboxManifestError("INVALID_ARGUMENT", "Invalid immutable manifest facts");
  }
}
