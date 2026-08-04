import type {
  ComponentVersion,
  DiscoverLocalHostQuery,
  DiscoverLocalHostResult,
  EpochMicroseconds,
  HostBootGeneration,
  HostCapabilityId,
  HostDiscovery,
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
  HostDiscoveryClock,
  HostDiscoverySource,
  HostDiscoverySourceResult,
} from "./ports/host-discovery-source.js";

const maximumCapabilityCount = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTextToken(
  value: unknown,
  expectedType: string,
): value is { readonly type: string; readonly value: string } {
  if (
    !isRecord(value) ||
    value.type !== expectedType ||
    typeof value.value !== "string"
  ) {
    return false;
  }
  const hasControlCharacter = Array.from(value.value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
  return (
    value.value.length > 0 &&
    value.value.length <= 160 &&
    value.value.trim() === value.value &&
    !hasControlCharacter
  );
}

function isValidBigIntToken(
  value: unknown,
  expectedType: string,
  minimum?: bigint,
): value is { readonly type: string; readonly value: bigint } {
  return (
    isRecord(value) &&
    value.type === expectedType &&
    typeof value.value === "bigint" &&
    (minimum === undefined || value.value >= minimum)
  );
}

function isTargetId(value: unknown): value is TargetId {
  return isValidTextToken(value, "TargetId");
}

function isSupervisorInstanceId(value: unknown): value is SupervisorInstanceId {
  return isValidTextToken(value, "SupervisorInstanceId");
}

function isHostInstanceId(value: unknown): value is HostInstanceId {
  return isValidTextToken(value, "HostInstanceId");
}

function isComponentVersion(value: unknown): value is ComponentVersion {
  return isValidTextToken(value, "ComponentVersion");
}

function isCapabilityId(value: unknown): value is HostCapabilityId {
  return isValidTextToken(value, "HostCapabilityId");
}

function isFreshnessEvidenceRef(
  value: unknown,
): value is HostFreshnessEvidenceRef {
  return isValidTextToken(value, "HostFreshnessEvidenceRef");
}

function isHostBootGeneration(value: unknown): value is HostBootGeneration {
  return isValidBigIntToken(value, "HostBootGeneration", 0n);
}

function isProtocolVersion(value: unknown): value is HostProtocolVersion {
  return isValidBigIntToken(value, "HostProtocolVersion", 1n);
}

function isEpochMicroseconds(value: unknown): value is EpochMicroseconds {
  return isValidBigIntToken(value, "EpochMicroseconds");
}

function isMicroseconds(value: unknown): value is Microseconds {
  return isValidBigIntToken(value, "Microseconds", 0n);
}

function isValidProtocolRange(value: unknown): value is HostProtocolRange {
  return (
    isRecord(value) &&
    isProtocolVersion(value.minimum) &&
    isProtocolVersion(value.maximum) &&
    value.minimum.value <= value.maximum.value
  );
}

function hasUniqueCapabilities(values: readonly HostCapabilityId[]): boolean {
  return new Set(values.map(({ value }) => value)).size === values.length;
}

function isValidQuery(value: unknown): value is DiscoverLocalHostQuery {
  if (
    !isRecord(value) ||
    !isTargetId(value.targetId) ||
    !isValidProtocolRange(value.supportedProtocolRange) ||
    !Array.isArray(value.requiredCapabilities) ||
    value.requiredCapabilities.length > maximumCapabilityCount ||
    !value.requiredCapabilities.every(isCapabilityId)
  ) {
    return false;
  }
  return hasUniqueCapabilities(value.requiredCapabilities);
}

function isValidFreshness(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.kind === "expiry" || value.kind === "liveness") &&
    isFreshnessEvidenceRef(value.evidenceRef) &&
    isEpochMicroseconds(value.observedAt) &&
    isEpochMicroseconds(value.validUntil) &&
    value.observedAt.value <= value.validUntil.value
  );
}

