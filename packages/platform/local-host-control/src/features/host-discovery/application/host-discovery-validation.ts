import type {
  ComponentVersion,
  DiscoverLocalHostQuery,
  DiscoverLocalHostResult,
  EpochMicroseconds,
  HostBootGeneration,
  HostCapabilityId,
  HostDiscoveryFreshnessPolicy,
  HostDiscoveryObservation,
  HostDiscoverySourceRejectedReason,
  HostDiscoveryStaleReason,
  HostDiscoveryUnavailableReason,
  HostFreshnessEvidenceRef,
  HostInstanceId,
  HostProtocolRange,
  HostProtocolVersion,
  Microseconds,
  SupervisorInstanceId,
  TargetId,
} from "./model/host-discovery.js";
import {
  componentVersion,
  epochMicroseconds,
  hostBootGeneration,
  hostCapabilityId,
  hostFreshnessEvidenceRef,
  hostInstanceId,
  hostProtocolRange,
  hostProtocolVersion,
  microseconds,
  supervisorInstanceId,
  targetId,
} from "./model/host-discovery.js";
import type {
  HostDiscoverySourceResult,
} from "./ports/host-discovery-source.js";

const maximumCapabilityCount = 64;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshotTextToken<Value>(
  value: unknown,
  expectedType: string,
  create: (rawValue: string) => Value,
): Value | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const tokenType = value.type;
  if (tokenType !== expectedType) {
    return undefined;
  }
  const rawValue = value.value;
  if (typeof rawValue !== "string") {
    return undefined;
  }
  try {
    return create(rawValue);
  } catch {
    return undefined;
  }
}

function snapshotBigIntToken<Value>(
  value: unknown,
  expectedType: string,
  create: (rawValue: bigint) => Value,
): Value | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const tokenType = value.type;
  if (tokenType !== expectedType) {
    return undefined;
  }
  const rawValue = value.value;
  if (typeof rawValue !== "bigint") {
    return undefined;
  }
  try {
    return create(rawValue);
  } catch {
    return undefined;
  }
}

function snapshotTargetId(value: unknown): TargetId | undefined {
  return snapshotTextToken(value, "TargetId", targetId);
}

function snapshotSupervisorInstanceId(
  value: unknown,
): SupervisorInstanceId | undefined {
  return snapshotTextToken(
    value,
    "SupervisorInstanceId",
    supervisorInstanceId,
  );
}

function snapshotHostInstanceId(value: unknown): HostInstanceId | undefined {
  return snapshotTextToken(value, "HostInstanceId", hostInstanceId);
}

function snapshotComponentVersion(
  value: unknown,
): ComponentVersion | undefined {
  return snapshotTextToken(value, "ComponentVersion", componentVersion);
}

function snapshotCapabilityId(value: unknown): HostCapabilityId | undefined {
  return snapshotTextToken(value, "HostCapabilityId", hostCapabilityId);
}

function snapshotFreshnessEvidenceRef(
  value: unknown,
): HostFreshnessEvidenceRef | undefined {
  return snapshotTextToken(
    value,
    "HostFreshnessEvidenceRef",
    hostFreshnessEvidenceRef,
  );
}

function snapshotHostBootGeneration(
  value: unknown,
): HostBootGeneration | undefined {
  return snapshotBigIntToken(
    value,
    "HostBootGeneration",
    hostBootGeneration,
  );
}

function snapshotProtocolVersion(
  value: unknown,
): HostProtocolVersion | undefined {
  return snapshotBigIntToken(
    value,
    "HostProtocolVersion",
    hostProtocolVersion,
  );
}

export function snapshotEpochMicroseconds(
  value: unknown,
): EpochMicroseconds | undefined {
  return snapshotBigIntToken(
    value,
    "EpochMicroseconds",
    epochMicroseconds,
  );
}

function snapshotMicroseconds(value: unknown): Microseconds | undefined {
  return snapshotBigIntToken(value, "Microseconds", microseconds);
}

function snapshotProtocolRange(
  value: unknown,
): HostProtocolRange | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const rawMinimum = value.minimum;
  const rawMaximum = value.maximum;
  const minimum = snapshotProtocolVersion(rawMinimum);
  const maximum = snapshotProtocolVersion(rawMaximum);
  if (minimum === undefined || maximum === undefined) {
    return undefined;
  }
  try {
    return hostProtocolRange(minimum, maximum);
  } catch {
    return undefined;
  }
}

function hasUniqueCapabilities(values: readonly HostCapabilityId[]): boolean {
  return new Set(values.map(({ value }) => value)).size === values.length;
}

