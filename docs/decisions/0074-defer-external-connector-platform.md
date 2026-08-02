---
id: ADR-0074
type: adr
status: accepted
owner: architecture/domain
summary: Exclude vendor connector management from v1 while preserving a future integration boundary.
approved_by: product-owner
accepted_at: 2026-08-01
related:
  - architecture.extensions
  - OD-015
  - OD-026
  - OD-034
---

# ADR-0074: Defer External Connector Platform

## Context

Future Jira, Notion, Discord, A2A, and similar connectors need durable
installation lifecycle, secret references, webhook verification, source
incarnation, cursors, deduplication, and reconciliation. None of those vendor
integrations is required for the first orchestrator slice. Creating a broad
Integration Management bounded context now would invent aggregates before real
connector event storming, while ignoring the seam would encourage connector
state to leak into Work, Communication, Agent Context, or transport adapters.

## Decision

External vendor connectors and a public plugin SPI are excluded from v1. Do not
create an Integration Management bounded-context dossier or package yet.

Keep a deferred strategic decision, OD-034, for the future boundary. Any future
connector design must preserve these ownership constraints:

- raw credentials live in a secret provider; domain state stores only scoped
  opaque credential references;
- installation identity differs from vendor account identity;
- source incarnation changes when continuity or trust cannot be proven;
- webhook cursor and deduplication scope include installation, source
  incarnation, and source feed;
- disabling or revoking an installation fences queued ingress before later
  semantic admission;
- webhook acknowledgement does not mean a business fact was admitted;
- connectors translate vendor protocols but do not own Work, Conversation,
  notification, attention, or context semantics;
- each semantic owner admits a source observation through its own ACL and
  publishes its own facts.

The legacy desktop task board and the AR Runtime ACL are not vendor connector
platforms. Migration adapters for those existing boundaries may be implemented
without accepting a general connector system.

## Consequences

- v1 remains focused on orchestration and runtime integration.
- Future connector state has a named extraction seam and cannot be donated to an
  unrelated bounded context merely for convenience.
- Exact OAuth flows, webhook signatures, connector rate limits, plugin ABI, and
  installation aggregates remain intentionally undecided until a real first
  connector is selected.

## Rejected alternatives

- Build Jira, Notion, or Discord support in v1.
- Create an empty Integration Management package now.
- Put installation, credentials, cursor, or reconciliation state in Agent
  Context, Work Coordination, Agent Communication, or the eventing platform.
