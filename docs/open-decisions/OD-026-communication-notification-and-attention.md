---
id: OD-026
type: open-decision
status: open
owner: architecture/domain
summary: Define boundaries among conversations, notifications, alerts, subscriptions, attention, and runtime delivery.
related:
  - architecture.context-map
  - architecture.runtime-boundary
  - domain.contexts.agent-communication
  - domain.contexts.work-coordination
  - OD-004
  - OD-006
  - OD-028
---

# OD-026: Communication, Notification, and Attention

## Decision required

Define the exact bounded-context and feature ownership for:

- human-to-agent and agent-to-agent conversations;
- task comments and other source-owned collaboration facts;
- recipient-specific notifications and subscriptions;
- rare user-facing alerts, acknowledgement, suppression, and escalation;
- product delivery timing, wake, safe-point, and interruption intent;
- technical runtime-input application and reconciliation.

The decision must determine whether Notification and Attention Management is one
new bounded context, several focused contexts, or separate features behind an
accepted context boundary. Package count and symmetry are not decision criteria.

## Already fixed constraints

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
  -> Integration Management verification, cursor, and reconciliation
  -> semantic owner and anti-corruption layer
       -> ContextSourceInvalidated -> Agent Context freshness processing
       -> AttentionCandidate -> relevance, subscription, and policy evaluation
  -> AttentionIntent
  -> Run Orchestration wake, checkpoint, or interruption decision
  -> Agent Context delta manifest
  -> Runtime ACL
  -> AR technical context application
```

One source change may produce both `ContextSourceInvalidated` and
`AttentionCandidate`. Suppressing, snoozing, or digesting attention must not leave
an already disclosed context contribution falsely marked as fresh. Conversely, a
source invalidation does not by itself authorize waking or interrupting an agent.

The following subscriptions have separate owners and must not collapse into one
generic subscription table:

- a connector subscription selects upstream Jira, Notion, Discord, A2A, or other
  events and belongs to Integration Management;
- an attention subscription expresses recipient interest, mute, snooze, digest,
  and escalation policy and belongs to the candidate Attention boundary;
- a context binding authorizes a source to contribute to a team, agent, purpose,
  or Run and belongs to Agent Context.

Jira, Notion, Discord, A2A, and similar systems are adapters. Their raw schemas do
not become internal domain events, notification kinds, or Agent Context models.

## Candidate delivery policy

Product intent should not expose an unrestricted priority-by-timing matrix. A
small profile plus explicit constraints is a stronger candidate:

```text
AttentionIntent
  recipientSelector
  profile: fyi | action-required | critical
  deliverBy?
  expiresAt?
  acknowledgementRequirement?
  aggregationPolicy?
  businessPreconditions
```

Policy and Run Orchestration normalize that intent into independent technical
dimensions:

```text
importance and urgency
not-before, deliver-by, and expiry
disruption budget
offline policy: retain | wake-existing | start-if-authorized
application boundary: next-checkpoint | after-operation | safe-point
required evidence
ordering lane
```

The names, exact profiles, and authority matrix remain unresolved. `Critical` does
not automatically grant process-start or interruption authority. `When idle`
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
broker.published
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

## Options

1. Add focused Notification/Attention and Delivery ownership beside Agent
   Communication, connected by integration events and process managers.
2. Keep separate conversation, notification, alert, and delivery features inside a
   broader accepted context after proving one cohesive language and consistency
   boundary.
3. Retain one typed mailbox with segregated lanes. This is acceptable only if it
   proves that unrelated lifecycles, authorization, retention, and acknowledgement
   do not form a god aggregate.

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

Open. When resolved, set `status: resolved` and link the deciding ADR.
