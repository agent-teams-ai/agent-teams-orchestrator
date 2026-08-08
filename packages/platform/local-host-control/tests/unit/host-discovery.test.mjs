import assert from "node:assert/strict";
import { test } from "node:test";

import {
  componentVersion,
  createHostDiscovery,
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
} from "@agent-teams/local-host-control";

const requestedTarget = targetId("local-default");
const requiredCapability = hostCapabilityId("host.control.v1");
function observation(overrides = {}) {
  return {
    capabilities: [requiredCapability, hostCapabilityId("host.status.v1")],
    componentVersion: componentVersion("1.2.3"),
    freshness: {
      evidenceRef: hostFreshnessEvidenceRef("locator-generation-7"),
      kind: "expiry",
      observedAt: epochMicroseconds(1_000_000n),
      validUntil: epochMicroseconds(2_000_000n),
    },
    hostBootGeneration: hostBootGeneration(7n),
    hostInstanceId: hostInstanceId("host-instance-7"),
    protocolRange: hostProtocolRange(
      hostProtocolVersion(1n),
      hostProtocolVersion(3n),
    ),
    supervisorInstanceId: supervisorInstanceId("supervisor-instance-2"),
    targetId: requestedTarget,
    ...overrides,
  };
}

function query(overrides = {}) {
  return {
    requiredCapabilities: [requiredCapability],
    supportedProtocolRange: hostProtocolRange(
      hostProtocolVersion(2n),
      hostProtocolVersion(4n),
    ),
    targetId: requestedTarget,
    ...overrides,
  };
}

function discoveryFor(sourceResult, options = {}) {
  let sourceCalls = 0;
  const discovery = createHostDiscovery({
    clock: {
      now: () => options.now ?? epochMicroseconds(1_500_000n),
    },
    freshnessPolicy: {
      maximumFutureSkew: microseconds(100_000n),
      maximumObservationAge: microseconds(1_000_000n),
    },
    source: {
      async read() {
        sourceCalls += 1;
        if (options.throwSource) {
          throw new Error("raw secret-bearing filesystem failure");
        }
        return sourceResult;
      },
    },
  });
  return { discovery, sourceCalls: () => sourceCalls };
}

test("returns one candidate without claiming readiness or authentication", async () => {
  const fixture = discoveryFor({ kind: "observed", observation: observation() });

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "candidate");
  assert.equal(result.observation.hostInstanceId.value, "host-instance-7");
  assert.deepEqual(result.proposedProtocolVersion, hostProtocolVersion(3n));
  assert.equal(result.authenticatedHandshakeRequired, true);
  assert.equal(Object.hasOwn(result, "ready"), false);
  assert.equal(Object.hasOwn(result, "healthy"), false);
  assert.equal(fixture.sourceCalls(), 1);
});

test("keeps not-found, stale, rejected, and unavailable distinct", async (context) => {
  const cases = [
    [
      { kind: "not-found", targetId: requestedTarget },
      "not-found",
      undefined,
    ],
    [
      { kind: "stale", reason: "superseded", targetId: requestedTarget },
      "stale",
      "superseded",
    ],
    [
      { kind: "rejected", reason: "unsafe-state", targetId: requestedTarget },
      "source-rejected",
      "unsafe-state",
    ],
    [
      {
        kind: "unavailable",
        reason: "permission-denied",
        targetId: requestedTarget,
      },
      "unavailable",
      "permission-denied",
    ],
  ];

  for (const [sourceResult, expectedKind, expectedReason] of cases) {
    await context.test(expectedKind, async () => {
      const fixture = discoveryFor(sourceResult);
      const result = await fixture.discovery.discover(query());
      assert.equal(result.kind, expectedKind);
      assert.equal(result.reason, expectedReason);
      assert.equal(fixture.sourceCalls(), 1);
    });
  }
});

