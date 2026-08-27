---
id: template.bounded-context
type: template
status: active
owner: architecture/domain
summary: Required dossier skeleton for proposing and accepting a bounded context.
---

# Bounded Context Dossier Template

Do not mark a dossier accepted until the Full DDD acceptance gate passes.

```markdown
---
id: domain.contexts.context-name
type: bounded-context
status: proposed
owner: context-name
summary: One sentence defining the model boundary.
---

# Context Name

## Domain vision

## Business outcomes and capabilities

## Scope

### Owns

### Does not own

## Ubiquitous Language

## Invariants and business rules

## Aggregates and consistency boundaries

### Aggregate decision matrix

| Root and identity | Protected invariants | Commands | Domain events | Transaction | Concurrency | Growth bound | External facts | Rejected boundaries |
|---|---|---|---|---|---|---|---|---|

## Tactical building blocks

### Entities and value objects

### Domain services, policies, specifications, and factories

### Domain events versus integration events

## Commands, events, and errors

## Processes and state machines

## Concurrency and conflict model

## Domain verification scenarios

## Context relationships

## Persistence ownership

## Security and authorization

## Open questions

## Implementation links
```
