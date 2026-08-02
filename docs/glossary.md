---
id: glossary.system
type: glossary
status: active
owner: architecture/domain
summary: Cross-system terminology shared by multiple bounded contexts and integrations.
---

# Glossary

## Agent runtime

The execution and safety layer that starts, observes, resumes, cancels, and
recovers provider sessions and processes. In this architecture, `ar` is the agent
runtime.

## Agent profile identity

The stable product identity of an agent definition owned by Team Topology and
represented by `AgentProfileId`. It is distinct from an authenticated principal,
team membership, and every AR runtime session.

## Agent Attention

The bounded context that decides whether an admitted source fact is relevant and
novel enough to re-orient a specific agent for a purpose. It owns coalescing,
expiry, disruption intent, and feedback-loop suppression, but cannot wake,
interrupt, or command a Run.

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

## Command descriptor

A stable, server-owned semantic identifier for one durable command capability,
such as `runs.create.v1`. Together with canonical resource scope and `requestId`,
it defines the complete idempotency identity. It is derived from the invoked API
capability rather than trusted from caller payload.

## Request ID

The one caller-supplied idempotency identity of a durable control command. A
crash-safe caller persists it before sending. Its uniqueness and reconciliation
scope also include canonical resource scope and server-owned command descriptor.

## Client Profile

User-owned defaults that select an orchestrator Target and optional default
tenant or project scope. A Client Profile is not a deployment, process, Workspace,
or trust authority.

## Application model

A transport-independent input or output type owned by an application use case. It
is distinct from a public SDK, transport, or integration-event contract.

## Authority evidence

Restricted evidence that an authority decision or check occurred. It is never the
authority credential itself and cannot include an AR-private execution fence.

## Control plane

The layer that decides desired coordination state and policy. It does not perform
provider execution itself.

## Controlled egress

An outbound adapter boundary that validates destination, scheme, resolved
addresses, redirects, size, and policy before external network access.

## Control Published Language

The feature-owned, versioned Protobuf services and messages exposed to
orchestrator clients. It is distinct from integration events and the `ar` Runtime
Published Language.

## Domain event

A fact emitted by domain behavior inside a bounded context.

## Data classification manifest

A feature-owned machine-readable declaration of classification, scope,
retention class, redaction, export policy, user content, and authority evidence
for an externally observable data surface.

## Feature-owned vertical slice

A domain-capability module inside one bounded context. It owns cohesive domain and
application behavior plus required adapters and contracts. It is not a smaller
bounded context by default.

## Fencing token

A monotonic or otherwise authoritative ownership token used to reject stale
runtime mutations.

## Human Notification Management

The bounded context that owns human-facing notification inbox, presentation
preferences, read, snooze, digest, acknowledgement, and escalation semantics. It
does not own the source fact and cannot suppress Agent Attention or context
freshness.

## ETag

An opaque public concurrency token representing the observed version of a
resource. It is not a database version or public aggregate revision.

## ECMAScript Temporal

The JavaScript date, time, calendar, and timezone API that succeeds `Date`.
Orchestrator calendar adapters may use it to resolve exact period boundaries. It
is unrelated to the Temporal.io workflow engine and its objects never become
domain or public contract types.

## Error budget

The permitted amount of unsuccessful service within an approved SLO window. Its
policy defines concrete engineering and release actions when the budget is being
consumed too quickly or is exhausted.

## Execution epoch

A non-authorizing AR observation used to distinguish technical custody
generations. It may change while the published runtime-session identity remains
unchanged. It is not an `ExecutionFence`, capability token, or orchestrator
aggregate revision.

## Execution workspace allocation

A durable Workspace Registry resource representing one materialized workspace
view and its normalized sharing, access, consistency, lifecycle, and cleanup
guarantees. A Git worktree may implement an allocation but is not a security
sandbox.

## Inbox

Durable consumer-side idempotency and delivery state. It is distinct from an
agent's product-level message inbox.

## Inbound adapter

An outer adapter that translates an external trigger and invokes an application
inbound port. Direction is relative to the application core, not network traffic.
HTTP handlers, CLI commands, SDK entry points, broker consumers, and Temporal
Activity Workers are typical inbound adapters.

## Integration event

A versioned public fact published for other bounded contexts or external
consumers.

## Local Supervisor

The small per-user technical process that discovers, ensures, monitors, drains,
and activates versioned local orchestrator components. It owns process
availability, not orchestration behavior, JetStream semantics, or provider
execution.

## Open Host Service

A DDD relationship where an upstream context exposes a documented protocol for
multiple consumers. Often abbreviated OHS.

## Orchestrator Host

The versioned deployable process that composes orchestrator bounded contexts,
public control adapters, persistence, Runtime ACL, and eventing adapters. The
local Host is managed by the Local Supervisor; the hosted Host is managed by its
deployment platform.

## Orchestration run

A durable product-level coordination lifecycle. It may involve multiple runtime
sessions and operations, tasks, messages, retries, and approvals.

