import {
  createHostDiscovery,
  epochMicroseconds,
  hostCapabilityId,
  hostProtocolRange,
  hostProtocolVersion,
  microseconds,
  targetId,
} from "@agent-teams/local-host-control";

/**
 * @param {import("@agent-teams/local-host-control").HostDiscoverySource} source
 */
export async function consumeLocalHostDiscovery(source) {
  const discovery = createHostDiscovery({
    clock: { now: () => epochMicroseconds(1_000_000n) },
    freshnessPolicy: {
      maximumFutureSkew: microseconds(100_000n),
      maximumObservationAge: microseconds(1_000_000n),
    },
    source,
  });

  const result = await discovery.discover({
    requiredCapabilities: [hostCapabilityId("host.control.v1")],
    supportedProtocolRange: hostProtocolRange(
      hostProtocolVersion(1n),
      hostProtocolVersion(2n),
    ),
    targetId: targetId("local-default"),
  });

  if (result.kind === "candidate") {
    /** @type {true} */
    const handshakeRequired = result.authenticatedHandshakeRequired;
    void handshakeRequired;
  }
}
