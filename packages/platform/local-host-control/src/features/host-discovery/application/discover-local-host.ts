import type {
  DiscoverLocalHostQuery,
  DiscoverLocalHostResult,
  EpochMicroseconds,
  HostDiscovery,
  HostDiscoveryFreshnessPolicy,
  HostDiscoveryObservation,
  TargetId,
} from "./model/host-discovery.js";
import type {
  HostDiscoveryClock,
  HostDiscoverySource,
} from "./ports/host-discovery-source.js";
import {
  evaluateCompatibility,
  isRecord,
  sameTarget,
  snapshotEpochMicroseconds,
  snapshotFreshnessPolicy,
  snapshotQuery,
  snapshotSourceResult,
} from "./host-discovery-validation.js";

export interface HostDiscoveryDependencies {
  readonly clock: HostDiscoveryClock;
  readonly freshnessPolicy: HostDiscoveryFreshnessPolicy;
  readonly source: HostDiscoverySource;
}

interface ResolvedHostDiscoveryDependencies {
  readonly clockNow: () => unknown;
  readonly freshnessPolicy: HostDiscoveryFreshnessPolicy;
  readonly sourceRead: (requestedTarget: TargetId) => unknown;
}

function resolveDependencies(
  dependencies: HostDiscoveryDependencies,
): ResolvedHostDiscoveryDependencies {
  let clockNow: () => unknown;
  let sourceRead: (requestedTarget: TargetId) => unknown;
  try {
    if (!isRecord(dependencies)) {
      throw new TypeError("invalid dependency container");
    }
    const rawClock = dependencies.clock;
    const rawSource = dependencies.source;
    if (!isRecord(rawClock) || !isRecord(rawSource)) {
      throw new TypeError("invalid dependency port");
    }
    const rawClockNow: unknown = Reflect.get(rawClock, "now");
    const rawSourceRead: unknown = Reflect.get(rawSource, "read");
    if (
      typeof rawClockNow !== "function" ||
      typeof rawSourceRead !== "function"
    ) {
      throw new TypeError("invalid dependency operation");
    }
    clockNow = () => Reflect.apply(rawClockNow, rawClock, []);
    sourceRead = (requestedTarget: TargetId) =>
      Reflect.apply(rawSourceRead, rawSource, [requestedTarget]);
  } catch {
    throw new TypeError("Host discovery dependencies are invalid");
  }
  const freshnessPolicy = snapshotFreshnessPolicy(
    dependencies.freshnessPolicy,
  );
  if (freshnessPolicy === undefined) {
    throw new TypeError("Host discovery freshness policy is invalid");
  }
  return Object.freeze({ clockNow, freshnessPolicy, sourceRead });
}

async function readSource(
  sourceRead: (requestedTarget: TargetId) => unknown,
  targetId: TargetId,
): Promise<unknown> {
  try {
    return await sourceRead(targetId);
  } catch {
    return {
      kind: "unavailable",
      reason: "source-failure",
      targetId,
    } satisfies DiscoverLocalHostResult;
  }
}

function snapshotClock(
  clockNow: () => unknown,
): EpochMicroseconds | undefined {
  try {
    return snapshotEpochMicroseconds(clockNow());
  } catch {
    return undefined;
  }
}

function assertNeverSourceResult(value: never): never {
  throw new TypeError(
    `Host discovery source result is not exhaustive: ${String(value)}`,
  );
}

function sourceTerminalResult(
  query: DiscoverLocalHostQuery,
  rawSourceResult: unknown,
): DiscoverLocalHostResult | HostDiscoveryObservation {
  const sourceSnapshot = snapshotSourceResult(rawSourceResult);
  if (sourceSnapshot.kind === "invalid-source-response") {
    return {
      kind: "rejected",
      reason: "invalid-source-response",
      targetId: query.targetId,
    };
  }
  if (sourceSnapshot.kind === "invalid-observation") {
    return {
      kind: "rejected",
      reason: "invalid-observation",
      targetId: query.targetId,
    };
  }
  const sourceResult = sourceSnapshot.result;
  const resolvedTargetId =
    sourceResult.kind === "observed"
      ? sourceResult.observation.targetId
      : sourceResult.targetId;
  if (!sameTarget(resolvedTargetId, query.targetId)) {
    return {
      kind: "rejected",
      reason: "target-mismatch",
      targetId: query.targetId,
    };
  }
  switch (sourceResult.kind) {
    case "observed":
      return sourceResult.observation;
    case "not-found":
      return { kind: "not-found", targetId: query.targetId };
    case "stale":
      return {
        kind: "stale",
        reason: sourceResult.reason,
        targetId: query.targetId,
      };
    case "rejected":
      return {
        kind: "source-rejected",
        reason: sourceResult.reason,
        targetId: query.targetId,
      };
    case "unavailable":
      return {
        kind: "unavailable",
        reason: sourceResult.reason,
        targetId: query.targetId,
      };
    default:
      return assertNeverSourceResult(sourceResult);
  }
}

function isObservation(
  result: DiscoverLocalHostResult | HostDiscoveryObservation,
): result is HostDiscoveryObservation {
  return "freshness" in result;
}

function evaluateFreshness(
  query: DiscoverLocalHostQuery,
  observation: HostDiscoveryObservation,
  currentTime: EpochMicroseconds,
  policy: HostDiscoveryFreshnessPolicy,
): DiscoverLocalHostResult | undefined {
  if (currentTime.value >= observation.freshness.validUntil.value) {
    return {
      kind: "expired",
      targetId: query.targetId,
      validUntil: observation.freshness.validUntil,
    };
  }
  if (
    observation.freshness.observedAt.value >
    currentTime.value + policy.maximumFutureSkew.value
  ) {
    return {
      kind: "rejected",
      reason: "future-observation",
      targetId: query.targetId,
    };
  }
  const observationAge = currentTime.value - observation.freshness.observedAt.value;
  if (
    observationAge > 0n &&
    observationAge > policy.maximumObservationAge.value
  ) {
    return {
      kind: "stale",
      reason: "observation-too-old",
      targetId: query.targetId,
    };
  }
  return undefined;
}

async function discoverLocalHost(
  dependencies: ResolvedHostDiscoveryDependencies,
  query: unknown,
): Promise<DiscoverLocalHostResult> {
  const resolvedQuery = snapshotQuery(query);
  if (resolvedQuery === undefined) {
    return { kind: "rejected", reason: "invalid-query" };
  }
  const rawSourceResult = await readSource(
    dependencies.sourceRead,
    resolvedQuery.targetId,
  );
  const sourceResult = sourceTerminalResult(resolvedQuery, rawSourceResult);
  if (!isObservation(sourceResult)) {
    return sourceResult;
  }
  const currentTime = snapshotClock(dependencies.clockNow);
  if (currentTime === undefined) {
    return {
      kind: "unavailable",
      reason: "clock-failure",
      targetId: resolvedQuery.targetId,
    };
  }
  return (
    evaluateFreshness(
      resolvedQuery,
      sourceResult,
      currentTime,
      dependencies.freshnessPolicy,
    ) ?? evaluateCompatibility(resolvedQuery, sourceResult)
  );
}

export function createHostDiscovery(
  dependencies: HostDiscoveryDependencies,
): HostDiscovery {
  const resolvedDependencies = resolveDependencies(dependencies);
  return {
    discover(query) {
      return discoverLocalHost(resolvedDependencies, query);
    },
  };
}
