---
id: template.feature
type: template
status: active
owner: architecture
summary: Governed skeleton for implementation documentation colocated with a feature slice.
---

# Feature Documentation Template

Use this for `src/features/<feature>/README.md`. Keep strategic language and
cross-context ownership in the bounded-context dossier.

```markdown
---
id: feature.context-name.feature-name
type: feature
status: proposed
owner: context-name/feature-name
summary: One sentence describing the owned capability and implementation boundary.
related:
  - domain.contexts.context-name
---

# Feature Name

## Scope

## Public surface

## Owned behavior and invariants

## Application use cases and ports

## Adapters and composition

## Contracts and events

## Persistence and concurrency

## Failure and recovery

## Verification
```

An accepted feature document must contain at least `Scope`, `Public surface`, and
`Verification`. Add the other sections only when they describe real behavior;
link to canonical context or architecture sources instead of copying them.