function snapshotCapabilities(
  value: unknown,
): readonly HostCapabilityId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const length = value.length;
  if (
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > maximumCapabilityCount
  ) {
    return undefined;
  }
  const capabilities: HostCapabilityId[] = [];
  for (let index = 0; index < length; index += 1) {
    const capability = snapshotCapabilityId(value[index]);
    if (capability === undefined) {
      return undefined;
    }
    capabilities.push(capability);
  }
  return hasUniqueCapabilities(capabilities)
    ? Object.freeze(capabilities)
    : undefined;
}

export function snapshotQuery(
  value: unknown,
): DiscoverLocalHostQuery | undefined {
  try {
    if (!isRecord(value)) {
      return undefined;
    }
    const rawTargetId = value.targetId;
    const rawProtocolRange = value.supportedProtocolRange;
    const rawCapabilities = value.requiredCapabilities;
    const resolvedTargetId = snapshotTargetId(rawTargetId);
    const supportedProtocolRange = snapshotProtocolRange(rawProtocolRange);
    const requiredCapabilities = snapshotCapabilities(rawCapabilities);
    if (
      resolvedTargetId === undefined ||
      supportedProtocolRange === undefined ||
      requiredCapabilities === undefined
    ) {
      return undefined;
    }
    return Object.freeze({
      requiredCapabilities,
      supportedProtocolRange,
      targetId: resolvedTargetId,
    });
  } catch {
    return undefined;
  }
}

function snapshotFreshness(
  value: unknown,
): HostDiscoveryObservation["freshness"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const kind = value.kind;
  const rawEvidenceRef = value.evidenceRef;
  const rawObservedAt = value.observedAt;
  const rawValidUntil = value.validUntil;
  const evidenceRef = snapshotFreshnessEvidenceRef(rawEvidenceRef);
  const observedAt = snapshotEpochMicroseconds(rawObservedAt);
  const validUntil = snapshotEpochMicroseconds(rawValidUntil);
  if (
    (kind !== "expiry" && kind !== "liveness") ||
    evidenceRef === undefined ||
    observedAt === undefined ||
    validUntil === undefined ||
    observedAt.value > validUntil.value
  ) {
    return undefined;
  }
  return Object.freeze({ evidenceRef, kind, observedAt, validUntil });
}

function isUnavailableReason(
  value: unknown,
): value is HostDiscoveryUnavailableReason {
  return (
    value === "permission-denied" ||
    value === "source-failure" ||
    value === "temporarily-unavailable"
  );
}

function isSourceStaleReason(
  value: unknown,
): value is Exclude<HostDiscoveryStaleReason, "observation-too-old"> {
  return (
    value === "liveness-unproven" ||
    value === "ownership-unproven" ||
    value === "superseded"
  );
}

function isSourceRejectedReason(
  value: unknown,
): value is HostDiscoverySourceRejectedReason {
  return (
    value === "foreign-identity" ||
    value === "malformed" ||
    value === "unsafe-state"
  );
}

export function sameTarget(
  left: TargetId | undefined,
  right: TargetId,
): boolean {
  return left?.value === right.value;
}

function snapshotObservation(
  value: unknown,
): HostDiscoveryObservation | undefined {
  try {
    if (!isRecord(value)) {
      return undefined;
    }
    const rawCapabilities = value.capabilities;
    const rawComponentVersion = value.componentVersion;
    const rawFreshness = value.freshness;
    const rawHostBootGeneration = value.hostBootGeneration;
    const rawHostInstanceId = value.hostInstanceId;
    const rawProtocolRange = value.protocolRange;
    const rawSupervisorInstanceId = value.supervisorInstanceId;
    const rawTargetId = value.targetId;
    const capabilities = snapshotCapabilities(rawCapabilities);
    const resolvedComponentVersion = snapshotComponentVersion(
      rawComponentVersion,
    );
    const freshness = snapshotFreshness(rawFreshness);
    const resolvedHostBootGeneration = snapshotHostBootGeneration(
      rawHostBootGeneration,
    );
    const resolvedHostInstanceId = snapshotHostInstanceId(rawHostInstanceId);
    const protocolRange = snapshotProtocolRange(rawProtocolRange);
    const resolvedSupervisorInstanceId = snapshotSupervisorInstanceId(
      rawSupervisorInstanceId,
    );
    const resolvedTargetId = snapshotTargetId(rawTargetId);
    if (
      capabilities === undefined ||
      resolvedComponentVersion === undefined ||
      freshness === undefined ||
      resolvedHostBootGeneration === undefined ||
      resolvedHostInstanceId === undefined ||
      protocolRange === undefined ||
      resolvedSupervisorInstanceId === undefined ||
      resolvedTargetId === undefined
    ) {
      return undefined;
    }
    return Object.freeze({
      capabilities,
      componentVersion: resolvedComponentVersion,
      freshness,
      hostBootGeneration: resolvedHostBootGeneration,
      hostInstanceId: resolvedHostInstanceId,
      protocolRange,
      supervisorInstanceId: resolvedSupervisorInstanceId,
      targetId: resolvedTargetId,
    });
  } catch {
    return undefined;
  }
}

