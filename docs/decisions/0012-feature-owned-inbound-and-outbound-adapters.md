---
id: ADR-0012
type: adr
status: accepted
owner: architecture
summary: Colocate role-specific inbound and outbound adapters inside owning feature slices.
---

# ADR-0012: Feature-Owned Inbound and Outbound Adapters

## Context

The orchestrator combines Full DDD, feature-owned vertical slices, Clean
Architecture, and Hexagonal Architecture. DDD does not prescribe physical folder
names, while the orchestrator requires several entry mechanisms and external
capabilities: SDK, HTTP, CLI, NATS JetStream, Temporal, persistence, and `ar`.

Generic `interfaces` and `infrastructure` directories do not communicate the
direction of these dependencies clearly in TypeScript. Short `in` and `out`
directories are also easy to interpret as network or payload direction, which is
incorrect for long-lived streams and event-driven integrations.

## Decision

Each feature owns the role-appropriate domain, application, ports, adapters,
contracts, and tests required by that capability. Bounded-context features use
tactical DDD where domain complexity justifies it. Integration, platform, client,
and testing features retain feature ownership without manufacturing domain
artifacts. When present, application ports and adapters use explicit direction
names:

```text
features/<feature>/
  domain/
  application/
    ports/
      inbound/
      outbound/
  adapters/
    inbound/
    outbound/
```

Directories are created only when the feature has corresponding artifacts.

Direction is defined relative to the application core:

- an inbound port exposes an application use case;
- an inbound adapter translates an external trigger and invokes that port;
- an outbound port declares a capability required by application code;
- an outbound adapter implements that capability using external technology.

Network traffic and payload flow do not determine direction. A technology that
performs both roles is split into role-specific modules. For example, a JetStream
consumer is inbound and a JetStream publisher is outbound, even when both share a
connection created by composition.

All feature-specific mappings, repositories, handlers, schemas, and recovery
behavior remain inside the owning feature. Context and process composition may
create and share low-level connections and lifecycle resources, but may not absorb
feature behavior.

## Consequences

- Folder names encode the Dependency Inversion direction.
- Full DDD remains focused on model ownership rather than ceremonial layers.
- External technologies can be replaced without changing domain or application
  behavior.
- Event-driven and bidirectional integrations require explicit role separation.
- Architecture tests can prohibit adapter imports from domain/application and
  broad modules that combine inbound and outbound responsibilities.
- Some mapping and adapter code is intentionally duplicated when features or
  bounded contexts own different meanings.

## Rejected alternatives

- `interfaces/application/domain/infrastructure` as the universal feature layout.
- `presentation/application/domain/infrastructure`, because presentation does not
  describe broker consumers, CLI, SDK, or workflow workers.
- `primary/secondary` or `driving/driven` directory names, which are valid
  Hexagonal Architecture terms but less immediately clear to contributors.
- Classifying adapters by network request, response, or event payload direction.
