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
one owner.

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

A cohesive business capability that owns its contracts, domain, application,
adapters, composition, and tests.

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

## Runtime Gateway

The anti-corruption boundary that implements narrow runtime capability ports and
translates between orchestration concepts and opaque `ar` contracts.

## Workspace registration

A project-owned record that identifies an approved workspace binding and its
generation without exposing arbitrary paths as domain identity.

## Sidecar

A separately running local process managed by a host application. The desktop may
run orchestrator and runtime sidecars automatically.
