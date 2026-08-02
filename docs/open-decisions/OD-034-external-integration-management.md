---
id: OD-034
type: open-decision
status: deferred
owner: architecture/domain
summary: Define the future ownership and lifecycle of external connector installations and source continuity.
related:
  - ADR-0074
  - architecture.extensions
  - OD-015
  - OD-026
  - OD-029
  - OD-031
---

# OD-034: External Integration Management

## Decision required

Before the first Jira, Notion, Discord, A2A, or comparable connector, decide
whether installation lifecycle and source continuity form an Integration
Management bounded context or a narrower integration capability.

The decision must assign installation identity, opaque credential references,
source incarnation, webhook verification and deduplication, cursors, disable and
revoke fencing, reconciliation, health evidence, and tenant deletion behavior.

## Constraints

- External connectors and a public plugin SPI are excluded from v1 by ADR-0074.
- Raw credentials remain behind a secret-provider adapter.
- Vendor IDs never become internal Work, Conversation, Agent, or Project IDs.
- Connector acknowledgement never proves semantic admission.
- Work, Communication, Agent Context, Notification, and Attention retain their
  own models and admit external observations through consumer-owned ACLs.
- Loss of source continuity creates a new source incarnation and cannot inherit
  trust, cursor, or deduplication state silently.

## Options

1. A dedicated Integration Management bounded context after event storming the
   first real connector.
2. A focused installation capability inside an accepted identity or project
   boundary if its lifecycle and language prove inseparable there.
3. Adapter-local state, only if no durable cross-connector lifecycle or
   reconciliation invariants emerge.

## Acceptance criteria

- A selected real connector supplies success, rotation, revocation, compromise,
  deletion, webhook loss, duplicate, reordering, and reconciliation scenarios.
- Installation, source incarnation, credential reference, cursor, and semantic
  fact ownership are unambiguous.
- Tenant isolation, secret handling, retention, replay, and disable fencing have
  executable conformance cases.
- The decision does not create a universal webhook hub or let adapters own
  product semantics.

## Resolution

Deferred until a concrete external connector enters product scope. No package or
public plugin contract may be materialized implicitly before this decision is
resolved.
