---
id: domain.contexts.index
type: index
status: active
owner: architecture/domain
summary: Index of proposed and accepted bounded-context domain dossiers.
related:
  - architecture.context-map
  - domain.modeling-standard
  - domain.tactical-modeling-patterns
  - OD-011
---

# Bounded Context Dossiers

These dossiers are strategic domain artifacts, not package declarations. A
strategic boundary may be accepted by ADR while its detailed dossier remains
proposed until the Full DDD acceptance gate is satisfied. The status below is
dossier readiness, not boundary existence.

## Identity and scope

| Context | Readiness | Primary gate | Dossier |
|---|---|---|---|
| Identity Registry | Proposed | `OD-011` | [Identity Registry](identity-registry/README.md) |
| Access Control | Proposed | `OD-012` | [Access Control](access-control/README.md) |
| Orchestration Scope | Proposed | `OD-006`, `OD-012`, `OD-019`, `OD-029` | [Orchestration Scope](orchestration-scope/README.md) |
| Workspace Registry | Proposed | `OD-011` | [Workspace Registry](workspace-registry/README.md) |

## Coordination

| Context | Readiness | Primary gate | Dossier |
|---|---|---|---|
| Team Topology | Proposed | `OD-006`, `OD-011` | [Team Topology](team-topology/README.md) |
| Agent Organization | Proposed | `OD-023` | [Agent Organization](agent-organization/README.md) |
| Work Coordination | Proposed | `OD-006`, `OD-015`, `OD-026`, `OD-027` | [Work Coordination](work-coordination/README.md) |
| Run Orchestration | Proposed | `OD-005`, `OD-006`, `OD-013` | [Run Orchestration](run-orchestration/README.md) |
| Agent Communication | Proposed | `OD-006`, `OD-013`, `OD-026` | [Agent Communication](agent-communication/README.md) |
| Human Notification Management | Proposed | `OD-026` | [Human Notification Management](human-notification/README.md) |
| Agent Attention | Proposed | `OD-026`, `OD-028`, `OD-033` | [Agent Attention](agent-attention/README.md) |

## Governance

| Context | Readiness | Primary gate | Dossier |
|---|---|---|---|
| Policy and Risk | Proposed | `OD-011`, `OD-012` | [Policy and Risk](policy-risk/README.md) |
| Approval Management | Proposed | `OD-011` | [Approval Management](approval-management/README.md) |

## Usage

| Context | Readiness | Primary gate | Dossier |
|---|---|---|---|
| Usage Metering | Proposed | `OD-024` | [Usage Metering](usage-metering/README.md) |
| Usage Accounting | Proposed | `OD-024` | [Usage Accounting](usage-accounting/README.md) |
| Consumption Governance | Proposed | `OD-024` | [Consumption Governance](consumption-governance/README.md) |

## Dossier rule

Use the [bounded-context template](../../templates/bounded-context.md) and
[Full DDD modeling standard](../modeling-standard.md), with the
[tactical modeling patterns](../tactical-modeling-patterns.md). Add an artifact only after
discovery produces real language, invariants, scenarios, or ownership evidence.

When a context package is created, this dossier remains its strategic entry point
and links to package and feature documentation. It must not duplicate colocated
implementation details.

CI verifies that every context dossier appears here and that readiness matches its
frontmatter.
