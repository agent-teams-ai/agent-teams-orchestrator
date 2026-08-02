---
id: OD-026
type: open-decision
status: open
owner: architecture/domain
summary: Define boundaries among conversations, notifications, alerts, subscriptions, attention, and runtime delivery.
related:
  - ADR-0068
  - architecture.context-map
  - architecture.runtime-boundary
  - domain.contexts.agent-communication
  - domain.contexts.work-coordination
  - OD-004
  - OD-006
  - OD-028
  - OD-034
  - research.human-notification-agent-attention-boundary-critique-2026-07-30
  - research.pre-implementation-gate-critique-2026-07-30
---

# OD-026: Communication, Notification, and Attention

## Decision required

ADR-0068 fixed separate Human Notification Management and Agent Attention bounded
contexts. Define the remaining tactical ownership and behavior for:

- human-to-agent and agent-to-agent conversations;
- task comments and other source-owned collaboration facts;
- recipient-specific notifications and subscriptions;
- rare user-facing alerts, acknowledgement, suppression, and escalation;
- product delivery timing, wake, safe-point, and interruption intent;
- technical runtime-input application and reconciliation.

The strategic split is no longer open. The contexts share technical platform
primitives but no domain model, database transaction, repository, status enum,
subscription aggregate, or delivery pipeline. The complete evidence, tactical
candidates, failure matrix, and deferred scope are in the
[boundary critique](../research/human-notification-agent-attention-boundary-critique-2026-07-30.md).

## Already fixed constraints

- Human Notification Management and Agent Attention are separate bounded contexts
  under one conceptual subdomain, as accepted by ADR-0068.
- Product Conversation belongs to the Orchestrator. AR owns technical runtime input,
  provider output, transcript, compaction, and input-application mechanisms.
- A task comment remains owned by Work Coordination and never creates a
  Conversation message implicitly.
- A notification references its source fact and cannot become a second owner of the
  source content or lifecycle.
- An ordinary agent-to-user message is a Conversation command.
- A critical alert cannot be expressed as `PostMessage(critical = true)`. Alert
  authority, evidence, fingerprinting, cooldown, acknowledgement, and escalation
  require an explicit policy.
- Attention severity and runtime interruption are independent decisions.
- Durable product delivery remains in Orchestrator state. AR may keep technical
  dispatch state but cannot become the product mailbox.
- Transport acknowledgement, runtime acceptance, presentation, read, processing,
  and domain acknowledgement are different facts.
- Approvals, permissions, workflow signals, and telemetry do not become chat
  messages or notification kinds merely to reuse a queue.
- A connector webhook, broker record, and external protocol event are observations,
  not trusted prompt content. They pass through signature, tenancy, ACL, dedupe,
  schema, and semantic-owner boundaries before they can affect attention or context.
- Conversation ordering is a domain sequence. Broker sequence, source timestamp,
  and delivery-attempt order are transport evidence only.

## Candidate source-to-agent model

```text
External source
  -> future integration owner selected by OD-034 verifies and reconciles source input
  -> semantic owner admits the change and publishes one source-owned fact
       -> Human Notification ACL -> local notification command
       -> Agent Attention ACL -> local attention command -> orientation intent
       -> Agent Context ACL -> invalidation or refresh command
  -> Run Orchestration alone decides wake, checkpoint, or interruption
  -> Runtime ACL -> AR technical context application
```

The producer does not know which consumers exist and does not publish
downstream-specific candidates. Each consumer independently maps the same
producer-owned fact through its anti-corruption layer and durable inbox.
Suppressing, snoozing, or digesting a human notification cannot suppress agent
orientation or leave an already disclosed context contribution falsely marked as
fresh. Context invalidation does not by itself authorize waking or interrupting
an agent.

The following subscriptions have separate owners and must not collapse into one
generic subscription table:

- a connector subscription selects upstream Jira, Notion, Discord, A2A, or other
  events and belongs to the future integration owner selected by OD-034;
- a human notification subscription or preference expresses presentation,
  mute, snooze, digest, acknowledgement, and escalation policy and belongs to
  Human Notification Management;
- an agent attention subscription expresses agent, purpose, source, novelty,
  budget, coalescing, and expiry policy and belongs to Agent Attention;
- a context binding authorizes a source to contribute to a team, agent, purpose,
  or Run and belongs to Agent Context.