export type SourceResultSnapshot =
  | { readonly kind: "invalid-observation" }
  | { readonly kind: "invalid-source-response" }
  | {
      readonly kind: "valid";
      readonly result: HostDiscoverySourceResult;
    };

export function snapshotSourceResult(value: unknown): SourceResultSnapshot {
  try {
    if (!isRecord(value)) {
      return { kind: "invalid-source-response" };
    }
    const kind = value.kind;
    if (kind === "observed") {
      const rawObservation = value.observation;
      const resolvedObservation = snapshotObservation(rawObservation);
      return resolvedObservation === undefined
        ? { kind: "invalid-observation" }
        : {
            kind: "valid",
            result: Object.freeze({
              kind: "observed",
              observation: resolvedObservation,
            }),
          };
    }
    if (
      kind !== "not-found" &&
      kind !== "stale" &&
      kind !== "rejected" &&
      kind !== "unavailable"
    ) {
      return { kind: "invalid-source-response" };
    }
    const rawTargetId = value.targetId;
    const resolvedTargetId = snapshotTargetId(rawTargetId);
    if (resolvedTargetId === undefined) {
      return { kind: "invalid-source-response" };
    }
    if (kind === "not-found") {
      return {
        kind: "valid",
        result: Object.freeze({ kind, targetId: resolvedTargetId }),
      };
    }
    const reason = value.reason;
    if (kind === "stale" && isSourceStaleReason(reason)) {
      return {
        kind: "valid",
        result: Object.freeze({ kind, reason, targetId: resolvedTargetId }),
      };
    }
    if (kind === "rejected" && isSourceRejectedReason(reason)) {
      return {
        kind: "valid",
        result: Object.freeze({ kind, reason, targetId: resolvedTargetId }),
      };
    }
    if (kind === "unavailable" && isUnavailableReason(reason)) {
      return {
        kind: "valid",
        result: Object.freeze({ kind, reason, targetId: resolvedTargetId }),
      };
    }
    return { kind: "invalid-source-response" };
  } catch {
    return { kind: "invalid-source-response" };
  }
}

export function evaluateCompatibility(
  query: DiscoverLocalHostQuery,
  observation: HostDiscoveryObservation,
): DiscoverLocalHostResult {
  const commonMinimum =
    query.supportedProtocolRange.minimum.value >
    observation.protocolRange.minimum.value
      ? query.supportedProtocolRange.minimum
      : observation.protocolRange.minimum;
  const commonMaximum =
    query.supportedProtocolRange.maximum.value <
    observation.protocolRange.maximum.value
      ? query.supportedProtocolRange.maximum
      : observation.protocolRange.maximum;
  const protocolCompatible = commonMinimum.value <= commonMaximum.value;
  const advertisedCapabilities = new Set(
    observation.capabilities.map(({ value }) => value),
  );
  const missingCapabilities = Object.freeze(
    query.requiredCapabilities.filter(
      ({ value }) => !advertisedCapabilities.has(value),
    ),
  );

  if (protocolCompatible && missingCapabilities.length === 0) {
    return {
      authenticatedHandshakeRequired: true,
      kind: "candidate",
      observation,
      proposedProtocolVersion: commonMaximum,
    };
  }
  return {
    advertisedCapabilities: observation.capabilities,
    advertisedProtocolRange: observation.protocolRange,
    componentVersion: observation.componentVersion,
    kind: "incompatible",
    missingCapabilities,
    protocolCompatible,
    targetId: query.targetId,
  };
}

export function snapshotFreshnessPolicy(
  value: unknown,
): HostDiscoveryFreshnessPolicy | undefined {
  try {
    if (!isRecord(value)) {
      return undefined;
    }
    const rawMaximumFutureSkew = value.maximumFutureSkew;
    const rawMaximumObservationAge = value.maximumObservationAge;
    const maximumFutureSkew = snapshotMicroseconds(rawMaximumFutureSkew);
    const maximumObservationAge = snapshotMicroseconds(
      rawMaximumObservationAge,
    );
    if (
      maximumFutureSkew === undefined ||
      maximumObservationAge === undefined
    ) {
      return undefined;
    }
    return Object.freeze({ maximumFutureSkew, maximumObservationAge });
  } catch {
    return undefined;
  }
}
