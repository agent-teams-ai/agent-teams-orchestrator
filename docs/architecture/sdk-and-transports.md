# SDK and Transports

Status: **Accepted architecture; implementation deferred**

## SDK role

The SDK is a typed client for orchestrator commands, queries, and subscriptions.
It contains no orchestration business logic and does not expose aggregates.

Illustrative API:

```ts
client.teams.create(input);
client.tasks.assign(input);
client.runs.start(input);
client.runs.cancel(input);
client.messages.send(input);
client.events.subscribe(options);
```

Method names are illustrative until public contracts are accepted.

## Responsibilities

An SDK may own:

- request and response typing;
- schema validation;
- authentication metadata;
- idempotency-key generation;
- transport retries that are safe by contract;
- pagination and subscription cursors;
- error-code mapping;
- protocol-version negotiation.

An SDK may not own:

- task assignment policy;
- retry or completion policy;
- runtime selection;
- message routing decisions;
- aggregate state;
- provider-specific behavior.

## Contract source

Hand-authored, versioned JSON Schemas are the initial language-neutral source for:

- commands;
- query inputs and results;
- integration events;
- error envelopes;
- runtime projections.

TypeScript types and future clients for other languages are generated from these
schemas. Generated code is not edited manually.

The exact control API protocol, such as HTTP, gRPC, or JSON-RPC, remains an open
decision. Public semantics must remain independent from that choice.

## Transport adapters

Expected inbound adapters:

- in-process adapter for tests;
- local sidecar transport for desktop;
- HTTP or gRPC for hosted control operations;
- NATS for asynchronous commands and subscriptions where appropriate.

Not every operation should be a broker message. Immediate validation and queries
may use request-response transports while durable work and event delivery use the
event bus.

## Compatibility

Contracts follow additive evolution where possible:

- required fields cannot be added to an existing version;
- semantic changes require a new schema version;
- unknown additive fields must be tolerated where the protocol permits;
- removals require a deprecation window;
- SDK and server compatibility is tested as a matrix.

## Client-specific adapters

Desktop and web applications translate their local DTOs into SDK contracts. Their
IPC, state stores, and UI models remain outside this repository.

This prevents `TeamCreateRequest` or another current frontend DTO from becoming a
permanent domain boundary by accident.