test("treats validUntil as an exclusive freshness boundary", async () => {
  const fixture = discoveryFor(
    { kind: "observed", observation: observation() },
    { now: epochMicroseconds(2_000_000n) },
  );

  const result = await fixture.discovery.discover(query());

  assert.deepEqual(result, {
    kind: "expired",
    targetId: requestedTarget,
    validUntil: epochMicroseconds(2_000_000n),
  });
});

test("rejects future observations beyond immutable clock-skew policy", async () => {
  const fixture = discoveryFor({
    kind: "observed",
    observation: observation({
      freshness: {
        evidenceRef: hostFreshnessEvidenceRef("future-observation"),
        kind: "liveness",
        observedAt: epochMicroseconds(1_700_001n),
        validUntil: epochMicroseconds(2_000_000n),
      },
    }),
  });

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "rejected");
  assert.equal(result.reason, "future-observation");
});

test("marks old but unexpired observations stale", async () => {
  const fixture = discoveryFor(
    {
      kind: "observed",
      observation: observation({
        freshness: {
          evidenceRef: hostFreshnessEvidenceRef("old-observation"),
          kind: "liveness",
          observedAt: epochMicroseconds(100_000n),
          validUntil: epochMicroseconds(3_000_000n),
        },
      }),
    },
    { now: epochMicroseconds(1_500_001n) },
  );

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "stale");
  assert.equal(result.reason, "observation-too-old");
});

test("reports protocol and capability incompatibility without a handle", async () => {
  const fixture = discoveryFor({ kind: "observed", observation: observation() });
  const missingCapability = hostCapabilityId("host.doctor.v1");

  const result = await fixture.discovery.discover(
    query({
      requiredCapabilities: [requiredCapability, missingCapability],
      supportedProtocolRange: hostProtocolRange(
        hostProtocolVersion(4n),
        hostProtocolVersion(5n),
      ),
    }),
  );

  assert.equal(result.kind, "incompatible");
  assert.equal(result.protocolCompatible, false);
  assert.deepEqual(result.missingCapabilities, [missingCapability]);
  assert.equal(Object.hasOwn(result, "connectionHandle"), false);
  assert.equal(Object.hasOwn(result, "observation"), false);
});

test("rejects target substitution for observed and non-observed results", async (context) => {
  const otherTarget = targetId("other-target");
  const cases = [
    { kind: "observed", observation: observation({ targetId: otherTarget }) },
    { kind: "not-found", targetId: otherTarget },
  ];

  for (const sourceResult of cases) {
    await context.test(sourceResult.kind, async () => {
      const fixture = discoveryFor(sourceResult);
      const result = await fixture.discovery.discover(query());
      assert.deepEqual(result, {
        kind: "rejected",
        reason: "target-mismatch",
        targetId: requestedTarget,
      });
    });
  }
});

test("rejects malformed observations and duplicate capabilities", async (context) => {
  const cases = [
    observation({ hostInstanceId: "" }),
    observation({
      capabilities: [requiredCapability, requiredCapability],
    }),
    observation({
      protocolRange: {
        maximum: hostProtocolVersion(1n),
        minimum: hostProtocolVersion(2n),
      },
    }),
    observation({
      freshness: {
        evidenceRef: hostFreshnessEvidenceRef("bad-order"),
        kind: "liveness",
        observedAt: epochMicroseconds(3_000_000n),
        validUntil: epochMicroseconds(2_000_000n),
      },
    }),
  ];

  for (const invalidObservation of cases) {
    await context.test("invalid observation", async () => {
      const fixture = discoveryFor({
        kind: "observed",
        observation: invalidObservation,
      });
      const result = await fixture.discovery.discover(query());
      assert.equal(result.kind, "rejected");
      assert.equal(result.reason, "invalid-observation");
    });
  }
});

