import type {
  EpochMicroseconds,
  HostDiscoveryObservation,
  HostDiscoverySourceRejectedReason,
  HostDiscoveryStaleReason,
  HostDiscoveryUnavailableReason,
  TargetId,
} from "../model/host-discovery.js";

export type HostDiscoverySourceResult =
  | {
      readonly kind: "observed";
      readonly observation: HostDiscoveryObservation;
    }
  | {
      readonly kind: "not-found";
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "stale";
      readonly reason: Exclude<
        HostDiscoveryStaleReason,
        "observation-too-old"
      >;
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "rejected";
      readonly reason: HostDiscoverySourceRejectedReason;
      readonly targetId: TargetId;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: HostDiscoveryUnavailableReason;
      readonly targetId: TargetId;
    };

export interface HostDiscoverySource {
  read(targetId: TargetId): Promise<HostDiscoverySourceResult>;
}

export interface HostDiscoveryClock {
  now(): EpochMicroseconds;
}