## Run plan version

An immutable, validated Run Orchestration artifact containing the topology
reference, policy snapshot, capability requirements, and placement intent for one
Run plan revision. It is promoted by `OrchestrationRun`; it is not a second
mutable authority aggregate.

## Work execution

A Work Coordination business resource representing one execution lifecycle of
accepted Work. Work Coordination alone changes its lifecycle and related Task
consequences.

## Work placement

Run Orchestration durable process state that places one `WorkExecution` onto an
eligible Run participant. It stores opaque references and expected revisions but
does not own Work lifecycle or AR execution.

## Operation

An addressable, durable result handle created when a long-running command is
accepted. It survives client disconnects and has one immutable terminal outcome.
Its state is owned by the command's feature; a common Operations API only routes
to that owner and composes cross-feature read projections.

An orchestrator `Operation` is not an AR `RuntimeOperation`.

## Outbox

Records written transactionally with business state and later relayed to an event
transport.

## Outbound adapter

An outer adapter that implements a capability required through an application
outbound port. Persistence, event publication, agent runtime, workflow engines,
clocks, secret stores, and external APIs are typical outbound adapters. A
technology used for both inbound and outbound roles is represented by separate
adapter modules.

## Port

An interface declared at an architecture boundary. Inbound ports expose use cases;
outbound ports describe required external capabilities.

## Principal identity

The Identity Registry identity of an authenticated human or machine actor,
represented by `PrincipalId`. It does not imply an agent profile, team membership,
authorization grant, or runtime session.

## Product approval

An orchestrator-owned request and decision lifecycle that applies product policy,
selects eligible authorities, routes a decision, and records auditable evidence.
It is distinct from an `ar` technical runtime permission request.

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

## Runtime session reference

An opaque orchestrator-side reference to an AR-owned technical runtime session,
represented by `RuntimeSessionRef`. It is not a principal identity, agent profile,
team membership, business run, or authorization credential.

## Runtime permission request

An `ar`-owned technical request to grant or deny a scoped runtime capability.
`ar` owns its revision, execution fence, expiry validation, capability scope,
decision acceptance, and provider enforcement. The orchestrator may correlate it
to a separate product approval through an opaque authority decision reference.

## Runtime operation

An AR-owned provider-visible technical unit of runtime input or work. It is
distinct from an orchestrator public `Operation`, a `WorkExecution`, and a
`WorkPlacement`.

## Runtime ACL

The stateless anti-corruption adapter that implements consumer-owned runtime
capability ports and translates between orchestration concepts and opaque `ar`
contracts. It does not own runtime bindings or orchestration observation state.

## Run lifetime policy

The immutable choice between client-bound and durable orchestration Run lifetime.
Client-bound Runs use explicit fenced sponsorship; durable Runs survive every
client disconnect. It never controls shared Host or infrastructure lifetime.

## Runtime isolation requirement

The provider-neutral security properties that AR must enforce for one runtime,
including filesystem, process, network, and capability restrictions. It is
independent from workspace checkout or materialization strategy.

## Resource budget

A measured limit protecting a deployment from saturation, such as queue depth,
event-loop delay, memory, disk headroom, or metric cardinality. It is not an SLO
and does not claim that a user journey succeeded.

## Service-level indicator

A specification and implementation for measuring one user-visible reliability
outcome. Often abbreviated SLI.

## Service-level objective

An approved target and measurement window for an SLI, with an owner, review date,
and enforceable error-budget policy. Often abbreviated SLO.

## Secret reference

An opaque identifier resolved only by a secret adapter. It is not the secret
value and grants no authority by itself.

## Workspace registration

A project-owned record that identifies a registered workspace binding and its
generation without exposing arbitrary paths as domain identity.

## Sidecar

A separately running process deployed beside a host application. It describes a
deployment relationship, not business ownership.

## Sidecar supervisor

A generic host-owned lifecycle component for one child sidecar. ADR-0060
superseded Desktop-owned orchestrator sidecar supervision with the shared Local
Supervisor model.

## Snapshot watermark

The feed position whose effects are included in a snapshot. A matching resume
cursor begins strictly after that position.

## Tenant

The top-level hosted ownership and isolation identity for projects, principals,
grants, and tenant-scoped policy. Orchestration Scope owns the stable
OrchestrationTenant identity and lifecycle; external Platform or Standalone
Authority identity remains opaque. Other contexts hold opaque local references.

## Trust boundary

A boundary across which identity, scope, data, or control cannot be trusted
implicitly. Every crossing requires an explicit protocol and authority model.

## Target

One concrete local or remote orchestrator deployment and its trust configuration.
A Target is selected by a Client Profile and is independent of the current
project directory or Workspace.

## Temporal.io

The durable workflow platform used through a Run Orchestration adapter for
scheduling, replay, timers, retries, signals, and Activities. Temporal.io workflow
history is not business aggregate state and is unrelated to ECMAScript Temporal.