test("rejects forged invalid queries without consulting the source", async () => {
  const fixture = discoveryFor({ kind: "not-found", targetId: requestedTarget });

  const result = await fixture.discovery.discover(
    query({ requiredCapabilities: [requiredCapability, requiredCapability] }),
  );

  assert.equal(result.kind, "rejected");
  assert.equal(result.reason, "invalid-query");
  assert.equal(Object.hasOwn(result, "targetId"), false);
  assert.equal(fixture.sourceCalls(), 0);
});

test("validated constructors reject malformed exact values", () => {
  assert.throws(() => Reflect.apply(targetId, undefined, [42]), TypeError);
  assert.throws(() => targetId(""), TypeError);
  assert.throws(() => targetId(" leading-space"), TypeError);
  assert.throws(() => hostProtocolVersion(0n), TypeError);
  assert.throws(() => hostBootGeneration(-1n), TypeError);
  assert.throws(() => microseconds(-1n), TypeError);
  assert.throws(
    () =>
      hostProtocolRange(
        hostProtocolVersion(2n),
        hostProtocolVersion(1n),
      ),
    TypeError,
  );
});

test("returns a typed clock failure without consulting another source", async () => {
  let sourceCalls = 0;
  const discovery = createHostDiscovery({
    clock: {
      now() {
        throw new Error("unavailable clock implementation");
      },
    },
    freshnessPolicy: {
      maximumFutureSkew: microseconds(100_000n),
      maximumObservationAge: microseconds(1_000_000n),
    },
    source: {
      async read() {
        sourceCalls += 1;
        return { kind: "observed", observation: observation() };
      },
    },
  });

  const result = await discovery.discover(query());

  assert.equal(result.kind, "unavailable");
  assert.equal(result.reason, "clock-failure");
  assert.equal(sourceCalls, 1);
});

test("snapshots a stateful clock instant exactly once", async () => {
  let instantReads = 0;
  const discovery = createHostDiscovery({
    clock: {
      now: () => ({
        type: "EpochMicroseconds",
        get value() {
          instantReads += 1;
          return instantReads === 1 ? 1_500_000n : 3_000_000n;
        },
      }),
    },
    freshnessPolicy: {
      maximumFutureSkew: microseconds(100_000n),
      maximumObservationAge: microseconds(1_000_000n),
    },
    source: {
      async read() {
        return { kind: "observed", observation: observation() };
      },
    },
  });

  const result = await discovery.discover(query());

  assert.equal(result.kind, "candidate");
  assert.equal(instantReads, 1);
});

test("accepts exact freshness-policy boundaries", async () => {
  const fixture = discoveryFor({
    kind: "observed",
    observation: observation({
      freshness: {
        evidenceRef: hostFreshnessEvidenceRef("boundary-observation"),
        kind: "liveness",
        observedAt: epochMicroseconds(500_000n),
        validUntil: epochMicroseconds(2_000_001n),
      },
    }),
  });

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "candidate");
});

test("redacts thrown source errors and performs no retry", async () => {
  const fixture = discoveryFor(undefined, { throwSource: true });

  const result = await fixture.discovery.discover(query());

  assert.deepEqual(result, {
    kind: "unavailable",
    reason: "source-failure",
    targetId: requestedTarget,
  });
  assert.equal(fixture.sourceCalls(), 1);
  assert.equal(JSON.stringify(result).includes("secret-bearing"), false);
});

test("maps malformed source unions to a closed rejected outcome", async () => {
  const fixture = discoveryFor({ kind: "unexpected-adapter-result" });

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "rejected");
  assert.equal(result.reason, "invalid-source-response");
});

test("snapshots a stateful observation identity exactly once", async () => {
  let targetReads = 0;
  const sourceObservation = observation();
  Object.defineProperty(sourceObservation, "targetId", {
    configurable: true,
    enumerable: true,
    get() {
      targetReads += 1;
      return targetReads === 1 ? requestedTarget : targetId("foreign-target");
    },
  });
  const fixture = discoveryFor({
    kind: "observed",
    observation: sourceObservation,
  });

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "candidate");
  assert.equal(result.observation.targetId.value, requestedTarget.value);
  assert.equal(targetReads, 1);
});

