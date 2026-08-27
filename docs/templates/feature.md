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

When the feature contains a durable mutation, `Persistence and concurrency`
links its stable capability and invariant identities and names its ADR-0078
consistency contract. The contract, resolved deployment bindings, and independent
evidence remain feature-owned; the feature document does not copy their fields.
