import { catalogDiagnostic } from "./package-catalog-policy.mjs";

export const engineeringFoundationPackage =
  "@agent-teams/engineering-foundation";
export const packageCatalogSchemaId =
  "https://agent-teams.ai/schemas/scaffold-target-catalog/v1";
export const packageCatalogSchemaSpecifier =
  `${engineeringFoundationPackage}/schemas/scaffold-target-catalog/v1.schema.json`;
export const packageManifestSpecifier =
  `${engineeringFoundationPackage}/package.json`;
export const trustedRegistrySchemaDigests = Object.freeze({
  "0.19.0":
    "sha256:92ad50dc438f438d8ae8ec328d28d8b03c9fb3d9235e0144fb740386dd3e3b60",
});

export const catalogAuthorityInputLimits = Object.freeze({
  instant: 100,
  integrity: 256,
  issue: 1024,
  mode: 16,
  packageKey: 512,
  packageName: 214,
  path: 4096,
  registryEntryKind: 32,
  resolverLocation: 16 * 1024,
  version: 256,
});

export function boundedAuthorityString(value, maximumLength) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

export function boundedAuthorityPath(value) {
  return (
    boundedAuthorityString(value, catalogAuthorityInputLimits.path) &&
    !value.includes("\0")
  );
}

function remediationGuidance(ruleId, context) {
  if (context.recoveryRequired === true) {
    return "Run pnpm foundation:status and complete the reported Foundation recovery before retrying.";
  }
  if (context.mode === "LOCAL" || ruleId.includes(".local-")) {
    return "Run pnpm foundation:status; repair the attached Foundation checkout, or run pnpm foundation:detach to restore REGISTRY mode.";
  }
  if (context.mode === "REGISTRY" || ruleId.includes(".registry-")) {
    return "Run pnpm install --frozen-lockfile and pnpm foundation:assert-registry.";
  }
  return "Run pnpm foundation:status and repair the reported Foundation authority state.";
}

export class CatalogAuthorityError extends Error {
  constructor(ruleId, fields, options = {}) {
    super(
      `${catalogDiagnostic(ruleId, fields)} ${remediationGuidance(ruleId, options)}`,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "CatalogAuthorityError";
    this.ruleId = ruleId;
  }
}

export function authorityFailure(ruleId, fields, cause, context = {}) {
  return new CatalogAuthorityError(
    ruleId,
    fields,
    { ...context, ...(cause === undefined ? {} : { cause }) },
  );
}
