---
id: template.adr
type: template
status: active
owner: architecture
summary: Required skeleton for a new Architecture Decision Record.
---

# ADR Template

Copy the body below to the next permanent numeric ADR filename.

```markdown
---
id: ADR-NNNN
type: adr
status: proposed
owner: owning/area
summary: One sentence describing the decision.
related:
  - OD-NNN
---

# ADR-NNNN: Decision Title

## Context

What forces a durable architectural choice?

## Decision

What is decided, including ownership and invariants?

## Consequences

- Positive and negative consequences.

## Rejected alternatives

- Alternative and why it was rejected.
```

Keep `status: proposed` while the decision is under discussion. After explicit
product-owner confirmation, change the status and add:

```yaml
status: accepted
approved_by: product-owner
accepted_at: YYYY-MM-DD
```

Do not add approval metadata to a proposed ADR.
