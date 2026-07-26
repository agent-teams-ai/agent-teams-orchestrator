---
id: template.contract
type: template
status: active
owner: architecture/contracts
summary: Required documentation skeleton for a versioned public or integration contract.
---

# Contract Documentation Template

The machine-readable schema remains authoritative for exact wire shape.

```markdown
---
id: contract.owner.contract-name.v1
type: contract
status: proposed
owner: owning/context
summary: One sentence describing the contract purpose and consumers.
related:
  - ADR-NNNN
---

# Contract Name v1

## Owner and consumers

## Semantic purpose

## Machine-readable source

## Identity and scope

## Compatibility and versioning

## Delivery, ordering, and replay

## Idempotency

## Errors and retryability

## Security and redaction

## Conformance fixtures

## Deprecation plan
```
