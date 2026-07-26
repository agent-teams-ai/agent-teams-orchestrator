---
id: ADR-0001
type: adr
status: accepted
owner: architecture
summary: Start as a headless event-driven modular monolith with extractable bounded contexts.
---

# ADR-0001: Headless Event-Driven Modular Monolith

## Context

The orchestrator must serve desktop, web, CLI, and third-party clients while
remaining ready for future service extraction. Starting with microservices would
add deployment, networking, consistency, and observability costs before context
boundaries are proven.

## Decision

Build a headless event-driven modular monolith. Clients communicate through
versioned inbound adapters and SDKs. Bounded contexts use explicit contracts and
integration events.

## Consequences

- One initial deployment and simpler local desktop operation.
- Strong in-repository modular boundaries are mandatory.
- Context-owned persistence and contracts make later extraction possible.
- Distributed-system semantics such as idempotency and eventual consistency are
  designed now even when transport is initially in process.
- Microservice extraction requires evidence, not architectural preference.

## Deferred alternatives

- Microservices from the first release.
- An Electron-owned orchestration service.
- A provider-specific orchestrator.
