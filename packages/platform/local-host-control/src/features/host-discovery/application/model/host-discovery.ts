interface TaggedText<Type extends string> {
  readonly type: Type;
  readonly value: string;
}

interface TaggedBigInt<Type extends string> {
  readonly type: Type;
  readonly value: bigint;
}

export type ComponentVersion = TaggedText<"ComponentVersion">;
export type EpochMicroseconds = TaggedBigInt<"EpochMicroseconds">;
export type HostBootGeneration = TaggedBigInt<"HostBootGeneration">;
export type HostCapabilityId = TaggedText<"HostCapabilityId">;
export type HostFreshnessEvidenceRef = TaggedText<"HostFreshnessEvidenceRef">;
export type HostInstanceId = TaggedText<"HostInstanceId">;
export type HostProtocolVersion = TaggedBigInt<"HostProtocolVersion">;
export type Microseconds = TaggedBigInt<"Microseconds">;
export type SupervisorInstanceId = TaggedText<"SupervisorInstanceId">;
export type TargetId = TaggedText<"TargetId">;

const identifierMaximumLength = 160;

function parseString(value: string, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a bounded non-empty string`);
  }
  const containsControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
  if (
    value.length === 0 ||
    value.length > identifierMaximumLength ||
    value.trim() !== value ||
    containsControlCharacter
  ) {
    throw new TypeError(`${label} must be a bounded non-empty string`);
  }
  return value;
}

function parseNonNegativeBigInt(value: bigint, label: string): bigint {
  if (typeof value !== "bigint" || value < 0n) {
    throw new TypeError(`${label} must be a non-negative bigint`);
  }
  return value;
}

function parsePositiveBigInt(value: bigint, label: string): bigint {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new TypeError(`${label} must be a positive bigint`);
  }
  return value;
}

export function componentVersion(value: string): ComponentVersion {
  return Object.freeze({
    type: "ComponentVersion",
    value: parseString(value, "ComponentVersion"),
  });
}

export function epochMicroseconds(value: bigint): EpochMicroseconds {
  if (typeof value !== "bigint") {
    throw new TypeError("EpochMicroseconds must be a bigint");
  }
  return Object.freeze({ type: "EpochMicroseconds", value });
}

export function hostBootGeneration(value: bigint): HostBootGeneration {
  return Object.freeze({
    type: "HostBootGeneration",
    value: parseNonNegativeBigInt(value, "HostBootGeneration"),
  });
}

export function hostCapabilityId(value: string): HostCapabilityId {
  return Object.freeze({
    type: "HostCapabilityId",
    value: parseString(value, "HostCapabilityId"),
  });
}

export function hostFreshnessEvidenceRef(
  value: string,
): HostFreshnessEvidenceRef {
  return Object.freeze({
    type: "HostFreshnessEvidenceRef",
    value: parseString(value, "HostFreshnessEvidenceRef"),
  });
}

export function hostInstanceId(value: string): HostInstanceId {
  return Object.freeze({
    type: "HostInstanceId",
    value: parseString(value, "HostInstanceId"),
  });
}

export function hostProtocolVersion(value: bigint): HostProtocolVersion {
  return Object.freeze({
    type: "HostProtocolVersion",
    value: parsePositiveBigInt(value, "HostProtocolVersion"),
  });
}

export function microseconds(value: bigint): Microseconds {
  return Object.freeze({
    type: "Microseconds",
    value: parseNonNegativeBigInt(value, "Microseconds"),
  });
}

export function supervisorInstanceId(value: string): SupervisorInstanceId {
  return Object.freeze({
    type: "SupervisorInstanceId",
    value: parseString(value, "SupervisorInstanceId"),
  });
}

export function targetId(value: string): TargetId {
  return Object.freeze({
    type: "TargetId",
    value: parseString(value, "TargetId"),
  });
}

export interface HostProtocolRange {
  readonly maximum: HostProtocolVersion;
  readonly minimum: HostProtocolVersion;
}

export function hostProtocolRange(
  minimum: HostProtocolVersion,
  maximum: HostProtocolVersion,
): HostProtocolRange {
  if (minimum.value > maximum.value) {
    throw new TypeError("HostProtocolRange minimum must not exceed maximum");
  }
  return Object.freeze({ maximum, minimum });
}

export interface HostFreshnessEvidence {
  readonly evidenceRef: HostFreshnessEvidenceRef;
  readonly kind: "expiry" | "liveness";
  readonly observedAt: EpochMicroseconds;
  readonly validUntil: EpochMicroseconds;
}

export interface HostDiscoveryObservation {
  readonly capabilities: readonly HostCapabilityId[];
  readonly componentVersion: ComponentVersion;
  readonly freshness: HostFreshnessEvidence;
  readonly hostBootGeneration: HostBootGeneration;
  readonly hostInstanceId: HostInstanceId;
  readonly protocolRange: HostProtocolRange;
  readonly supervisorInstanceId: SupervisorInstanceId;
  readonly targetId: TargetId;
}

export interface DiscoverLocalHostQuery {
  readonly requiredCapabilities: readonly HostCapabilityId[];
  readonly supportedProtocolRange: HostProtocolRange;
  readonly targetId: TargetId;
}

export interface HostDiscoveryFreshnessPolicy {
  readonly maximumFutureSkew: Microseconds;
  readonly maximumObservationAge: Microseconds;
}

export type HostDiscoveryUnavailableReason =
  | "permission-denied"
  | "source-failure"
  | "temporarily-unavailable";

export type HostDiscoveryStaleReason =
  | "liveness-unproven"
  | "observation-too-old"
  | "ownership-unproven"
  | "superseded";

export type HostDiscoverySourceRejectedReason =
  | "foreign-identity"
  | "malformed"
  | "unsafe-state";

export type DiscoverLocalHostResult =
  | {
      readonly authenticatedHandshakeRequired: true;
      readonly kind: "candidate";
      readonly observation: HostDiscoveryObservation;
      readonly proposedProtocolVersion: HostProtocolVersion;
    }
  | {
      readonly kind: "not-found";
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: HostDiscoveryUnavailableReason | "clock-failure";
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "source-rejected";
      readonly reason: HostDiscoverySourceRejectedReason;
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "stale";
      readonly reason: HostDiscoveryStaleReason;
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "expired";
      readonly targetId: TargetId;
      readonly validUntil: EpochMicroseconds;
    }
  | {
      readonly advertisedCapabilities: readonly HostCapabilityId[];
      readonly advertisedProtocolRange: HostProtocolRange;
      readonly componentVersion: ComponentVersion;
      readonly kind: "incompatible";
      readonly missingCapabilities: readonly HostCapabilityId[];
      readonly protocolCompatible: boolean;
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "rejected";
      readonly reason: "invalid-query";
    }
  | {
      readonly kind: "rejected";
      readonly reason:
        | "future-observation"
        | "invalid-observation"
        | "invalid-source-response"
        | "target-mismatch";
      readonly targetId: TargetId;
    };

export interface HostDiscovery {
  discover(
    query: DiscoverLocalHostQuery,
  ): Promise<DiscoverLocalHostResult>;
}