test("closes throwing source accessors into invalid-source-response", async () => {
  const fixture = discoveryFor({
    kind: "not-found",
    get targetId() {
      throw new Error("secret-path");
    },
  });

  const result = await fixture.discovery.discover(query());

  assert.deepEqual(result, {
    kind: "rejected",
    reason: "invalid-source-response",
    targetId: requestedTarget,
  });
});

test("rejects throwing query accessors without consulting the source", async () => {
  const fixture = discoveryFor({ kind: "not-found", targetId: requestedTarget });
  const invalidQuery = query();
  Object.defineProperty(invalidQuery, "targetId", {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error("untrusted-query-accessor");
    },
  });

  const result = await fixture.discovery.discover(invalidQuery);

  assert.deepEqual(result, { kind: "rejected", reason: "invalid-query" });
  assert.equal(fixture.sourceCalls(), 0);
});

test("does not read a token payload after its discriminant is rejected", async () => {
  let payloadReads = 0;
  const fixture = discoveryFor({ kind: "not-found", targetId: requestedTarget });
  const invalidQuery = query({
    targetId: {
      type: "HostInstanceId",
      get value() {
        payloadReads += 1;
        throw new Error("payload-must-remain-unread");
      },
    },
  });

  const result = await fixture.discovery.discover(invalidQuery);

  assert.deepEqual(result, { kind: "rejected", reason: "invalid-query" });
  assert.equal(payloadReads, 0);
  assert.equal(fixture.sourceCalls(), 0);
});

test("does not read source payload for an unknown result kind", async () => {
  let payloadReads = 0;
  const fixture = discoveryFor({
    kind: "unknown-result",
    get targetId() {
      payloadReads += 1;
      throw new Error("payload-must-remain-unread");
    },
  });

  const result = await fixture.discovery.discover(query());

  assert.deepEqual(result, {
    kind: "rejected",
    reason: "invalid-source-response",
    targetId: requestedTarget,
  });
  assert.equal(payloadReads, 0);
});

test("redacts dependency accessor failures during construction", () => {
  const dependencies = new Proxy(
    {},
    {
      get() {
        throw new Error("secret-dependency-path");
      },
    },
  );

  assert.throws(
    () => createHostDiscovery(dependencies),
    (error) =>
      error instanceof TypeError &&
      error.message === "Host discovery dependencies are invalid",
  );
});

test("projects a closed candidate without source-only authority fields", async () => {
  const sourceObservation = observation();
  sourceObservation.ready = true;
  sourceObservation.authorized = true;
  sourceObservation.rawCredential = "must-not-leak";
  const fixture = discoveryFor({
    kind: "observed",
    observation: sourceObservation,
  });

  const result = await fixture.discovery.discover(query());

  assert.equal(result.kind, "candidate");
  assert.equal(Object.hasOwn(result.observation, "ready"), false);
  assert.equal(Object.hasOwn(result.observation, "authorized"), false);
  assert.equal(Object.hasOwn(result.observation, "rawCredential"), false);
});

test("snapshots mutable policy and query before asynchronous source work", async () => {
  let resolveSource;
  const sourceResult = new Promise((resolve) => {
    resolveSource = resolve;
  });
  const freshnessPolicy = {
    maximumFutureSkew: microseconds(100_000n),
    maximumObservationAge: microseconds(1_000_000n),
  };
  const discovery = createHostDiscovery({
    clock: { now: () => epochMicroseconds(1_500_001n) },
    freshnessPolicy,
    source: { read: () => sourceResult },
  });
  const mutableQuery = query({
    requiredCapabilities: [hostCapabilityId("missing.v1")],
    supportedProtocolRange: hostProtocolRange(
      hostProtocolVersion(4n),
      hostProtocolVersion(5n),
    ),
  });
  const pendingResult = discovery.discover(mutableQuery);

  mutableQuery.requiredCapabilities.length = 0;
  mutableQuery.supportedProtocolRange = hostProtocolRange(
    hostProtocolVersion(1n),
    hostProtocolVersion(3n),
  );
  freshnessPolicy.maximumObservationAge = microseconds(10_000_000n);
  resolveSource({
    kind: "observed",
    observation: observation({
      freshness: {
        evidenceRef: hostFreshnessEvidenceRef("old-but-unexpired"),
        kind: "liveness",
        observedAt: epochMicroseconds(100_000n),
        validUntil: epochMicroseconds(3_000_000n),
      },
    }),
  });

  const result = await pendingResult;

  assert.equal(result.kind, "stale");
  assert.equal(result.reason, "observation-too-old");
});

