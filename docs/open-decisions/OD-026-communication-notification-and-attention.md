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

## Candidate interaction model

```text
Source fact
  -> recipient relevance and subscription evaluation
  -> Notification or Alert state
  -> DeliveryIntent
  -> Run Orchestration wake/interruption decision
  -> Runtime ACL
  -> AR technical input application
```

Candidate delivery policy has independent axes rather than one priority enum:

```text
attention: passive | active | time-sensitive | critical
timing: queued | next-safe-point | after-operation | when-idle | interrupt
durability: durable | standard | best-effort
ordering lane: operator-control | conversation | work-attention | automation
```

Names and exact combinations remain unresolved. In particular, `when-idle` cannot
be inferred from prompt text, silence, or a UI status. It requires an authoritative
runtime observation and a matching runtime generation.

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
  agent-to-user messages, user alerts, approvals, offline agents, and runtime
  replacement.
- The model prevents notification-to-model feedback loops and alert spam.
- Duplicate, stale, reordered, expired, edited, retracted, reassigned, and
  authorization-changed source facts have deterministic outcomes.
- `interrupt`, `next-safe-point`, `after-operation`, and `when-idle` have exact
  capability negotiation, fencing, downgrade, cancellation, and recovery behavior.
- The product can expose separate Messages and Notifications views without a second
  source of truth.
- Shared infrastructure reuse is limited to technical outbox, idempotency,
  connection, serialization, and transport primitives.

## Resolution

Open. When resolved, set `status: resolved` and link the deciding ADR.
