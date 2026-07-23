# Glossary

## Agent runtime

The execution and safety layer that starts, observes, resumes, cancels, and
recovers provider sessions and processes. In this architecture, `ar` is the agent
runtime.

## Aggregate

A DDD consistency boundary with one aggregate root. All state changes preserve its
invariants transactionally.

## Anti-corruption layer

A translation boundary that prevents an external or legacy model from leaking
into the receiving domain.

## Bounded context

A boundary within which domain terms and models have one consistent meaning and
one owner. It owns its business model, data, Published Language, and consistency
rules. It may run in-process or as a service; deployment does not define the
boundary.

## Command

A request to perform an action. Commands may be rejected and must carry an
idempotency identity when retries are possible.

## Application model

A transport-independent input or output type owned by an application use case. It
is distinct from a public SDK, transport, or integration-event contract.

## Control plane

The layer that decides desired coordination state and policy. It does not perform
provider execution itself.

## Domain event

A fact emitted by domain behavior inside a bounded context.

## Feature-owned vertical slice

A domain-capability module inside one bounded context. It owns cohesive domain and
application behavior plus required adapters and contracts. It is not a smaller
bounded context by default.

## Fencing token

A monotonic or otherwise authoritative ownership token used to reject stale
runtime mutations.

## Inbox

Durable consumer-side idempotency and delivery state. It is distinct from an
agent's product-level message inbox.

## Integration event

A versioned public fact published for other bounded contexts or external
consumers.

## Open Host Service

A DDD relationship where an upstream context exposes a documented protocol for
multiple consumers. Often abbreviated OHS.

## Orchestration run

A durable product-level coordination lifecycle. It may involve multiple runtime
runs, tasks, messages, retries, and approvals.

## Outbox

Records written transactionally with business state and later relayed to an event
transport.

## Port

An interface declared at an architecture boundary. Inbound ports expose use cases;
outbound ports describe required external capabilities.

## Process manager

Durable coordination state for a long-running or cross-aggregate business process.
It consumes commands and events, schedules timers and effects, handles
idempotency, and has one owning bounded context.

## Persistence profile

A composition-time choice of concrete persistence runtimes and adapters, such as
embedded local storage or hosted PostgreSQL. Domain and application behavior does
not branch on the active profile.

## Project scope

The ownership boundary that contains teams, tasks, runs, messages, and workspace
bindings for one project. Cross-project access requires explicit authorization.

## Published Language

A stable model or schema used by an upstream context to communicate with
downstream consumers without exposing internal domain objects.

## Projection

A query-optimized read model derived from authoritative state and events.

## Public contract

A versioned command, query, event, snapshot, or error schema exposed at a system or
context boundary. Public contracts are mapped by adapters and are not application
or domain models.

## Query Composition

An edge component that joins published read models for clients without owning
aggregates or writing context storage.

## Provider

An agent implementation such as Claude, Codex, or OpenCode. Provider-specific
logic belongs in an `ar` driver.

## Runtime run

An opaque execution lifecycle owned by `ar`, referenced by the orchestrator but
not reconstructed from provider internals.

## Runtime ACL

The stateless anti-corruption adapter that implements consumer-owned runtime
capability ports and translates between orchestration concepts and opaque `ar`
contracts. It does not own runtime bindings or orchestration observation state.

## Workspace registration

A project-owned record that identifies an approved workspace binding and its
generation without exposing arbitrary paths as domain identity.

## Sidecar

A separately running local process managed by a host application. The desktop may
run orchestrator and runtime sidecars automatically.

## Tenant

The top-level hosted ownership and isolation identity for projects, principals,
grants, and tenant-scoped policy. Tenant and Project Registry owns its lifecycle;
other contexts hold opaque local references.