test("bounds query and source capability collections", async () => {
  const capabilities = Array.from({ length: 65 }, (_, index) =>
    hostCapabilityId(`capability.${index}`),
  );
  const queryFixture = discoveryFor({
    kind: "not-found",
    targetId: requestedTarget,
  });
  const invalidQuery = await queryFixture.discovery.discover(
    query({ requiredCapabilities: capabilities }),
  );
  assert.equal(invalidQuery.kind, "rejected");
  assert.equal(invalidQuery.reason, "invalid-query");
  assert.equal(queryFixture.sourceCalls(), 0);

  const observationFixture = discoveryFor({
    kind: "observed",
    observation: observation({ capabilities }),
  });
  const invalidObservation = await observationFixture.discovery.discover(query());
  assert.equal(invalidObservation.kind, "rejected");
  assert.equal(invalidObservation.reason, "invalid-observation");
});

test("rejects forged exact values outside signed and unsigned 64-bit bounds", async () => {
  const uint64Overflow = 1n << 64n;
  const int64Overflow = 1n << 63n;
  const invalidQueryFixture = discoveryFor({
    kind: "not-found",
    targetId: requestedTarget,
  });
  const invalidQuery = await invalidQueryFixture.discovery.discover(
    query({
      supportedProtocolRange: {
        minimum: { type: "HostProtocolVersion", value: 1n },
        maximum: { type: "HostProtocolVersion", value: uint64Overflow },
      },
    }),
  );
  assert.deepEqual(invalidQuery, { kind: "rejected", reason: "invalid-query" });
  assert.equal(invalidQueryFixture.sourceCalls(), 0);

  const invalidObservationFixture = discoveryFor({
    kind: "observed",
    observation: observation({
      hostBootGeneration: {
        type: "HostBootGeneration",
        value: uint64Overflow,
      },
    }),
  });
  const invalidObservation = await invalidObservationFixture.discovery.discover(
    query(),
  );
  assert.equal(invalidObservation.kind, "rejected");
  assert.equal(invalidObservation.reason, "invalid-observation");

  const invalidClockFixture = discoveryFor(
    { kind: "observed", observation: observation() },
    {
      now: { type: "EpochMicroseconds", value: int64Overflow },
    },
  );
  const invalidClock = await invalidClockFixture.discovery.discover(query());
  assert.equal(invalidClock.kind, "unavailable");
  assert.equal(invalidClock.reason, "clock-failure");

  assert.throws(
    () =>
      createHostDiscovery({
        clock: { now: () => epochMicroseconds(0n) },
        freshnessPolicy: {
          maximumFutureSkew: {
            type: "Microseconds",
            value: uint64Overflow,
          },
          maximumObservationAge: microseconds(1n),
        },
        source: {
          async read() {
            return { kind: "not-found", targetId: requestedTarget };
          },
        },
      }),
    (error) =>
      error instanceof TypeError &&
      error.message === "Host discovery freshness policy is invalid",
  );
});

test("exports the feature through the package root", async () => {
  const packageRoot = await import("@agent-teams/local-host-control");
  assert.equal(typeof packageRoot.createHostDiscovery, "function");
  assert.equal(typeof packageRoot.targetId, "function");
});