Jira, Notion, Discord, A2A, and similar systems are adapters. Their raw schemas do
not become internal domain events, notification kinds, or Agent Context models.

## Candidate delivery policy

Human notification intent and agent attention intent must not share one public
or domain type. The earlier generic candidate is split:

```text
HumanNotificationIntent
  humanRecipientSelector
  presentationProfile
  deliverBy?
  expiresAt?
  acknowledgementRequirement?
  aggregationPolicy?

AgentAttentionIntent
  agentRef
  purposeRef
  semanticSubjectRef
  orientationProfile
  deliverBy?
  expiresAt?
  sourceRevision
  policySnapshotRef
```

Agent Attention may normalize its intent into:

```text
importance and urgency
not-before, deliver-by, and expiry
disruption budget
offline policy: retain | wake-existing | start-if-authorized
application boundary: next-checkpoint | after-operation | safe-point
required evidence
ordering lane
```

Human presentation preferences never modify these dimensions. The names and exact
profiles remain unresolved. `Critical` does not automatically grant process-start
or interruption authority. `When idle`
cannot be inferred from silence, prompt text, or UI status; it requires a current
runtime observation and matching execution generation. Interruption is a
cooperative request to reach a supported safe point, not an alias for process kill.

## Candidate delivery evidence

A single `message.status` cannot represent end-to-end delivery. Candidate models
are an immutable Message revision, one recipient-specific Delivery, one or more
Delivery Attempts, and append-only typed evidence. This is an audit and
reconciliation ledger, not mandatory event sourcing of Conversation state.

```text
message.committed
dispatch.committed
mailbox.committed
runtime.accepted
context.applied
turn.observed
agent.acknowledged
agent.acted
agent.replied
human.presented
human.read
```

`transport.publication-accepted` is operational delivery evidence only. A broker
acknowledgement cannot advance product delivery state because it proves neither
mailbox commit nor runtime application.

`turn.observed` and `context.applied` never claim that a model understood the
content. `AgentAcknowledged`, a causally linked domain action, and a reply are
separate evidence. For group messages, evidence is per logical recipient and UI
shows an aggregate projection rather than one shared `delivered` flag.

Candidate delivery outcomes additionally include `acceptance-unknown`,
`application-unknown`, `blocked-by-policy`, `expired`, `superseded`, and
`failed-terminal`. Unknown application cannot trigger blind prompt replay; it
requires runtime reconciliation or controlled recovery.

Edits append an immutable message revision. Before context application, delivery
may advance to the desired revision. After application, a material correction is
a successor contribution with explicit supersession. Revocation prevents future
application but cannot erase data already disclosed to a provider.

## Remaining decisions

- exact Human Notification aggregates, preference precedence, presentation
  channels, acknowledgement, escalation, and retention;
- exact Agent Attention aggregates, orientation profiles, coalescing, budgets,
  expiry, feedback-loop prevention, and reconciliation;
- the producer facts and consumer ACL mappings in the first vertical slice;
- the capability and evidence contract between Agent Attention, Agent Context, and
  Run Orchestration;
- exact downgrade and recovery behavior for unsupported safe-point or wake
  capabilities.

## Acceptance criteria

- Event-storming covers task comments, direct messages, group messages, ordinary
  agent-to-user messages, user alerts, approvals, offline agents, runtime
  replacement, source edits, access revocation, and external mentions.
- The model prevents notification-to-model feedback loops and alert spam.
- Duplicate, stale, reordered, expired, edited, retracted, reassigned, and
  authorization-changed source facts have deterministic outcomes.
- `interrupt`, `next-safe-point`, `after-operation`, and `when-idle` have exact
  capability negotiation, fencing, downgrade, cancellation, and recovery behavior.
- The product can expose separate Messages and Notifications views without a second
  source of truth.
- Notion-like invalidation signals, Discord-like resumable streams, Jira-like
  source changes, and A2A push callbacks pass conformance scenarios without raw
  external content entering a prompt.
- OODA is demonstrated as collaboration among existing owners: Integration and
  source contexts observe, Attention and Agent Context orient, Run and the agent
  decide, AR and tools act, and typed outcomes begin the next observation cycle.
- Shared infrastructure reuse is limited to technical outbox, idempotency,
  connection, serialization, and transport primitives.

## Resolution

Open for tactical decisions. ADR-0068 resolves the strategic context split.