function isValidObservation(value: unknown): value is HostDiscoveryObservation {
  if (
    !isRecord(value) ||
    !isTargetId(value.targetId) ||
    !isSupervisorInstanceId(value.supervisorInstanceId) ||
    !isHostInstanceId(value.hostInstanceId) ||
    !isHostBootGeneration(value.hostBootGeneration) ||
    !isComponentVersion(value.componentVersion) ||
    !isValidProtocolRange(value.protocolRange) ||
    !isValidFreshness(value.freshness) ||
    !Array.isArray(value.capabilities) ||
    value.capabilities.length > maximumCapabilityCount ||
    !value.capabilities.every(isCapabilityId)
  ) {
    return false;
  }
  return hasUniqueCapabilities(value.capabilities);
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

function isValidSourceResult(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  if (value.kind === "observed") {
    return Object.hasOwn(value, "observation");
  }
  if (!isTargetId(value.targetId)) {
    return false;
  }
  if (value.kind === "not-found") {
    return true;
  }
  if (value.kind === "stale") {
    return isSourceStaleReason(value.reason);
  }
  if (value.kind === "rejected") {
    return isSourceRejectedReason(value.reason);
  }
  if (value.kind === "unavailable") {
    return isUnavailableReason(value.reason);
  }
  return false;
}

function sourceTargetId(
  sourceResult: HostDiscoverySourceResult,
): TargetId | undefined {
  return sourceResult.kind === "observed"
    ? sourceResult.observation?.targetId
    : sourceResult.targetId;
}

function sameTarget(left: TargetId | undefined, right: TargetId): boolean {
  return left?.value === right.value;
}

function snapshotQuery(query: DiscoverLocalHostQuery): DiscoverLocalHostQuery {
  return Object.freeze({
    requiredCapabilities: Object.freeze(
      query.requiredCapabilities.map(({ value }) => hostCapabilityId(value)),
    ),
    supportedProtocolRange: hostProtocolRange(
      hostProtocolVersion(query.supportedProtocolRange.minimum.value),
      hostProtocolVersion(query.supportedProtocolRange.maximum.value),
    ),
    targetId: targetId(query.targetId.value),
  });
}

function snapshotObservation(
  observation: HostDiscoveryObservation,
): HostDiscoveryObservation {
  return Object.freeze({
    capabilities: Object.freeze(
      observation.capabilities.map(({ value }) => hostCapabilityId(value)),
    ),
    componentVersion: componentVersion(observation.componentVersion.value),
    freshness: Object.freeze({
      evidenceRef: hostFreshnessEvidenceRef(
        observation.freshness.evidenceRef.value,
      ),
      kind: observation.freshness.kind,
      observedAt: epochMicroseconds(observation.freshness.observedAt.value),
      validUntil: epochMicroseconds(observation.freshness.validUntil.value),
    }),
    hostBootGeneration: hostBootGeneration(
      observation.hostBootGeneration.value,
    ),
    hostInstanceId: hostInstanceId(observation.hostInstanceId.value),
    protocolRange: hostProtocolRange(
      hostProtocolVersion(observation.protocolRange.minimum.value),
      hostProtocolVersion(observation.protocolRange.maximum.value),
    ),
    supervisorInstanceId: supervisorInstanceId(
      observation.supervisorInstanceId.value,
    ),
    targetId: targetId(observation.targetId.value),
  });
}

function evaluateCompatibility(
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
  const missingCapabilities = query.requiredCapabilities.filter(
    ({ value }) => !advertisedCapabilities.has(value),
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

function validateFreshnessPolicy(
  freshnessPolicy: HostDiscoveryFreshnessPolicy,
): void {
  if (
    !isMicroseconds(freshnessPolicy.maximumFutureSkew) ||
    !isMicroseconds(freshnessPolicy.maximumObservationAge)
  ) {
    throw new TypeError("Host discovery freshness policy is invalid");
  }
}

export interface HostDiscoveryDependencies {
  readonly clock: HostDiscoveryClock;
  readonly freshnessPolicy: HostDiscoveryFreshnessPolicy;
  readonly source: HostDiscoverySource;
}

export function createHostDiscovery({
  clock,
  freshnessPolicy,
  source,
}: HostDiscoveryDependencies): HostDiscovery {
  validateFreshnessPolicy(freshnessPolicy);
  const resolvedFreshnessPolicy = Object.freeze({
    maximumFutureSkew: microseconds(freshnessPolicy.maximumFutureSkew.value),
    maximumObservationAge: microseconds(
      freshnessPolicy.maximumObservationAge.value,
    ),
  });

  return {
    async discover(query) {
      if (!isValidQuery(query)) {
        return { kind: "rejected", reason: "invalid-query" };
      }
      const resolvedQuery = snapshotQuery(query);

      let sourceResult: HostDiscoverySourceResult;
      try {
        sourceResult = await source.read(resolvedQuery.targetId);
      } catch {
        return {
          kind: "unavailable",
          reason: "source-failure",
          targetId: resolvedQuery.targetId,
        };
      }

      if (!isValidSourceResult(sourceResult)) {
        return {
          kind: "rejected",
          reason: "invalid-source-response",
          targetId: resolvedQuery.targetId,
        };
      }
      if (
        sourceResult.kind === "observed" &&
        !isValidObservation(sourceResult.observation)
      ) {
        return {
          kind: "rejected",
          reason: "invalid-observation",
          targetId: resolvedQuery.targetId,
        };
      }
      if (!sameTarget(sourceTargetId(sourceResult), resolvedQuery.targetId)) {
        return {
          kind: "rejected",
          reason: "target-mismatch",
          targetId: resolvedQuery.targetId,
        };
      }
      if (sourceResult.kind === "not-found") {
        return { kind: "not-found", targetId: resolvedQuery.targetId };
      }
      if (sourceResult.kind === "stale") {
        return {
          kind: "stale",
          reason: sourceResult.reason,
          targetId: resolvedQuery.targetId,
        };
      }
      if (sourceResult.kind === "rejected") {
        return {
          kind: "source-rejected",
          reason: sourceResult.reason,
          targetId: resolvedQuery.targetId,
        };
      }
      if (sourceResult.kind === "unavailable") {
        return {
          kind: "unavailable",
          reason: sourceResult.reason,
          targetId: resolvedQuery.targetId,
        };
      }

      let currentTime;
      try {
        currentTime = clock.now();
        if (!isEpochMicroseconds(currentTime)) {
          throw new TypeError("Clock returned an invalid exact instant");
        }
      } catch {
        return {
          kind: "unavailable",
          reason: "clock-failure",
          targetId: resolvedQuery.targetId,
        };
      }
      const observation = snapshotObservation(sourceResult.observation);
      if (
        currentTime.value >= observation.freshness.validUntil.value
      ) {
        return {
          kind: "expired",
          targetId: resolvedQuery.targetId,
          validUntil: observation.freshness.validUntil,
        };
      }
      if (
        observation.freshness.observedAt.value >
        currentTime.value + resolvedFreshnessPolicy.maximumFutureSkew.value
      ) {
        return {
          kind: "rejected",
          reason: "future-observation",
          targetId: resolvedQuery.targetId,
        };
      }
      if (
        currentTime.value > observation.freshness.observedAt.value &&
        currentTime.value - observation.freshness.observedAt.value >
          resolvedFreshnessPolicy.maximumObservationAge.value
      ) {
        return {
          kind: "stale",
          reason: "observation-too-old",
          targetId: resolvedQuery.targetId,
        };
      }

      return evaluateCompatibility(resolvedQuery, observation);
    },
  };
}
